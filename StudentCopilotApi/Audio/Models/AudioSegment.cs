namespace StudentCopilotApi.Audio.Models
{
    public class AudioSegment
    {
        public int Id { get; init; }
        public TimeSpan StartTime { get; init; }
        public TimeSpan EndTime { get; init; }
        public required IReadOnlyList<double> AudioData { get; init; }
    }
}
