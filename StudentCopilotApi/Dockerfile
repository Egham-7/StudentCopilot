# Build stage
FROM mcr.microsoft.com/dotnet/sdk:9.0-preview-alpine AS build
WORKDIR /src
COPY *.csproj .
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o /app

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:9.0-preview-alpine
WORKDIR /app
COPY --from=build /app .

# Install FFmpeg
RUN apk add --no-cache ffmpeg

# Create non-root user
RUN adduser -D appuser && chown -R appuser:appuser /app
USER appuser

# Configure environment
ENV ASPNETCORE_URLS=http://+:80
ENV FFmpeg__Path=/usr/bin/ffmpeg

EXPOSE 80
ENTRYPOINT ["dotnet", "StudentCopilotApi.dll"]

