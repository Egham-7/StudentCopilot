using Audio.Interfaces;
using Audio.Models;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
public class AudioSegmentationController : ControllerBase
{
    private readonly IAudioSegmentationService _audioSegmentationService;
    private readonly ILogger<AudioSegmentationController> _logger;

    public AudioSegmentationController(
        IAudioSegmentationService audioSegmentationService,
        ILogger<AudioSegmentationController> logger
    )
    {
        _audioSegmentationService = audioSegmentationService;
        _logger = logger;
    }

    [HttpPost("segment")]
    [ProducesResponseType(typeof(IEnumerable<AudioSegment>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [RequestSizeLimit(100 * 1024 * 1024)] // 100MB limit
    public async Task<IActionResult> SegmentAudio(
        [FromForm] IFormFile audioFile,
        [FromQuery] int maxTokensPerSegment = 1000
    )
    {
        if (audioFile == null || audioFile.Length == 0)
        {
            return BadRequest("No audio file provided");
        }

        var allowedExtensions = new[] { ".wav", ".mp3", ".aac", ".m4a" };
        var fileExtension = Path.GetExtension(audioFile.FileName).ToLowerInvariant();

        if (!allowedExtensions.Contains(fileExtension))
        {
            return BadRequest("Unsupported audio format. Supported formats: WAV, MP3, AAC, M4A");
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
