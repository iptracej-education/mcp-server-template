/**
 * Tool Registry for MCP Server
 * Manages tool registration, discovery, and execution
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class ToolRegistry {
  constructor() {
    this.tools = new Map();
    this.config = null;
  }

  /**
   * Initialize the tool registry
   */
  async initialize(config) {
    this.config = config;
    
    // Load built-in tools
    await this.loadBuiltInTools();
    
    // Load custom tools if directory exists
    if (config.tools?.customToolsDir) {
      await this.loadCustomTools(config.tools.customToolsDir);
    }
  }

  /**
   * Load built-in tools
   */
  async loadBuiltInTools() {
    // Example built-in tools
    this.registerTool({
      name: 'list_items',
      description: 'List all items in the system',
      inputSchema: {
        type: 'object',
        properties: {
          filter: {
            type: 'string',
            description: 'Optional filter pattern'
          },
          limit: {
            type: 'number',
            description: 'Maximum number of items to return'
          }
        }
      },
      handler: async (args) => {
        const dataFile = path.join(this.config.dataDir, 'items.json');
        if (!fs.existsSync(dataFile)) {
          return { items: [], count: 0 };
        }
        
        const data = await fs.readJson(dataFile);
        let items = data.items || [];
        
        // Apply filter if provided
        if (args.filter) {
          const filterRegex = new RegExp(args.filter, 'i');
          items = items.filter(item => 
            filterRegex.test(item.name) || filterRegex.test(item.description)
          );
        }
        
        // Apply limit if provided
        if (args.limit) {
          items = items.slice(0, args.limit);
        }
        
        return { items, count: items.length };
      }
    });

    this.registerTool({
      name: 'add_item',
      description: 'Add a new item to the system',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Item name'
          },
          description: {
            type: 'string',
            description: 'Item description'
          },
          metadata: {
            type: 'object',
            description: 'Additional metadata'
          }
        },
        required: ['name', 'description']
      },
      handler: async (args) => {
        const dataFile = path.join(this.config.dataDir, 'items.json');
        
        // Load existing data
        let data = { items: [] };
        if (fs.existsSync(dataFile)) {
          data = await fs.readJson(dataFile);
        }
        
        // Create new item
        const newItem = {
          id: Date.now().toString(),
          name: args.name,
          description: args.description,
          metadata: args.metadata || {},
          createdAt: new Date().toISOString()
        };
        
        // Add to array
        data.items.push(newItem);
        
        // Save
        await fs.writeJson(dataFile, data, { spaces: 2 });
        
        return {
          success: true,
          item: newItem,
          message: `Item '${args.name}' added successfully`
        };
      }
    });

    this.registerTool({
      name: 'remove_item',
      description: 'Remove an item from the system',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Item ID to remove'
          }
        },
        required: ['id']
      },
      handler: async (args) => {
        const dataFile = path.join(this.config.dataDir, 'items.json');
        
        if (!fs.existsSync(dataFile)) {
          throw new Error('No items found');
        }
        
        const data = await fs.readJson(dataFile);
        const initialLength = data.items.length;
        
        // Filter out the item
        data.items = data.items.filter(item => item.id !== args.id);
        
        if (data.items.length === initialLength) {
          throw new Error(`Item with ID '${args.id}' not found`);
        }
        
        // Save
        await fs.writeJson(dataFile, data, { spaces: 2 });
        
        return {
          success: true,
          message: `Item '${args.id}' removed successfully`
        };
      }
    });

    this.registerTool({
      name: 'search_items',
      description: 'Search items with advanced query',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query'
          },
          fields: {
            type: 'array',
            items: { type: 'string' },
            description: 'Fields to search in'
          }
        },
        required: ['query']
      },
      handler: async (args) => {
        const dataFile = path.join(this.config.dataDir, 'items.json');
        
        if (!fs.existsSync(dataFile)) {
          return { results: [], count: 0 };
        }
        
        const data = await fs.readJson(dataFile);
        const query = args.query.toLowerCase();
        const fields = args.fields || ['name', 'description'];
        
        const results = data.items.filter(item => {
          return fields.some(field => {
            const value = item[field];
            if (typeof value === 'string') {
              return value.toLowerCase().includes(query);
            }
            if (typeof value === 'object') {
              return JSON.stringify(value).toLowerCase().includes(query);
            }
            return false;
          });
        });
        
        return { results, count: results.length };
      }
    });

    this.registerTool({
      name: 'get_status',
      description: 'Get system status and statistics',
      inputSchema: {
        type: 'object',
        properties: {}
      },
      handler: async () => {
        const dataFile = path.join(this.config.dataDir, 'items.json');
        
        let itemCount = 0;
        if (fs.existsSync(dataFile)) {
          const data = await fs.readJson(dataFile);
          itemCount = data.items?.length || 0;
        }
        
        return {
          serverName: this.config.serverName,
          version: this.config.version,
          uptime: process.uptime(),
          statistics: {
            totalItems: itemCount,
            registeredTools: this.tools.size
          },
          configuration: {
            dataDir: this.config.dataDir,
            outputDir: this.config.outputDir,
            debug: this.config.debug
          }
        };
      }
    });
  }

  /**
   * Load custom tools from directory
   */
  async loadCustomTools(toolsDir) {
    const absolutePath = path.isAbsolute(toolsDir) 
      ? toolsDir 
      : path.join(process.cwd(), toolsDir);
    
    if (!fs.existsSync(absolutePath)) {
      console.error(`Custom tools directory not found: ${absolutePath}`);
      return;
    }

    const files = await fs.readdir(absolutePath);
    const toolFiles = files.filter(f => f.endsWith('.js'));

    for (const file of toolFiles) {
      try {
        const toolPath = path.join(absolutePath, file);
        const tool = await import(toolPath);
        
        if (tool.default) {
          this.registerTool(tool.default);
          console.error(`Loaded custom tool from: ${file}`);
        }
      } catch (error) {
        console.error(`Failed to load custom tool ${file}: ${error.message}`);
      }
    }
  }

  /**
   * Register a tool
   */
  registerTool(tool) {
    if (!tool.name || !tool.handler) {
      throw new Error('Tool must have a name and handler');
    }

    this.tools.set(tool.name, {
      name: tool.name,
      description: tool.description || '',
      inputSchema: tool.inputSchema || {
        type: 'object',
        properties: {}
      },
      handler: tool.handler
    });
  }

  /**
   * Get all registered tools
   */
  getTools() {
    return Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    }));
  }

  /**
   * Execute a tool
   */
  async executeTool(name, args) {
    const tool = this.tools.get(name);
    
    if (!tool) {
      throw new Error(`Tool '${name}' not found`);
    }

    try {
      return await tool.handler(args);
    } catch (error) {
      throw new Error(`Tool '${name}' execution failed: ${error.message}`);
    }
  }

  /**
   * Check if tool exists
   */
  hasTool(name) {
    return this.tools.has(name);
  }
}

export default new ToolRegistry();