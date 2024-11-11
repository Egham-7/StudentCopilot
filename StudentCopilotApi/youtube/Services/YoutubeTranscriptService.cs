using Google.Apis.Services;
using Google.Apis.YouTube.v3;
using StudentCopilotApi.youtube.Models;
using Clerk.Net.Client;
using Google.Apis.Auth.OAuth2;

namespace StudentCopilotApi.youtube.Services
{
  public interface IYouTubeTranscriptService
  {
    Task<TranscriptResponse> GetTranscriptAsync(string videoId, string userId);
  }

  public class YouTubeTranscriptService : IYouTubeTranscriptService
  {
    private readonly HttpClient _httpClient;
    private readonly ClerkApiClient _clerkClient;
    private readonly ILogger<YouTubeTranscriptService> _logger;
    private const string GoogleOAuthProvider = "oauth_google";
    private readonly string[] SupportedLanguages = new[] { "en", "en-US" };

    public YouTubeTranscriptService(
        ClerkApiClient clerkClient,
        HttpClient httpClient,
        ILogger<YouTubeTranscriptService> logger)
    {
      _httpClient = httpClient ?? throw new ArgumentNullException(nameof(httpClient));
      _clerkClient = clerkClient ?? throw new ArgumentNullException(nameof(clerkClient));
      _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<TranscriptResponse> GetTranscriptAsync(string videoId, string userId)
    {
      if (string.IsNullOrEmpty(videoId))
        throw new ArgumentException("Video ID cannot be null or empty", nameof(videoId));

      if (string.IsNullOrEmpty(userId))
        throw new ArgumentException("User ID cannot be null or empty", nameof(userId));

      try
      {
        var credential = await GetGoogleCredentialAsync(userId);
        var youtubeService = CreateYouTubeService(credential);
        var caption = await GetCaptionAsync(youtubeService, videoId);
        var transcript = await DownloadTranscriptAsync(youtubeService, caption.Id);

        return new TranscriptResponse
        {
          Transcript = transcript,
          Language = caption.Snippet.Language,
          VideoId = videoId
        };
      }
      catch (Exception ex)
      {
        _logger.LogError(ex, "Error getting transcript for video {VideoId} and user {UserId}", videoId, userId);
        throw new YouTubeTranscriptException("Failed to retrieve transcript", ex);
      }
    }

    private async Task<GoogleCredential> GetGoogleCredentialAsync(string userId)
    {
      var oauthTokens = await _clerkClient.Users[userId]
          .Oauth_access_tokens[GoogleOAuthProvider]
          .GetAsync();

      var token = oauthTokens?.FirstOrDefault()?.Token
          ?? throw new UnauthorizedAccessException("User does not have a valid Google OAuth token.");

      return GoogleCredential.FromAccessToken(token);
    }

    private YouTubeService CreateYouTubeService(GoogleCredential credential)
    {
      return new YouTubeService(new BaseClientService.Initializer
      {
        HttpClientInitializer = credential,
        ApplicationName = "YouTubeTranscriptService"
      });
    }

    private async Task<Google.Apis.YouTube.v3.Data.Caption> GetCaptionAsync(
        YouTubeService youtubeService,
        string videoId)
    {
      var captionListRequest = youtubeService.Captions.List("snippet", videoId);
      var captionListResponse = await captionListRequest.ExecuteAsync();

      var captions = captionListResponse.Items;
      if (captions?.Any() != true)
      {
        throw new YouTubeTranscriptException($"No captions found for video {videoId}");
      }

      var caption = captions
          .Where(c => c != null)
          .FirstOrDefault(c => SupportedLanguages.Contains(c.Snippet.Language));

      return caption ?? throw new YouTubeTranscriptException($"No English captions found for video {videoId}");
    }

    private async Task<string> DownloadTranscriptAsync(
        YouTubeService youtubeService,
        string captionId)
    {
      var captionRequest = youtubeService.Captions.Download(captionId);
      return await captionRequest.ExecuteAsync();
    }
  }

  public class YouTubeTranscriptException : Exception
  {
    public YouTubeTranscriptException(string message) : base(message) { }
    public YouTubeTranscriptException(string message, Exception innerException)
        : base(message, innerException) { }
  }
}

