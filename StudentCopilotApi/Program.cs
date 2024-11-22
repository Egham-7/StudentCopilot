using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.IdentityModel.Tokens;
using StudentCopilotApi.Audio.Interfaces;
using StudentCopilotApi.Audio.Services;
using StudentCopilotApi.Audio.Validators;
using StudentCopilotApi.youtube.Services;

var builder = WebApplication.CreateBuilder(args);

// Configuration setup
builder.Configuration.AddEnvironmentVariables();

// Core services
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddLogging();

// Validators for Controllers

builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddValidatorsFromAssemblyContaining<AudioSegmentationRequestValidator>();

// HTTP and API services
builder.Services.AddHttpClient();

// Register application services
builder.Services.AddScoped<YoutubeTranscriptService>();
builder.Services.AddScoped<IAudioSegmentationService, AudioSegmentationService>();
builder.Services.AddScoped<IVideoToAudioService>(provider => new VideoToAudioService(
    Environment.GetEnvironmentVariable("FFMPEG_PATH")!
));

// Authentication
builder
    .Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(x =>
    {
        x.Authority = builder.Configuration["Clerk:Authority"];
        x.TokenValidationParameters = new TokenValidationParameters()
        {
            ValidateAudience = true,
            ValidAudience = "convex",
            NameClaimType = "name",
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Clerk:Authority"],
        };
    });

// CORS Configuration

builder.Services.AddCors(options =>
{
    options.AddPolicy(
        "MyAllowedOrigins",
        policy =>
        {
            policy
                .WithOrigins(
                    "https://grandiose-caiman-959.convex.cloud",
                    "http://grandiose-caiman-959.convex.cloud",
                    "http://localhost:5173",
                    "http://localhost:5000"
                )
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials()
                .WithExposedHeaders("Content-Disposition");
        }
    );
});

// Health checks
builder
    .Services.AddHealthChecks()
    .AddCheck(
        "Configuration",
        () =>
        {
            var configValid =
                !string.IsNullOrEmpty(builder.Configuration["Clerk:Authority"])
                && !string.IsNullOrEmpty(builder.Configuration["Clerk:SecretKey"])
                && !string.IsNullOrEmpty(builder.Configuration["Clerk:AuthorizedParty"]);

            return configValid
                ? HealthCheckResult.Healthy("Configuration loaded")
                : HealthCheckResult.Unhealthy("Missing configuration");
        }
    );

// HTTP Logging

builder.Services.AddHttpLogging(logging =>
{
    logging.LoggingFields = Microsoft.AspNetCore.HttpLogging.HttpLoggingFields.All;
    logging.RequestHeaders.Add("Authorization");
    logging.RequestHeaders.Add("Content-Type");
    logging.RequestHeaders.Add("Content-Length");
    logging.MediaTypeOptions.AddText("application/json");
    logging.RequestBodyLogLimit = 4096;
    logging.ResponseBodyLogLimit = 4096;
});

var app = builder.Build();

// Development specific configuration
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
    builder.Configuration.AddUserSecrets<Program>();

    // Add detailed logging configuration
    builder.Services.AddLogging(logging =>
    {
        logging.ClearProviders();
        logging.AddConsole();
        logging.AddDebug();
        logging.SetMinimumLevel(LogLevel.Trace);
    });
}

// Logging configuration status
var logger = app.Services.GetRequiredService<ILogger<Program>>();
logger.LogInformation("Configuration Status:");
logger.LogInformation(
    "Clerk Authority: {Authority}",
    builder.Configuration["Clerk:Authority"] ?? "NOT SET"
);
logger.LogInformation(
    "Clerk Secret Key: {HasSecret}",
    !string.IsNullOrEmpty(builder.Configuration["Clerk:SecretKey"])
);
logger.LogInformation(
    "Clerk Authorized Party: {HasParty}",
    !string.IsNullOrEmpty(builder.Configuration["Clerk:AuthorizedParty"])
);

// Middleware pipeline
app.UseHttpLogging();
app.UseCors("MyAllowedOrigins");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHealthChecks("/health");

app.Run();
