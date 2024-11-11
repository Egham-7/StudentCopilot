using StudentCopilotApi.youtube.Services;
using Clerk.Net.DependencyInjection;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Extensions.Diagnostics.HealthChecks;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHttpClient();
builder.Services.AddScoped<IYouTubeTranscriptService, YouTubeTranscriptService>();
builder.Configuration.AddEnvironmentVariables();



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


builder.Services.AddClerkApiClient(config =>
{
  config.SecretKey = builder.Configuration["Clerk:SecretKey"]!;
});


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

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
  app.UseSwagger();
  app.UseSwaggerUI();
}

var logger = app.Services.GetRequiredService<ILogger<Program>>();

logger.LogInformation("Configuration Status:");
logger.LogInformation("Clerk Authority: {Authority}", builder.Configuration["Clerk:Authority"] ?? "NOT SET");
logger.LogInformation("Clerk Secret Key: {HasSecret}", !string.IsNullOrEmpty(builder.Configuration["Clerk:SecretKey"]));
logger.LogInformation("Clerk Authorized Party: {HasParty}", !string.IsNullOrEmpty(builder.Configuration["Clerk:AuthorizedParty"]));


app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHealthChecks("/health");

app.Run();

