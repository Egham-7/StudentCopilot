# Build stage
FROM node:18-alpine AS build

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy only necessary files
COPY src ./src
COPY public ./public
COPY vite.config.js ./
COPY convex ./convex

ARG CONVEX_DEPLOY_KEY
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_CLERK_SECRET_KEY
ARG VITE_CLERK_SIGN_IN_FORCE_REDIRECT_URL
ARG VITE_CLERK_SIGN_UP_FORCE_REDIRECT_URL
ARG VITE_CONVEX_URL

# Build the app and deploy Convex functions
RUN npx convex deploy --cmd 'vite build'

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
