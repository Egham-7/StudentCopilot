using StudentCopilotApi.Audio.Models;

namespace StudentCopilotApi.Audio.Interfaces
{
    public interface IAudioSegmentationService
    {
        Task<IEnumerable<AudioSegment>> SegmentAudioAsync(IFormFile file, int maxTokensPerSegment);
        int EstimateTokenCount(string text);
    }
}
