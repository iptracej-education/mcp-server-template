#!/usr/bin/env node
/**
 * Generic MCP Server Template
 * A reusable template for creating Model Context Protocol servers
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import configLoader from '../config/config-loader.js';
import { toolRegistry } from '../tools/tool-registry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load configuration
const CONFIG = configLoader.loadConfig();

// Logging utility
const log = (message, level = 'info') => {
  if (CONFIG.debug || level === 'error') {
    console.error(`[${new Date().toISOString()}] ${level.toUpperCase()}: ${message}`);
  }
};

// Create MCP server
const server = new Server(
  {
    name: CONFIG.serverName || 'mcp-template-server',
    version: CONFIG.version || '1.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const tools = toolRegistry.getTools();
  log(`Returning ${tools.length} available tools`);
  return { tools };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  log(`Executing tool: ${name}`);
  
  try {
    const result = await toolRegistry.executeTool(name, args);
    
    return {
      content: [
        {
          type: 'text',
          text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
        }
      ]
    };
  } catch (error) {
    log(`Error executing tool ${name}: ${error.message}`, 'error');
    
    if (error instanceof McpError) {
      throw error;
    }
    
    throw new McpError(
      ErrorCode.InternalError,
      `Tool execution failed: ${error.message}`
    );
  }
});

// Start server
async function main() {
  log('Starting MCP server...');
  
  // Initialize tool registry
  await toolRegistry.initialize(CONFIG);
  
  // Use stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  log(`Server started: ${CONFIG.serverName} v${CONFIG.version}`);
  
  // Handle shutdown
  process.on('SIGINT', async () => {
    log('Shutting down server...');
    await server.close();
    process.exit(0);
  });
}

// Run server
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});