# Build stage
FROM node:20-alpine AS build

# Set working directory
WORKDIR /app

# Install pnpm and clean npm cache
RUN npm install -g pnpm@latest && npm cache clean --force

# Copy package files first for better layer caching
COPY package.json pnpm-lock.yaml ./

# Install dependencies with frozen lockfile for consistency
RUN pnpm install --frozen-lockfile

# Copy source files
COPY . .

# Build arguments
ARG CONVEX_DEPLOY_KEY
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_CLERK_SECRET_KEY
ARG VITE_CLERK_SIGN_IN_FORCE_REDIRECT_URL
ARG VITE_CLERK_SIGN_UP_FORCE_REDIRECT_URL
ARG VITE_CONVEX_URL
ARG VITE_BACKEND_URL
ARG ENVIRONMENT=production

# Build and deploy with improved conditional
RUN if [ "$ENVIRONMENT" = "staging" ]; then \
  pnpm dlx convex deploy --preview-create staging --cmd 'pnpm vite build'; \
  else \
  pnpm dlx convex deploy --cmd 'pnpm vite build'; \
  fi

# Production stage
FROM caddy:2-alpine

WORKDIR /app

COPY Caddyfile ./
RUN caddy fmt Caddyfile --overwrite

# Copy only the built assets
COPY --from=build /app/dist ./dist

# Expose ports
EXPOSE 80
EXPOSE 443

# Use non-root user for better security
USER 1000

# Start Caddy
CMD ["caddy", "run", "--config", "Caddyfile", "--adapter", "caddyfile"]

