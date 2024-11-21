namespace Audio.Models
{
    public class AudioSegment
    {
        public int Id { get; set; }
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
        public byte[] AudioData { get; set; } = [];
    }
}
