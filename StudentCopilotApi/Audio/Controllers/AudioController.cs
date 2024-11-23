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
        [RequestSizeLimit(200_000_000)] // 100MB in bytes
        [RequestFormLimits(MultipartBodyLengthLimit = 200_000_000)]
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

            try
            {

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

        }


        [HttpPost("convert")]
        [RequestSizeLimit(200_000_000)] // 200MB in bytes
        [RequestFormLimits(MultipartBodyLengthLimit = 200_000_000)]
        public async Task<IActionResult> ConvertVideoToAudio(IFormFile file)
        {
            try
            {
                _logger.LogInformation("Starting video to audio conversion for file: {FileName}", file.FileName);


                var audioPath = await _videoToAudioService.ConvertVideoToAudioAsync(file);

                if (System.IO.File.Exists(audioPath))
                {
                    var audioBytes = await System.IO.File.ReadAllBytesAsync(audioPath);

                    try
                    {
                        System.IO.File.Delete(audioPath);
                        _logger.LogInformation("Temporary audio file deleted: {AudioPath}", audioPath);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to delete temporary audio file: {AudioPath}", audioPath);
                    }

                    _logger.LogInformation("Video conversion completed successfully");
                    return File(audioBytes, "audio/mp3", Path.GetFileNameWithoutExtension(file.FileName) + ".mp3");
                }

                return BadRequest("Failed to convert video to audio");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error converting video to audio: {FileName}", file.FileName);
                throw;
            }
        }

    }
}
