using Google.Apis.Services;
using Google.Apis.YouTube.v3;
using StudentCopilotApi.youtube.Models;
using Clerk.Net.Client;
using Google.Apis.Auth.OAuth2;

namespace StudentCopilotApi.youtube.Services
{
  public class YouTubeTranscriptService
  {
    private readonly HttpClient _httpClient;
    private readonly ClerkApiClient _clerkClient;

    public YouTubeTranscriptService(ClerkApiClient clerkClient, HttpClient httpClient)
    {
      _httpClient = httpClient;
      _clerkClient = clerkClient;
    }

    public async Task<TranscriptResponse> GetTranscriptAsync(string videoId, string userId)
    {

      var oauthTokens = await _clerkClient.Users[userId].Oauth_access_tokens["google"].GetAsync();

      if (oauthTokens == null || oauthTokens.Count == 0)
      {
        throw new Exception("User does not have a Google OAuth token.");
      }

      var latestOAuthToken = oauthTokens.First().Token;

      var credential = GoogleCredential.FromAccessToken(latestOAuthToken);

      var youtubeService = new YouTubeService(new BaseClientService.Initializer()
      {
        HttpClientInitializer = credential,
      });


      var captionListRequest = youtubeService.Captions.List("snippet", videoId);

      var captionListResponse = await captionListRequest.ExecuteAsync();

      if (captionListResponse.Items.Count == 0)
      {
        throw new Exception("No captions found for the video.");
      }

      // Find english caption or ASR caption

      var caption = captionListResponse.Items.FirstOrDefault(c => c.Snippet.Language == "en" || c.Snippet.Language == "en-US");

      if (caption == null)
      {
        throw new Exception("No captions found for the video.");
      }

      var captionId = caption.Id;

      var captionRequest = youtubeService.Captions.Download(captionId);

      var captionResponse = await captionRequest.ExecuteAsync();


      var transcriptResponse = new TranscriptResponse
      {
        Transcript = captionResponse
      };


      return transcriptResponse;


    }
  }
}

