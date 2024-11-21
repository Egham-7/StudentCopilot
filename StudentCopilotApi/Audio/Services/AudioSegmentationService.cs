using System.Collections.Concurrent;
using NAudio.Wave;
using NAudio.Wave.SampleProviders;
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
        private readonly ParallelOptions _parallelOptions = new()
        {
            MaxDegreeOfParallelism = Environment.ProcessorCount,
        };

        public async Task<IEnumerable<AudioSegment>> SegmentAudioAsync(
            IFormFile file,
            int maxTokensPerSegment
        )
        {
            // Create temporary file path
            string tempFilePath = Path.GetTempFileName();

            try
            {
                // Save the uploaded file to temp location
                using (var stream = File.Create(tempFilePath))
                {
                    await file.CopyToAsync(stream);
                }

                // Process the audio file
                using var reader = new AudioFileReader(tempFilePath);
                var samples = await ProcessAudioStreamAsync(reader);
                var segmentBoundaries = await Task.Run(
                    () => FindSegmentBoundariesParallel(samples)
                );
                return await CreateSegmentsParallel(samples, segmentBoundaries);
            }
            finally
            {
                // Clean up temporary file
                if (File.Exists(tempFilePath))
                {
                    File.Delete(tempFilePath);
                }
            }
        }

        private WaveStream CreateAudioReader(IFormFile file)
        {
            try
            {
                return new AudioFileReader(file.Name);
            }
            catch (Exception)
            {
                throw new NotSupportedException(
                    "Unsupported audio format. Supported formats: WAV, MP3, AAC, M4A"
                );
            }
        }

        private async Task<List<float>> ProcessAudioStreamAsync(WaveStream waveProvider)
        {
            var samples = new ConcurrentBag<float>();
            var buffer = new float[_bufferSize];

            var resampler = new WdlResamplingSampleProvider(
                new WaveToSampleProvider(waveProvider),
                _sampleRate
            );
            var monoProvider = resampler.ToMono();

            var tasks = new List<Task>();
            int samplesRead;

            while (
                (samplesRead = await Task.Run(() => monoProvider.Read(buffer, 0, buffer.Length)))
                > 0
            )
            {
                var localBuffer = buffer.Take(samplesRead).ToArray();
                tasks.Add(
                    Task.Run(() =>
                    {
                        foreach (var sample in localBuffer)
                        {
                            samples.Add(sample);
                        }
                    })
                );
            }

            await Task.WhenAll(tasks);
            return samples.OrderBy(x => samples.ToList().IndexOf(x)).ToList();
        }

        private List<(TimeSpan Start, TimeSpan End)> FindSegmentBoundariesParallel(
            List<float> samples
        )
        {
            var boundaries = new ConcurrentBag<(TimeSpan Start, TimeSpan End)>();
            var chunkSize = samples.Count / Environment.ProcessorCount;

            Parallel.ForEach(
                Partitioner.Create(0, samples.Count, chunkSize),
                _parallelOptions,
                range =>
                {
                    var start = range.Item1;
                    var end = range.Item2;
                    var currentSegmentStart = TimeSpan.FromSeconds((double)start / _sampleRate);

                    for (int i = start; i < end; i++)
                    {
                        var currentTime = TimeSpan.FromSeconds((double)i / _sampleRate);
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
                                boundaries.Add((currentSegmentStart, currentTime));
                                currentSegmentStart = currentTime;
                            }
                        }
                    }
                }
            );

            return boundaries.OrderBy(x => x.Start).ToList();
        }

        private async Task<IEnumerable<AudioSegment>> CreateSegmentsParallel(
            List<float> samples,
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
                    var segmentSamples = samples
                        .Skip(startIndex)
                        .Take(endIndex - startIndex)
                        .ToList();

                    var segment = new AudioSegment
                    {
                        StartTime = boundary.Start,
                        EndTime = boundary.End,
                        AudioData = await Task.Run(() => ConvertToByteArray(segmentSamples), ct),
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

        private byte[] ConvertToByteArray(List<float> samples)
        {
            using var memoryStream = new MemoryStream();
            using var writer = new BinaryWriter(memoryStream);

            foreach (var sample in samples)
            {
                writer.Write(sample);
            }

            return memoryStream.ToArray();
        }
    }
}
