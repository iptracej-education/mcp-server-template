# Deployment Guide

This guide covers different deployment options for your MCP server.

## Local Development

### Basic Setup

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run in production mode
NODE_ENV=production npm start
```

### Environment Variables

Create a `.env` file for local configuration:

```env
MCP_SERVER_NAME=my-server
MCP_DEBUG=true
MCP_DATA_DIR=./data
MCP_OUTPUT_DIR=./output
```

## Claude Desktop Integration

### Configuration

Add to Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**Linux**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server-template/src/server/index.js"],
      "env": {
        "MCP_DEBUG": "false",
        "MCP_DATA_DIR": "/path/to/data"
      }
    }
  }
}
```

### Using npx

```json
{
  "mcpServers": {
    "my-server": {
      "command": "npx",
      "args": ["mcp-server-template"],
      "env": {
        "MCP_CONFIG_PATH": "/path/to/config.json"
      }
    }
  }
}
```

## Docker Deployment

### Building the Image

```bash
# Build the Docker image
docker build -t mcp-server .

# Tag for registry
docker tag mcp-server:latest myregistry.com/mcp-server:latest

# Push to registry
docker push myregistry.com/mcp-server:latest
```

### Running the Container

```bash
# Basic run
docker run -d \
  --name mcp-server \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/output:/app/output \
  mcp-server

# With custom configuration
docker run -d \
  --name mcp-server \
  -v $(pwd)/config.json:/app/config.json:ro \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/output:/app/output \
  -e MCP_DEBUG=true \
  mcp-server
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  mcp-server:
    build: .
    container_name: mcp-server
    restart: unless-stopped
    volumes:
      - ./data:/app/data
      - ./output:/app/output
      - ./config.json:/app/config.json:ro
      - ./custom-tools:/app/custom-tools:ro
    environment:
      - NODE_ENV=production
      - MCP_DEBUG=false
    networks:
      - mcp-network

networks:
  mcp-network:
    driver: bridge
```

## Systemd Service (Linux)

### Service File

Create `/etc/systemd/system/mcp-server.service`:

```ini
[Unit]
Description=MCP Server
After=network.target

[Service]
Type=simple
User=mcp
WorkingDirectory=/opt/mcp-server
ExecStart=/usr/bin/node /opt/mcp-server/src/server/index.js
Restart=on-failure
RestartSec=10

# Environment
Environment="NODE_ENV=production"
Environment="MCP_DATA_DIR=/var/lib/mcp-server/data"
Environment="MCP_OUTPUT_DIR=/var/lib/mcp-server/output"

# Logging
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

### Setup Commands

```bash
# Create user
sudo useradd -r -s /bin/false mcp

# Create directories
sudo mkdir -p /opt/mcp-server
sudo mkdir -p /var/lib/mcp-server/{data,output}

# Copy files
sudo cp -r * /opt/mcp-server/

# Set permissions
sudo chown -R mcp:mcp /opt/mcp-server
sudo chown -R mcp:mcp /var/lib/mcp-server

# Install dependencies
cd /opt/mcp-server
sudo -u mcp npm install --production

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable mcp-server
sudo systemctl start mcp-server

# Check status
sudo systemctl status mcp-server
sudo journalctl -u mcp-server -f
```

## PM2 Deployment

### Installation

```bash
# Install PM2 globally
npm install -g pm2

# Start the server
pm2 start src/server/index.js --name mcp-server

# Save configuration
pm2 save

# Setup startup script
pm2 startup
```

### PM2 Configuration

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'mcp-server',
    script: 'src/server/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      MCP_DEBUG: false
    },
    env_development: {
      NODE_ENV: 'development',
      MCP_DEBUG: true
    }
  }]
};
```

```bash
# Start with ecosystem file
pm2 start ecosystem.config.js

# Switch environments
pm2 start ecosystem.config.js --env development
```

## Cloud Deployment

### AWS EC2

```bash
# Install Node.js
curl -sL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install nodejs

# Clone and setup
git clone https://github.com/yourusername/mcp-server.git
cd mcp-server
npm install --production

# Run with PM2
pm2 start src/server/index.js
pm2 save
pm2 startup systemd
```

### Google Cloud Run

```dockerfile
# Dockerfile for Cloud Run
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 8080
CMD ["node", "src/server/index.js"]
```

```bash
# Build and deploy
gcloud builds submit --tag gcr.io/PROJECT_ID/mcp-server
gcloud run deploy mcp-server \
  --image gcr.io/PROJECT_ID/mcp-server \
  --platform managed \
  --region us-central1
```

### Heroku

```json
// package.json
{
  "scripts": {
    "start": "node src/server/index.js"
  },
  "engines": {
    "node": "18.x"
  }
}
```

```bash
# Deploy to Heroku
heroku create mcp-server
git push heroku main
heroku config:set MCP_DEBUG=false
heroku config:set NODE_ENV=production
```

## Monitoring

### Health Check Endpoint

Add a health check tool:

```javascript
// custom-tools/health.js
export default {
  name: 'health_check',
  description: 'Check server health',
  inputSchema: {
    type: 'object',
    properties: {}
  },
  handler: async () => {
    return {
      status: 'healthy',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
  }
};
```

### Logging

Configure logging output:

```javascript
// With Winston
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

### Metrics

Use Prometheus client:

```javascript
import client from 'prom-client';

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestDuration = new client.Histogram({
  name: 'mcp_request_duration_seconds',
  help: 'Duration of MCP requests in seconds',
  labelNames: ['tool']
});

register.registerMetric(httpRequestDuration);
```

## Security Considerations

### Environment Variables

Never commit sensitive data. Use environment variables:

```bash
# .env (add to .gitignore)
API_KEY=secret_key
DATABASE_URL=connection_string
```

### File Permissions

Restrict file access:

```bash
# Set appropriate permissions
chmod 600 config.json
chmod 700 data/
chown -R mcp:mcp /opt/mcp-server
```

### Network Security

- Use TLS for external connections
- Implement rate limiting
- Validate all inputs
- Sanitize file paths
- Use least privilege principle

## Troubleshooting

### Common Issues

**Server not starting:**
```bash
# Check Node version
node --version  # Should be >= 16

# Check for port conflicts
lsof -i :8080

# Check permissions
ls -la /opt/mcp-server
```

**Memory issues:**
```bash
# Increase Node memory limit
NODE_OPTIONS="--max-old-space-size=4096" node src/server/index.js
```

**Module not found:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Debug Mode

Enable debug logging:

```bash
# Environment variable
MCP_DEBUG=true npm start

# Or in config.json
{
  "debug": true
}
```

### Log Analysis

```bash
# View systemd logs
journalctl -u mcp-server --since "1 hour ago"

# PM2 logs
pm2 logs mcp-server --lines 100

# Docker logs
docker logs -f mcp-server --tail 100
```