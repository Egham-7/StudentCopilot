# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0-jammy AS build
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

# Configure container security
USER app
EXPOSE 80
EXPOSE 443

# Set the entry point
ENTRYPOINT ["dotnet", "StudentCopilotApi.dll"]

