using Microsoft.AspNetCore.Mvc;
using StudentCopilotApi.youtube.Services;
using Microsoft.AspNetCore.Authorization;

namespace StudentCopilotApi.youtube.Controllers
{
  [ApiController]
  [Route("api/youtube/[controller]")]
  [Authorize]
  public class TranscriptController : ControllerBase
  {
    private readonly YoutubeTranscriptService _transcriptService;

    public TranscriptController(YoutubeTranscriptService transcriptService)
    {
      _transcriptService = transcriptService;
    }

    [HttpGet("{videoId}")]
    public async Task<ActionResult<String>> GetTranscript(string videoId)
    {

      try
      {
        var transcript = await _transcriptService.GetTranscriptAsync(videoId);
        return Ok(transcript);
      }
      catch (Exception ex)
      {
        return BadRequest(new { error = ex.Message });
      }
    }
  }
}

