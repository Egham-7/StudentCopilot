using StudentCopilotApi.Audio.Interfaces;
using Xabe.FFmpeg;

namespace StudentCopilotApi.Audio.Services
{
    public class VideoToAudioService : IVideoToAudioService
    {
        private readonly string _ffmpegPath;

        public VideoToAudioService(string ffmpegPath)
        {
            _ffmpegPath = ffmpegPath;
            FFmpeg.SetExecutablesPath(_ffmpegPath);
        }

        public async Task<string> ConvertVideoToAudioAsync(IFormFile videoFile)
        {
            var tempVideoPath = Path.GetTempFileName() + Path.GetExtension(videoFile.FileName);
            var tempAudioPath = Path.GetTempFileName() + ".wav";

            try
            {
                using (var stream = File.Create(tempVideoPath))
                {
                    await videoFile.CopyToAsync(stream);
                }

                var conversion = await FFmpeg.Conversions.FromSnippet.ExtractAudio(
                    tempVideoPath,
                    tempAudioPath
                );
                await conversion.AddParameter($"-ar 16000 -ab 128k").Start();

                return tempAudioPath;
            }
            catch
            {
                if (File.Exists(tempVideoPath))
                    File.Delete(tempVideoPath);
                if (File.Exists(tempAudioPath))
                    File.Delete(tempAudioPath);
                throw;
            }
        }
    }
}
