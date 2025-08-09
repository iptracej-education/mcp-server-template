# MCP Server Template

A starter template for creating Model Context Protocol (MCP) servers that integrate with Claude Desktop and other MCP-compatible clients.

## Features

- Stdio transport for Claude Desktop integration
- Configurable tool system with built-in and custom tools
- JSON-based configuration with environment variable overrides
- Docker support for containerized deployment
- Comprehensive logging and error handling
- TypeScript-ready structure
- Example tools for common operations

## Quick Start

### Installation

```bash
# Clone the template
git clone https://github.com/yourusername/mcp-server-template.git
cd mcp-server-template

# Install dependencies
npm install

# Run in development mode
npm run dev
```

### Configuration

Create a `config.json` file in the project root:

```json
{
  "serverName": "my-mcp-server",
  "version": "1.0.0",
  "debug": true,
  "dataDir": "./data",
  "outputDir": "./output",
  "tools": {
    "enabled": true,
    "customToolsDir": "./custom-tools"
  }
}
```

### Claude Desktop Integration

Add to your Claude Desktop configuration (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["/path/to/mcp-server-template/src/server/index.js"]
    }
  }
}
```

## Project Structure

```
mcp-server-template/
├── src/
│   ├── server/          # Core server implementation
│   │   └── index.js     # Main server entry point
│   ├── config/          # Configuration management
│   │   └── config-loader.js
│   ├── tools/           # Tool system
│   │   └── tool-registry.js
│   └── generator/       # Template generator (optional)
├── examples/            # Example implementations
│   ├── custom-tool.js   # Example custom tool
│   └── docker/          # Docker configuration
├── tests/               # Test suite
├── docs/                # Documentation
├── config.json          # Default configuration
└── package.json
```

## Creating Custom Tools

Create a new tool in the `custom-tools` directory:

```javascript
// custom-tools/my-tool.js
export default {
  name: 'my_custom_tool',
  description: 'Description of what this tool does',
  inputSchema: {
    type: 'object',
    properties: {
      param1: {
        type: 'string',
        description: 'First parameter'
      },
      param2: {
        type: 'number',
        description: 'Second parameter'
      }
    },
    required: ['param1']
  },
  handler: async (args) => {
    // Tool implementation
    const result = await doSomething(args.param1, args.param2);
    return {
      success: true,
      result: result
    };
  }
};
```

## Built-in Tools

The template includes several built-in tools:

- `list_items` - List all items with optional filtering
- `add_item` - Add a new item to the system
- `remove_item` - Remove an item by ID
- `search_items` - Search items with advanced queries
- `get_status` - Get system status and statistics

## Environment Variables

Override configuration using environment variables:

- `MCP_SERVER_NAME` - Server name
- `MCP_VERSION` - Server version
- `MCP_DEBUG` - Enable debug logging
- `MCP_DATA_DIR` - Data directory path
- `MCP_OUTPUT_DIR` - Output directory path
- `MCP_CONFIG_PATH` - Custom config file path

## Docker Deployment

Build and run with Docker:

```bash
# Build image
docker build -t my-mcp-server .

# Run container
docker run -d \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/output:/app/output \
  --name my-mcp-server \
  my-mcp-server
```

## Development

### Running Tests

```bash
npm test
```

### Linting

```bash
npm run lint
```

### Building for Production

```bash
npm run build
```

## API Reference

### Tool Schema

All tools follow this schema:

```javascript
{
  name: string,           // Unique tool identifier
  description: string,    // Human-readable description
  inputSchema: {         // JSON Schema for parameters
    type: 'object',
    properties: {},
    required: []
  },
  handler: async function // Tool implementation
}
```

### Configuration Schema

```javascript
{
  serverName: string,     // Server identifier
  version: string,        // Server version
  debug: boolean,         // Enable debug logging
  dataDir: string,        // Data storage directory
  outputDir: string,      // Output directory
  maxFileSize: number,    // Maximum file size in bytes
  timeout: number,        // Request timeout in ms
  tools: {
    enabled: boolean,     // Enable tool system
    customToolsDir: string // Custom tools directory
  }
}
```

## Extending the Template

### Adding New Features

1. Create feature modules in `src/features/`
2. Register with the server in `src/server/index.js`
3. Add configuration options to `config-loader.js`
4. Document in README and API reference

### Creating Domain-Specific Servers

1. Fork this template
2. Replace example tools with domain-specific tools
3. Customize configuration schema
4. Update documentation
5. Deploy as standalone MCP server

## Troubleshooting

### Common Issues

**Server not starting:**
- Check Node.js version (>=16.0.0)
- Verify configuration file syntax
- Check file permissions

**Tools not loading:**
- Verify tool file exports default object
- Check tool schema validity
- Review debug logs for errors

**Claude Desktop integration:**
- Ensure correct path in configuration
- Check server process is running
- Review Claude Desktop logs

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Update documentation
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

- GitHub Issues: [Report bugs or request features](https://github.com/yourusername/mcp-server-template/issues)
- Documentation: [Full documentation](https://github.com/yourusername/mcp-server-template/wiki)
- Examples: See the `examples/` directory

## Acknowledgments

Built for the Model Context Protocol ecosystem, enabling AI assistants to interact with external systems through a standardized interface.
