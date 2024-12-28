# Dockerfile

# Stage 1: Build the React app
FROM node:20-alpine AS build

WORKDIR /app

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
COPY --from=build /app/build ./build

# Set environment variables
ENV REACT_APP_API_URL=http://backend:5001

# Expose port
EXPOSE 3000

# Command to serve the app
CMD ["serve", "-s", "build", "-l", "3000"]
