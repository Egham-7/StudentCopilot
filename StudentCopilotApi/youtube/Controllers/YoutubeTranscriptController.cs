using Microsoft.AspNetCore.Mvc;
using StudentCopilotApi.youtube.Models;
using StudentCopilotApi.youtube.Services;
using Microsoft.AspNetCore.Authorization;

namespace StudentCopilotApi.youtube.Controllers
{
  [ApiController]
  [Route("api/youtube/[controller]")]
  [Authorize]
  public class TranscriptController : ControllerBase
  {
    private readonly YouTubeTranscriptService _transcriptService;

    public TranscriptController(YouTubeTranscriptService transcriptService)
    {
      _transcriptService = transcriptService;
    }

    [HttpGet("{videoId}")]
    public async Task<ActionResult<TranscriptResponse>> GetTranscript(string videoId, [FromQuery] string userId)
    {
      try
      {
        var transcript = await _transcriptService.GetTranscriptAsync(videoId, userId);
        return Ok(transcript);
      }
      catch (Exception ex)
      {
        return BadRequest(new { error = ex.Message });
      }
    }
  }
}

