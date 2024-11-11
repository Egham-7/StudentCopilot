using StudentCopilotApi.youtube.Services;
using Clerk.Net.DependencyInjection;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Security.Claims;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHttpClient();
builder.Services.AddScoped<IYouTubeTranscriptService, YouTubeTranscriptService>();


builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(x =>
    {
      x.Authority = builder.Configuration["Clerk:Authority"];
      x.TokenValidationParameters = new TokenValidationParameters()
      {
        ValidateAudience = false,
        NameClaimType = ClaimTypes.NameIdentifier
      };
      x.Events = new JwtBearerEvents()
      {
        OnTokenValidated = context =>
        {
          var azp = context.Principal?.FindFirstValue("azp");
          if (string.IsNullOrEmpty(azp) || !azp.Equals(builder.Configuration["Clerk:AuthorizedParty"]))
            context.Fail("AZP Claim is invalid or missing");
          return Task.CompletedTask;
        }
      };
    });

builder.Services.AddClerkApiClient(config =>
{
  config.SecretKey = builder.Configuration["Clerk:SecretKey"]!;
});

builder.WebHost.ConfigureKestrel(serverOptions =>
{
  serverOptions.ListenAnyIP(int.Parse(builder.Configuration["PORT"] ?? "8080"));
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
  app.UseSwagger();
  app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();

