using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StudentCopilotApi.Audio.Interfaces;

namespace StudentCopilotApi.Audio.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class AudioController : ControllerBase
    {
        private readonly IAudioSegmentationService _audioSegmentationService;
        private readonly IVideoToAudioService _videoToAudioService;
        private readonly ILogger<AudioController> _logger;

        public AudioController(
            IAudioSegmentationService audioSegmentationService,
            IVideoToAudioService videoToAudioService,
            ILogger<AudioController> logger
        )
        {
            _audioSegmentationService = audioSegmentationService;
            _videoToAudioService = videoToAudioService;
            _logger = logger;
        }

        [HttpPost("segment")]
        public async Task<IActionResult> SegmentMedia(
            IFormFile file,
            [FromQuery] int maxTokensPerSegment
        )
        {
            _logger.LogInformation(
                "Starting media segmentation for file: {FileName} with max tokens: {MaxTokens}",
                file.FileName,
                maxTokensPerSegment
            );

            string? audioPath = null;
            try
            {
                if (IsVideoFile(file.FileName))
                {
                    _logger.LogInformation("Processing video file: {FileName}", file.FileName);
                    audioPath = await _videoToAudioService.ConvertVideoToAudioAsync(file);

                    using var audioStream = System.IO.File.OpenRead(audioPath);
                    var audioFile = new FormFile(
                        audioStream,
                        0,
                        audioStream.Length,
                        "audio",
                        Path.GetFileName(audioPath)
                    );

                    _logger.LogInformation(
                        "Video converted to audio successfully. Processing audio segmentation"
                    );
                    var result = await _audioSegmentationService.SegmentAudioAsync(
                        audioFile,
                        maxTokensPerSegment
                    );
                    _logger.LogInformation("Audio segmentation completed successfully");
                    return Ok(result);
                }

                _logger.LogInformation("Processing audio file directly: {FileName}", file.FileName);
                var audioResult = await _audioSegmentationService.SegmentAudioAsync(
                    file,
                    maxTokensPerSegment
                );
                _logger.LogInformation("Audio segmentation completed successfully");
                return Ok(audioResult);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing media file: {FileName}", file.FileName);
                throw;
            }
            finally
            {
                if (audioPath != null && System.IO.File.Exists(audioPath))
                {
                    try
                    {
                        System.IO.File.Delete(audioPath);
                        _logger.LogInformation(
                            "Temporary audio file deleted: {AudioPath}",
                            audioPath
                        );
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(
                            ex,
                            "Failed to delete temporary audio file: {AudioPath}",
                            audioPath
                        );
                    }
                }
            }
        }

        private bool IsVideoFile(string fileName)
        {
            var videoExtensions = new[] { ".mp4", ".avi", ".mkv", ".mov", ".wmv" };
            var isVideo = videoExtensions.Contains(Path.GetExtension(fileName).ToLower());
            _logger.LogDebug(
                "File {FileName} is{NotVideo} a video file",
                fileName,
                isVideo ? "" : " not"
            );
            return isVideo;
        }
    }
}
