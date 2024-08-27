# Build stage
FROM node:18 AS build

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application code
COPY . .

ARG CONVEX_DEPLOY_KEY
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_CLERK_SIGN_IN_FORCE_REDIRECT_URL
ARG VITE_CLERK_SIGN_UP_FORCE_REDIRECT_URL

# Build the app and deploy Convex functions
RUN npx convex deploy --cmd 'vite build'

# Production stage
FROM nginx:alpine

# Copy the built assets from the build stage
COPY --from=build /app/dist /usr/share/nginx/html


# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]

