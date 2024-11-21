using FluentValidation;
using StudentCopilotApi.Audio.Models;

namespace StudentCopilotApi.Audio.Validators
{
    public class AudioSegmentationRequestValidator : AbstractValidator<AudioSegmentationRequest>
    {
        private readonly string[] _allowedFileExtensions = { ".wav", ".mp3", ".aac", ".m4a" };
        private const int AUDIO_FILE_LIMIT = 100 * 1024 * 1024;

        public AudioSegmentationRequestValidator()
        {
            RuleFor(x => x.AudioFile).NotNull().WithMessage("Audio file is required");

            RuleFor(x => x.AudioFile.Length)
                .ExclusiveBetween(0, AUDIO_FILE_LIMIT)
                .WithMessage($"File size must be between 0 and {AUDIO_FILE_LIMIT / 1024 / 1024}MB");

            RuleFor(x => x.AudioFile.FileName)
                .Must(fileName =>
                    _allowedFileExtensions.Contains(Path.GetExtension(fileName).ToLowerInvariant())
                )
                .WithMessage("Unsupported audio format. Supported formats: WAV, MP3, AAC, M4A");

            RuleFor(x => x.MaxTokensPerSegment)
                .GreaterThan(0)
                .WithMessage("MaxTokensPerSegment must be greater than 0");
        }
    }
}
