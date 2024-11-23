# Build stage
FROM mcr.microsoft.com/dotnet/sdk:9.0-preview-alpine AS build
WORKDIR /src

# Copy csproj and restore dependencies
COPY *.csproj .
RUN dotnet restore

# Copy remaining source code
COPY . .
RUN dotnet publish -c Release -o /app

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:9.0-preview-alpine
WORKDIR /app
COPY --from=build /app .

# Install FFmpeg with Alpine package manager
RUN apk add --no-cache ffmpeg

# Configure container security
USER app
EXPOSE 80
EXPOSE 443

# Set the entry point
ENTRYPOINT ["dotnet", "StudentCopilotApi.dll"]

