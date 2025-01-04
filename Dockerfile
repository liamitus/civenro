# Dockerfile
# Force rebuild - updated 2025-01-01

# Stage 1: Build the React app
FROM node:20-alpine AS build

WORKDIR /app

# Define build argument
ARG VITE_API_URL

# Set environment variable for Vite to use during build
ENV VITE_API_URL=${VITE_API_URL}

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of the frontend code
COPY . .

# Build the app
RUN npm run build

# Stage 2: Serve the app with a static server
FROM node:20-alpine

# Install curl
RUN apk add --no-cache curl

# Install serve globally
RUN npm install -g serve

WORKDIR /app

# Copy built app from previous stage
COPY --from=build /app/dist ./dist

# Set environment variables
# ENV VITE_API_URL=${VITE_API_URL}

# Expose port
EXPOSE 3000

# Command to serve the app
CMD ["serve", "-s", "dist", "-l", "3000"]
