FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev for build)
RUN npm ci

# Copy source files
COPY tsconfig.json ./
COPY src ./src

# Build the project
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# Expose port for HTTP transport
EXPOSE 8000

# Set environment for HTTP mode
ENV PORT=8000

# Start the server
CMD ["node", "dist/index.js"]
