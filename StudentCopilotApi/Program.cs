using Clerk.Net.DependencyInjection;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using StudentCopilotApi.youtube.Services;

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
builder.Services.AddScoped<YoutubeTranscriptService>();


// CORS configuration
builder.Services.AddCors(options =>
{
    options.AddPolicy("MyAllowedOrigins",
        policy =>
        {
            policy.WithOrigins(
                builder.Configuration["Cors:AllowedOrigins"]!
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
                         !string.IsNullOrEmpty(builder.Configuration["Cors:AllowedOrigins"]) &&
                         !string.IsNullOrEmpty(builder.Configuration["Clerk:AuthorizedParty"]);

        return configValid
            ? HealthCheckResult.Healthy("Configuration loaded")
            : HealthCheckResult.Unhealthy("Missing configuration");
    });

var app = builder.Build();

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
            ValidIssuer = builder.Configuration["Clerk:Authority"],
            ValidateIssuerSigningKey = true
        };

        if (app.Environment.IsDevelopment())
        {
            var developerParties = builder.Configuration
                .GetSection("Clerk:DeveloperAuthorizedParties")
                .Get<Dictionary<string, string>>() ?? new Dictionary<string, string>();

            var defaultParty = builder.Configuration["Clerk:DefaultAuthorizedParty"];

            x.Events = new JwtBearerEvents
            {
                OnTokenValidated = context =>
                {
                    var authorizedParty = context.Principal?.Claims
                        .FirstOrDefault(c => c.Type == "azp")?.Value;

                    if (authorizedParty != null &&
                        (developerParties.ContainsValue(authorizedParty) ||
                         authorizedParty == defaultParty))
                    {
                        return Task.CompletedTask;
                    }

                    context.Fail("Invalid authorized party");
                    return Task.CompletedTask;
                }
            };
        }
        else
        {
            // Production configuration
            x.TokenValidationParameters.ValidateAudience = true;
            x.TokenValidationParameters.ValidAudience = builder.Configuration["Clerk:AuthorizedParty"];
        }
    });



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

