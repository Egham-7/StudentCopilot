namespace StudentCopilotApi.Audio.Models
{
    public class AudioSegment
    {
        public int Id { get; set; }
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
        public required byte[] AudioData { get; set; }
    }
}
