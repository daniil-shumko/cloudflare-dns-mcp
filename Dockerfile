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

# Set the entrypoint
ENTRYPOINT ["node", "dist/index.js"]
