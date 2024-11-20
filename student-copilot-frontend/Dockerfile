# Build stage
FROM node:23-alpine AS build

# Set working directory
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies (including dev dependencies)
RUN pnpm install

# Copy all project files
COPY . .

ARG CONVEX_DEPLOY_KEY
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_CLERK_SECRET_KEY
ARG VITE_CLERK_SIGN_IN_FORCE_REDIRECT_URL
ARG VITE_CLERK_SIGN_UP_FORCE_REDIRECT_URL
ARG VITE_CONVEX_URL

# Build the app and deploy Convex functions
RUN pnpm dlx convex deploy --cmd 'pnpm vite build'

# Production stage
FROM nginx:alpine

# Copy the built assets from the build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]

