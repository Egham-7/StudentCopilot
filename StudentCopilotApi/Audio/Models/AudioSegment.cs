namespace StudentCopilotApi.Audio.Models
{
    public class AudioSegment
    {
        public int Id { get; set; }
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
        public required List<float> AudioData { get; set; }
    }
}
