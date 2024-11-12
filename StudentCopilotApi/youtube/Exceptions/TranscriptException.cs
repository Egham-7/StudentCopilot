
namespace StudentCopilotApi.youtube.Exceptions
{

  public class TranscriptException : Exception
  {
    public TranscriptException(string message) : base(message) { }
    public TranscriptException(string message, Exception inner) : base(message, inner) { }
  }
}
