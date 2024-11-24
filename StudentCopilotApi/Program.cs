using Clerk.Net.DependencyInjection;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using StudentCopilotApi.youtube.Services;
using StudentCopilotApi.Audio.Services;
using StudentCopilotApi.Audio.Interfaces;
using StudentCopilotApi.Audio.Validators;
using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.AspNetCore.Http.Features;


var builder = WebApplication.CreateBuilder(args);


builder.Services.Configure<KestrelServerOptions>(options =>
{
    options.Limits.MaxRequestBodySize = 209715200; // 200 MB in bytes
});

builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 209715200; // 200 MB in bytes
});

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
builder.Services.AddClerkApiClient(config =>
{
    config.SecretKey = builder.Configuration["Clerk:SecretKey"]!;
});

// Register application services
builder.Services.AddScoped<YoutubeTranscriptService>();
builder.Services.AddScoped<IAudioSegmentationService, AudioSegmentationService>();
builder.Services.AddScoped<IVideoToAudioService>(provider =>
{
    var ffmpegPath = builder.Configuration["FFmpeg:Path"] ?? "ffmpeg";
    return new VideoToAudioService(ffmpegPath);
});

// CORS configuration
builder.Services.AddCors(options =>
{
    var allowedOrigins = builder.Configuration["Cors:AllowedOrigins"]!
                    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
    options.AddPolicy("MyAllowedOrigins",
        policy =>
        {
            policy.WithOrigins(
                allowedOrigins
            )
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
        });
});

// Health checks
builder.Services.AddHealthChecks()
    .AddCheck("Configuration", () =>
    {
        var configValid = !string.IsNullOrEmpty(builder.Configuration["Clerk:Authority"]) &&
                         !string.IsNullOrEmpty(builder.Configuration["Clerk:SecretKey"]) &&
                         !string.IsNullOrEmpty(builder.Configuration["Cors:AllowedOrigins"]) &&
                         !string.IsNullOrEmpty(builder.Configuration["Clerk:AuthorizedParty"]);

        return configValid
            ? HealthCheckResult.Healthy("Configuration loaded")
            : HealthCheckResult.Unhealthy("Missing configuration");
    });



builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(x =>
    {
        var logger = builder.Services.BuildServiceProvider().GetRequiredService<ILogger<Program>>();

        x.Authority = builder.Configuration["Clerk:Authority"];
        logger.LogInformation("Configuring JWT authentication with Authority: {Authority}", x.Authority);

        x.TokenValidationParameters = new TokenValidationParameters()
        {
            ValidateAudience = true,
            ValidAudience = "convex",
            NameClaimType = "name",
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Clerk:Authority"],
            ValidateIssuerSigningKey = true
        };

        if (builder.Environment.IsDevelopment())
        {
            logger.LogInformation("Configuring development environment JWT validation");

            var developerParties = builder.Configuration["Clerk:DeveloperAuthorizedParties"]?.Split(",", StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries) ?? Array.Empty<string>();
            var defaultParty = builder.Configuration["Clerk:DefaultAuthorizedParty"];

            logger.LogInformation("Developer Parties {parties}: ", developerParties.ToString());

            x.Events = new JwtBearerEvents
            {
                OnTokenValidated = context =>
                {
                    var authorizedParty = context.Principal?.Claims
                        .FirstOrDefault(c => c.Type == "azp")?.Value;

                    logger.LogInformation("Token validation attempt - Authorized Party: {AuthorizedParty}", authorizedParty);

                    if (authorizedParty != null &&
                        (developerParties.Contains(authorizedParty) ||
                         authorizedParty == defaultParty))
                    {
                        logger.LogInformation("Token validated successfully for authorized party: {AuthorizedParty}", authorizedParty);
                        return Task.CompletedTask;
                    }

                    logger.LogWarning("Token validation failed - Invalid authorized party: {AuthorizedParty}", authorizedParty);
                    context.Fail("Invalid authorized party");
                    return Task.CompletedTask;
                }
            };
        }
        else
        {
            logger.LogInformation("Configuring production environment JWT validation");
            x.TokenValidationParameters.ValidateAudience = true;
            x.TokenValidationParameters.ValidAudience = builder.Configuration["Clerk:AuthorizedParty"];
            logger.LogInformation("Production ValidAudience set to: {Audience}", x.TokenValidationParameters.ValidAudience);
        }
    });

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

if (builder.Environment.IsDevelopment())
{
    builder.Services.AddLogging(logging =>
    {
        logging.ClearProviders();
        logging.AddConsole();
        logging.AddDebug();
        logging.SetMinimumLevel(LogLevel.Trace);
    });

    builder.Configuration.AddUserSecrets<Program>();
}

var app = builder.Build();


if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}


// Logging configuration status
var logger = app.Services.GetRequiredService<ILogger<Program>>();
logger.LogInformation("Configuration Status:");
logger.LogInformation("Mode: {Mode}", app.Environment.ToString());
logger.LogInformation("Clerk Authority: {Authority}", builder.Configuration["Clerk:Authority"] ?? "NOT SET");
logger.LogInformation("Clerk Secret Key: {HasSecret}", !string.IsNullOrEmpty(builder.Configuration["Clerk:SecretKey"]));
logger.LogInformation("Clerk Authorized Party: {HasParty}", !string.IsNullOrEmpty(builder.Configuration["Clerk:AuthorizedParty"]));

// Middleware pipeline
app.UseCors("MyAllowedOrigins");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHealthChecks("/health");

app.Run();

