using System.Collections.Concurrent;
using System.Text;
using FFMpegCore;
using StudentCopilotApi.Audio.Interfaces;
using StudentCopilotApi.Audio.Models;

namespace StudentCopilotApi.Audio.Services
{
    public class AudioSegmentationService : IAudioSegmentationService
    {
        private readonly int _sampleRate = 16000;
        private readonly float _silenceThreshold = 0.01f;
        private readonly int _minSilenceDuration = 500;
        private const int MAX_SEGMENT_SIZE_BYTES = 4 * 1024 * 1024;
        private readonly ILogger<AudioSegmentationService> _logger;
        private readonly ParallelOptions _parallelOptions = new()
        {
            MaxDegreeOfParallelism = Environment.ProcessorCount,
        };

        private const int AVERAGE_CHARS_PER_SECOND = 15; // Approximate characters spoken per second


        public AudioSegmentationService(ILogger<AudioSegmentationService> logger)
        {
            _logger = logger;
        }

        public async Task<IEnumerable<AudioSegment>> SegmentAudioAsync(
            IFormFile file,
            int maxTokensPerSegment
        )
        {
            string tempInputPath = Path.GetTempFileName();
            string tempWavPath = Path.GetTempFileName() + ".wav";

            try
            {
                // Save the uploaded file
                using (var stream = File.Create(tempInputPath))
                {
                    await file.CopyToAsync(stream);
                }

                // Convert to WAV using FFmpeg

                // Update the FFmpeg conversion parameters
                await FFMpegArguments
                    .FromFileInput(tempInputPath)
                    .OutputToFile(
                        tempWavPath,
                        true,
                        options =>
                            options
                                .WithAudioSamplingRate(_sampleRate)
                                .WithAudioCodec("pcm_s16le")
                                .WithCustomArgument("-ac 1")
                                .WithCustomArgument("-f wav") // Explicitly specify WAV format
                                .WithCustomArgument("-bits_per_raw_sample 16")
                    )
                    .ProcessAsynchronously();

                var samples = await ReadWavFileAsync(tempWavPath);

                // Calculate maximum segment duration based on maxTokensPerSegment
                double maxSegmentDuration =
                    (maxTokensPerSegment * 4) / (double)AVERAGE_CHARS_PER_SECOND;
                var segmentBoundaries = await Task.Run(
                    () => FindSegmentBoundariesParallel(samples, maxSegmentDuration)
                );

                var segments = await CreateSegmentsParallel(samples, segmentBoundaries);

                _logger.LogInformation($"Created {segments.Count()} segments");
                foreach (var segment in segments)
                {
                    _logger.LogInformation(
                        $"Segment: Start={segment.StartTime}, End={segment.EndTime}, Data Length={segment.AudioData.Length}"
                    );
                }

                return segments.OrderBy(segment => segment.StartTime.TotalMilliseconds);
            }
            finally
            {
                if (File.Exists(tempInputPath))
                    File.Delete(tempInputPath);
                if (File.Exists(tempWavPath))
                    File.Delete(tempWavPath);
            }
        }

        private async Task<List<float>> ReadWavFileAsync(string wavPath)
        {
            var samples = new List<float>();

            await using var fileStream = new FileStream(
                wavPath,
                FileMode.Open,
                FileAccess.Read,
                FileShare.Read,
                bufferSize: 4096,
                useAsync: true
            );
            using var reader = new BinaryReader(fileStream);

            // Skip WAV header (44 bytes)
            reader.BaseStream.Position = 44;

            // Read samples in chunks for better performance
            const int chunkSize = 4096;
            byte[] buffer = new byte[chunkSize];
            int bytesRead;

            while ((bytesRead = await fileStream.ReadAsync(buffer)) > 0)
            {
                for (int i = 0; i < bytesRead; i += 2)
                {
                    if (i + 1 >= bytesRead)
                        break;

                    short sample = BitConverter.ToInt16(buffer, i);
                    samples.Add(sample / 32768f);
                }
            }

            return samples;
        }


