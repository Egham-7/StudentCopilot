# Build stage
FROM mcr.microsoft.com/dotnet/sdk:9.0-preview-alpine AS build
WORKDIR /src
COPY *.csproj .
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o /app

# Runtime stage
FROM alpine:latest

# Install FFmpeg and .NET runtime dependencies
RUN apk add --no-cache \
  ffmpeg \
  icu-libs \
  krb5-libs \
  libgcc \
  libintl \
  libssl3 \
  libstdc++ \
  zlib

# Copy .NET runtime from Microsoft image
COPY --from=mcr.microsoft.com/dotnet/aspnet:9.0-preview-alpine /usr/share/dotnet /usr/share/dotnet
COPY --from=mcr.microsoft.com/dotnet/aspnet:9.0-preview-alpine /usr/lib/libmsquic.so /usr/lib/libmsquic.so

WORKDIR /app
COPY --from=build /app .

# Create non-root user
RUN adduser -D appuser && chown -R appuser:appuser /app
USER appuser

# Configure environment
ENV ASPNETCORE_URLS=http://+:8080
ENV PATH="$PATH:/usr/share/dotnet"

EXPOSE 8080

ENTRYPOINT ["dotnet", "StudentCopilotApi.dll"]

