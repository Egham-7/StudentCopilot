using StudentCopilotApi.youtube.Services;
using Clerk.Net.DependencyInjection;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Extensions.Diagnostics.HealthChecks;

var builder = WebApplication.CreateBuilder(args);

// Configuration setup
builder.Configuration.AddEnvironmentVariables();

// Core services
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddLogging();

// HTTP and API services
builder.Services.AddHttpClient();
builder.Services.AddClerkApiClient(config =>
{
  config.SecretKey = builder.Configuration["Clerk:SecretKey"]!;
});

// Register application services
builder.Services.AddTransient<IYouTubeTranscriptService, YouTubeTranscriptService>();

// Authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(x =>
    {
      x.Authority = builder.Configuration["Clerk:Authority"];
      x.TokenValidationParameters = new TokenValidationParameters()
      {
        ValidateAudience = true,
        ValidAudience = "convex",
        NameClaimType = "name",
        ValidateIssuer = true,
        ValidIssuer = builder.Configuration["Clerk:Authority"]
      };
    });

// CORS configuration
builder.Services.AddCors(options =>
{
  options.AddPolicy("MyAllowedOrigins",
      policy =>
      {
        policy.WithOrigins(
              "https://grandiose-caiman-959.convex.cloud",
              "http://grandiose-caiman-959.convex.cloud"
          )
          .AllowAnyHeader()
          .AllowAnyMethod();
      });
});

// Health checks
builder.Services.AddHealthChecks()
    .AddCheck("Configuration", () =>
    {
      var configValid = !string.IsNullOrEmpty(builder.Configuration["Clerk:Authority"]) &&
                       !string.IsNullOrEmpty(builder.Configuration["Clerk:SecretKey"]) &&
                       !string.IsNullOrEmpty(builder.Configuration["Clerk:AuthorizedParty"]);

      return configValid
          ? HealthCheckResult.Healthy("Configuration loaded")
          : HealthCheckResult.Unhealthy("Missing configuration");
    });

var app = builder.Build();

// Development specific configuration
if (app.Environment.IsDevelopment())
{
  app.UseSwagger();
  app.UseSwaggerUI();
}

// Logging configuration status
var logger = app.Services.GetRequiredService<ILogger<Program>>();
logger.LogInformation("Configuration Status:");
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
