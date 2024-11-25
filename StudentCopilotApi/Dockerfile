# Build stage
FROM mcr.microsoft.com/dotnet/sdk:9.0-preview AS build
WORKDIR /src
COPY *.csproj .
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o /app

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:9.0-preview

# Install FFmpeg
RUN apt-get update && \
  apt-get install -y ffmpeg && \
  rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=build /app .

# Create non-root user
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

# Configure environment
ENV ASPNETCORE_URLS=http://+:8080
ENV FFmpeg__Path=/usr/bin/ffmpeg

EXPOSE 8080

ENTRYPOINT ["dotnet", "StudentCopilotApi.dll"]