        private List<(TimeSpan Start, TimeSpan End)> FindSegmentBoundariesParallel(
    List<float> samples,
    double maxSegmentDuration)
        {
            var boundaries = new ConcurrentBag<(TimeSpan Start, TimeSpan End)>();
            var minSegmentSamples = (int)(_sampleRate * 2); // Minimum 2 seconds per segment

            // Calculate max samples based on 5MB limit
            // WAV format: 16-bit samples = 2 bytes per sample
            // Including WAV header (44 bytes)
            var maxSamplesFor5MB = (MAX_SEGMENT_SIZE_BYTES - 44) / 2;

            // Use the smaller of duration-based or size-based limits
            var maxSegmentSamples = Math.Min(
                (int)(_sampleRate * maxSegmentDuration),
                maxSamplesFor5MB
            );

            var currentStart = 0;
            var sampleCount = samples.Count;

            while (currentStart < sampleCount)
            {
                var potentialEnd = Math.Min(currentStart + maxSegmentSamples, sampleCount);
                var bestSplitPoint = potentialEnd;

                // Look for silence in the last second of the potential segment
                var searchStart = Math.Max(
                    currentStart + minSegmentSamples,
                    potentialEnd - _sampleRate
                );

                for (int i = searchStart; i < potentialEnd; i++)
                {
                    if (Math.Abs(samples[i]) < _silenceThreshold)
                    {
                        var silenceDuration = 0;
                        var j = i;
                        while (j < potentialEnd && Math.Abs(samples[j]) < _silenceThreshold)
                        {
                            silenceDuration++;
                            j++;
                        }
                        if (silenceDuration >= (_sampleRate * _minSilenceDuration / 1000))
                        {
                            bestSplitPoint = j;
                            break;
                        }
                    }
                }

                var startTime = TimeSpan.FromSeconds((double)currentStart / _sampleRate);
                var endTime = TimeSpan.FromSeconds((double)bestSplitPoint / _sampleRate);

                boundaries.Add((startTime, endTime));
                currentStart = bestSplitPoint;
            }

            return boundaries.OrderBy(x => x.Start).ToList();
        }


        private async Task<IEnumerable<AudioSegment>> CreateSegmentsParallel(
            List<float> samples,
            List<(TimeSpan Start, TimeSpan End)> boundaries
        )
        {
            var segments = new ConcurrentBag<AudioSegment>();

            var samplesArray = samples.ToArray();

            await Parallel.ForEachAsync(
                boundaries,
                _parallelOptions,
                async (boundary, ct) =>
                {
                    var startIndex = (int)(boundary.Start.TotalSeconds * _sampleRate);
                    var endIndex = (int)(boundary.End.TotalSeconds * _sampleRate);

                    var segmentSamples = await Task.Run(
                        () =>
                        {
                            return samplesArray.AsSpan(startIndex, endIndex - startIndex).ToArray();
                        },
                        ct
                    );

                    string wavBytes = ConvertToWavBytes(segmentSamples);

                    var segment = new AudioSegment
                    {
                        StartTime = boundary.Start,
                        EndTime = boundary.End,
                        AudioData = wavBytes,
                    };
                    segments.Add(segment);
                }
            );

            return segments.OrderBy(x => x.StartTime);
        }

        public int EstimateTokenCount(string text)
        {
            return text.Length / 4;
        }

        private string ConvertToWavBytes(float[] samples)
        {
            using var memoryStream = new MemoryStream();
            using var writer = new BinaryWriter(memoryStream);

            // WAV header
            writer.Write(Encoding.ASCII.GetBytes("RIFF")); // ChunkID
            writer.Write(0); // ChunkSize - will be filled later
            writer.Write(Encoding.ASCII.GetBytes("WAVE")); // Format

            // Format chunk
            writer.Write(Encoding.ASCII.GetBytes("fmt ")); // Subchunk1ID
            writer.Write(16); // Subchunk1Size (16 for PCM)
            writer.Write((short)1); // AudioFormat (1 for PCM)
            writer.Write((short)1); // NumChannels (1 for mono)
            writer.Write(_sampleRate); // SampleRate
            writer.Write(_sampleRate * 2); // ByteRate
            writer.Write((short)2); // BlockAlign
            writer.Write((short)16); // BitsPerSample

            // Data chunk
            writer.Write(Encoding.ASCII.GetBytes("data")); // Subchunk2ID
            writer.Write(samples.Length * 2); // Subchunk2Size

            // Convert and write samples
            foreach (float sample in samples)
            {
                short value = (short)(sample * 32767f);
                writer.Write(value);
            }

            // Update ChunkSize
            var fileLength = (int)memoryStream.Length;
            memoryStream.Position = 4;
            writer.Write(fileLength - 8);

            var wavBytes = memoryStream.ToArray();

            return Convert.ToBase64String(wavBytes);
        }
    }
}
