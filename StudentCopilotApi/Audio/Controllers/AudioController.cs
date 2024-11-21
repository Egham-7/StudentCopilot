using Microsoft.AspNetCore.Mvc;
using StudentCopilotApi.Audio.Interfaces;
using StudentCopilotApi.Audio.Models;

namespace StudentCopilotApi.Audio.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AudioController : ControllerBase
    {
        private readonly IAudioSegmentationService _audioSegmentationService;
        private readonly ILogger<AudioController> _logger;
        private readonly string[] _allowedFileExtensions = new[] { ".wav", ".mp3", ".aac", ".m4a" };

        private const int AUDIO_FILE_LIMIT = 100 * 1024 * 1024;
        private const int DEFAULT_MAX_TOKENS_SEGMENT = 16384;

        public AudioController(
            IAudioSegmentationService audioSegmentationService,
            ILogger<AudioController> logger
        )
        {
            _audioSegmentationService = audioSegmentationService;
            _logger = logger;
        }

        [HttpPost("segment")]
        [ProducesResponseType(typeof(IEnumerable<AudioSegment>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [RequestSizeLimit(AUDIO_FILE_LIMIT)] // 100MB limit
        public async Task<IActionResult> SegmentAudio(
            [FromForm] IFormFile audioFile,
            [FromQuery] int maxTokensPerSegment = DEFAULT_MAX_TOKENS_SEGMENT
        )
        {
            if (audioFile == null || audioFile.Length == 0)
            {
                return BadRequest("No audio file provided");
            }

            var fileExtension = Path.GetExtension(audioFile.FileName).ToLowerInvariant();

            if (!_allowedFileExtensions.Contains(fileExtension))
            {
                return BadRequest(
                    "Unsupported audio format. Supported formats: WAV, MP3, AAC, M4A"
                );
            }

            try
            {
                var segments = await _audioSegmentationService.SegmentAudioAsync(
                    audioFile,
                    maxTokensPerSegment
                );

                return Ok(segments);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing audio file: {FileName}", audioFile.FileName);
                return BadRequest("Error processing audio file");
            }
        }
    }
}
