using System.Collections.Concurrent;
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
        private readonly int _bufferSize = 4096;
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
                    ) // Set mono channel
                    .ProcessAsynchronously();

                var samples = await ReadWavFileAsync(tempWavPath);

                // Calculate maximum segment duration based on maxTokensPerSegment
                double maxSegmentDuration =
                    (maxTokensPerSegment * 4) / (double)AVERAGE_CHARS_PER_SECOND;
                var segmentBoundaries = await Task.Run(
                    () => FindSegmentBoundariesParallel(samples, maxSegmentDuration)
                );

                var result = CreateSegmentsParallel(samples, segmentBoundaries);

                _logger.LogInformation("Result: ", result);

                return await result;
            }
            finally
            {
                if (File.Exists(tempInputPath))
                    File.Delete(tempInputPath);
                if (File.Exists(tempWavPath))
                    File.Delete(tempWavPath);
            }
        }

        private async Task<float[]> ReadWavFileAsync(string wavPath)
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

            return samples.ToArray();
        }

        private List<(TimeSpan Start, TimeSpan End)> FindSegmentBoundariesParallel(
            float[] samples,
            double maxSegmentDuration
        )
        {
            var boundaries = new ConcurrentBag<(TimeSpan Start, TimeSpan End)>();
            var chunkSize = samples.Length / Environment.ProcessorCount;

            Parallel.ForEach(
                Partitioner.Create(0, samples.Length, chunkSize),
                _parallelOptions,
                range =>
                {
                    var start = range.Item1;
                    var end = range.Item2;
                    var currentSegmentStart = TimeSpan.FromSeconds((double)start / _sampleRate);
                    var lastBoundaryTime = currentSegmentStart;

                    for (int i = start; i < end; i++)
                    {
                        var currentTime = TimeSpan.FromSeconds((double)i / _sampleRate);

                        // Force split if maximum segment duration is exceeded
                        if ((currentTime - lastBoundaryTime).TotalSeconds >= maxSegmentDuration)
                        {
                            boundaries.Add((lastBoundaryTime, currentTime));
                            lastBoundaryTime = currentTime;
                            continue;
                        }

                        if (Math.Abs(samples[i]) < _silenceThreshold)
                        {
                            var silenceDuration = 0;
                            while (i < end && Math.Abs(samples[i]) < _silenceThreshold)
                            {
                                silenceDuration++;
                                i++;
                            }

                            if (silenceDuration >= (_sampleRate * _minSilenceDuration / 1000))
                            {
                                var silenceEndTime = TimeSpan.FromSeconds((double)i / _sampleRate);
                                boundaries.Add((lastBoundaryTime, silenceEndTime));
                                lastBoundaryTime = silenceEndTime;
                            }
                        }
                    }

                    // Add final segment if needed
                    var finalTime = TimeSpan.FromSeconds((double)end / _sampleRate);
                    if (lastBoundaryTime < finalTime)
                    {
                        boundaries.Add((lastBoundaryTime, finalTime));
                    }
                }
            );

            return boundaries.OrderBy(x => x.Start).ToList();
        }

        private async Task<IEnumerable<AudioSegment>> CreateSegmentsParallel(
            float[] samples,
            List<(TimeSpan Start, TimeSpan End)> boundaries
        )
        {
            var segments = new ConcurrentBag<AudioSegment>();

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
                            return samples.AsSpan(startIndex, endIndex - startIndex).ToArray();
                        },
                        ct
                    );

                    var segment = new AudioSegment
                    {
                        StartTime = boundary.Start,
                        EndTime = boundary.End,
                        AudioData = segmentSamples,
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
    }
}
