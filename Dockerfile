FROM node:18-alpine

# Create app directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application files
COPY src/ ./src/
COPY config.json ./

# Create data and output directories
RUN mkdir -p data output custom-tools

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose stdio (MCP uses stdio, not network ports)
ENV NODE_ENV=production

# Start the server
CMD ["node", "src/server/index.js"]