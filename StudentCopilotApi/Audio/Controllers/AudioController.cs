using Microsoft.AspNetCore.Mvc;
using StudentCopilotApi.Audio.Interfaces;

namespace StudentCopilotApi.Audio.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class AudioController : ControllerBase
    {
        private readonly IAudioSegmentationService _audioSegmentationService;
        private readonly IVideoToAudioService _videoToAudioService;

        public AudioController(
            IAudioSegmentationService audioSegmentationService,
            IVideoToAudioService videoToAudioService
        )
        {
            _audioSegmentationService = audioSegmentationService;
            _videoToAudioService = videoToAudioService;
        }

        [HttpPost("segment")]
        public async Task<IActionResult> SegmentMedia(IFormFile file, int maxTokensPerSegment)
        {
            string? audioPath = null;
            try
            {
                // Check if the file is a video
                if (IsVideoFile(file.FileName))
                {
                    audioPath = await _videoToAudioService.ConvertVideoToAudioAsync(file);
                    // Create new FormFile from the audio file
                    using var audioStream = System.IO.File.OpenRead(audioPath);
                    var audioFile = new FormFile(
                        audioStream,
                        0,
                        audioStream.Length,
                        "audio",
                        Path.GetFileName(audioPath)
                    );
                    return Ok(
                        await _audioSegmentationService.SegmentAudioAsync(
                            audioFile,
                            maxTokensPerSegment
                        )
                    );
                }

                // Process audio file directly
                return Ok(
                    await _audioSegmentationService.SegmentAudioAsync(file, maxTokensPerSegment)
                );
            }
            finally
            {
                if (audioPath != null && System.IO.File.Exists(audioPath))
                {
                    System.IO.File.Delete(audioPath);
                }
            }
        }

        private bool IsVideoFile(string fileName)
        {
            var videoExtensions = new[] { ".mp4", ".avi", ".mkv", ".mov", ".wmv" };
            return videoExtensions.Contains(Path.GetExtension(fileName).ToLower());
        }
    }
}
