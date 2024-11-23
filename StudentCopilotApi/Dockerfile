# Build stage
FROM mcr.microsoft.com/dotnet/sdk:9.0-alpine AS build
WORKDIR /src

# Copy csproj and restore dependencies
COPY *.csproj .
RUN dotnet restore

# Copy remaining source code
COPY . .
RUN dotnet publish -c Release -o /app

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0-jammy
WORKDIR /app
COPY --from=build /app .

# Install FFmpeg with best practices
RUN apt-get update && \
  apt-get install -y --no-install-recommends \
  ffmpeg=7:4.4.2-0ubuntu0.22.04.1 && \
  rm -rf /var/lib/apt/lists/*

# Configure container security
USER app
EXPOSE 80
EXPOSE 443

# Set the entry point
ENTRYPOINT ["dotnet", "StudentCopilotApi.dll"]

