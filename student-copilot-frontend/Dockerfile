# Build stage
FROM node:23-alpine AS build

# Set working directory
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@latest

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN pnpm install

# Copy all project files
COPY . .

ARG CONVEX_DEPLOY_KEY
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_CLERK_SECRET_KEY
ARG VITE_CLERK_SIGN_IN_FORCE_REDIRECT_URL
ARG VITE_CLERK_SIGN_UP_FORCE_REDIRECT_URL
ARG VITE_CONVEX_URL
ARG ENVIRONMENT=production

# Build the app and deploy Convex functions with conditional preview flag
RUN if [ "$ENVIRONMENT" = "staging" ]; then \
  pnpm dlx convex deploy --preview-create staging --cmd 'pnpm vite build'; \
  else \
  pnpm dlx convex deploy --cmd 'pnpm vite build'; \
  fi

# Production stage
FROM caddy:2-alpine

# Copy the built assets from the build stage
COPY --from=build /app/dist /srv

# Copy Caddy configuration
COPY Caddyfile /etc/caddy/Caddyfile

# Expose ports
EXPOSE 80
EXPOSE 443

# Start Caddy
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile"]

