using Microsoft.AspNetCore.Mvc;
using StudentCopilotApi.youtube.Models;
using StudentCopilotApi.youtube.Services;

namespace StudentCopilotApi.youtube.Controllers
{

  [ApiController]
  [Route("api/youtube/[controller]")]
  public class TranscriptController : ControllerBase
  {
    private readonly YouTubeTranscriptService _transcriptService;

    public TranscriptController(YouTubeTranscriptService transcriptService)
    {
      _transcriptService = transcriptService;
    }

    [HttpGet("{videoId}")]
    public async Task<ActionResult<TranscriptResponse>> GetTranscript(string videoId, string userId)
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
