namespace StudentCopilotApi.Audio.Models
{
    public class AudioSegmentationRequest
    {
        public required IFormFile AudioFile { get; set; }
        public int MaxTokensPerSegment { get; set; } = 16384;
    }
}
