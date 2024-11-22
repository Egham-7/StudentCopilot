using FluentValidation;
using StudentCopilotApi.Audio.Models;

namespace StudentCopilotApi.Audio.Validators
{
    public class AudioSegmentationRequestValidator : AbstractValidator<AudioSegmentationRequest>
    {
        private readonly string[] _allowedAudioFileExtensions = { ".wav", ".mp3", ".aac", ".m4a" };
        private readonly string[] _allowedVideoFileExtensions =
        {
            ".mp4",
            ".avi",
            ".mkv",
            ".mov",
            ".wmv",
        };
        private const int AUDIO_FILE_LIMIT = 100 * 1024 * 1024; // 100MB

        public AudioSegmentationRequestValidator()
        {
            RuleFor(x => x.AudioFile).NotNull().WithMessage("Audio file is required");

            RuleFor(x => x.AudioFile.Length)
                .ExclusiveBetween(0, AUDIO_FILE_LIMIT)
                .WithMessage($"File size must be between 0 and {AUDIO_FILE_LIMIT / 1024 / 1024}MB");

            RuleFor(x => x.AudioFile.FileName)
                .Must(IsValidFileExtension)
                .WithMessage(
                    "Unsupported file format. Supported formats: WAV, MP3, AAC, M4A, MP4, AVI, MKV, MOV, WMV"
                );

            RuleFor(x => x.MaxTokensPerSegment)
                .GreaterThan(0)
                .WithMessage("MaxTokensPerSegment must be greater than 0");
        }

        private bool IsValidFileExtension(string fileName)
        {
            var extension = Path.GetExtension(fileName).ToLowerInvariant();
            return _allowedAudioFileExtensions.Contains(extension)
                || _allowedVideoFileExtensions.Contains(extension);
        }
    }
}
