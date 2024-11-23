namespace StudentCopilotApi.Audio.Interfaces
{
    public interface IVideoToAudioService
    {
        Task<string> ConvertVideoToAudioAsync(IFormFile videoFile);
    }
}
