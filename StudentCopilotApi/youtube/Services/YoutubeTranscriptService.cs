using System.Text;
using HtmlAgilityPack;
using StudentCopilotApi.youtube.Exceptions;
using StudentCopilotApi.youtube.Models;


namespace StudentCopilotApi.youtube.Services
{
  public class YoutubeTranscriptService
  {
    private readonly HttpClient _httpClient;
    private readonly ILogger<YoutubeTranscriptService> _logger;
    private const string TRANSCRIPT_BASE_URL = "https://youtubetranscript.com";
    private const string VALIDATION_BASE_URL = "https://video.google.com/timedtext";

    public YoutubeTranscriptService(HttpClient httpClient, ILogger<YoutubeTranscriptService> logger)
    {
      _httpClient = httpClient;
      _logger = logger;
    }

    public async Task<string> GetTranscriptAsync(string videoId, CancellationToken cancellationToken = default)
    {
      if (string.IsNullOrWhiteSpace(videoId))
      {
        throw new ArgumentException("Video ID cannot be empty", nameof(videoId));
      }

      var url = BuildTranscriptUrl(videoId);
      _logger.LogInformation("Fetching transcript for video ID: {VideoId}", videoId);

      var response = await _httpClient.GetStringAsync(url, cancellationToken);
      var doc = new HtmlDocument();
      doc.LoadHtml(response);

      var errorNode = doc.DocumentNode.SelectSingleNode("//error");
      if (errorNode != null)
      {
        var errorMessage = errorNode.InnerText;
        _logger.LogError("Error fetching transcript: {ErrorMessage}", errorMessage);
        throw new TranscriptException(errorMessage);
      }

      var transcriptBuilder = new StringBuilder();
      var transcriptNodes = doc.DocumentNode.SelectNodes("//transcript//text");

      if (transcriptNodes == null || !transcriptNodes.Any())
      {
        throw new TranscriptException("No transcript segments found");
      }

      foreach (var node in transcriptNodes)
      {
        var segment = new TranscriptSegment
        {
          Text = node.InnerText.Trim(),
          Start = double.Parse(node.GetAttributeValue("start", "0")),
          Duration = double.Parse(node.GetAttributeValue("dur", "0"))
        };

        transcriptBuilder.AppendLine(segment.Text);
      }

      return transcriptBuilder.ToString().Trim();
    }

    public async Task<bool> ValidateVideoIdAsync(string videoId, CancellationToken cancellationToken = default)
    {
      if (string.IsNullOrWhiteSpace(videoId))
      {
        return false;
      }

      var url = BuildValidationUrl(videoId);

      try
      {
        using var response = await _httpClient.GetAsync(url, cancellationToken);
        return response.IsSuccessStatusCode;
      }
      catch (Exception ex)
      {
        _logger.LogWarning(ex, "Failed to validate video ID: {VideoId}", videoId);
        return false;
      }
    }

    private static Uri BuildTranscriptUrl(string videoId)
    {
      var url = new UriBuilder(TRANSCRIPT_BASE_URL);
      var query = System.Web.HttpUtility.ParseQueryString(string.Empty);
      query["server_vid2"] = videoId;
      url.Query = query.ToString();
      return url.Uri;
    }

    private static Uri BuildValidationUrl(string videoId)
    {
      var url = new UriBuilder(VALIDATION_BASE_URL);
      var query = System.Web.HttpUtility.ParseQueryString(string.Empty);
      query["type"] = "track";
      query["v"] = videoId;
      query["id"] = "0";
      query["lang"] = "en";
      url.Query = query.ToString();
      return url.Uri;
    }
  }

}
