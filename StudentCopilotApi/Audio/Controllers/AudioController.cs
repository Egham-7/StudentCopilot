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
        public async Task<IActionResult> SegmentAudio([FromForm] AudioSegmentationRequest request)
        {
            try
            {
                var segments = await _audioSegmentationService.SegmentAudioAsync(
                    request.AudioFile,
                    request.MaxTokensPerSegment
                );
                return Ok(segments);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error processing audio file: {FileName}",
                    request.AudioFile.FileName
                );
                return BadRequest("Error processing audio file");
            }
        }
    }
}
