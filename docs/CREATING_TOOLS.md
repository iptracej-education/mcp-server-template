# Creating Custom Tools

This guide explains how to create custom tools for your MCP server.

## Tool Structure

Every tool must export a default object with the following properties:

```javascript
export default {
  name: 'tool_name',           // Unique identifier (snake_case)
  description: 'What it does',  // Human-readable description
  inputSchema: {},              // JSON Schema for parameters
  handler: async (args) => {}   // Implementation function
}
```

## Basic Example

```javascript
// custom-tools/hello-world.js
export default {
  name: 'hello_world',
  description: 'Returns a greeting message',
  
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Name to greet'
      }
    },
    required: ['name']
  },
  
  handler: async (args) => {
    return {
      message: `Hello, ${args.name}!`,
      timestamp: new Date().toISOString()
    };
  }
};
```

## Input Schema

The input schema follows JSON Schema specification:

### Basic Types

```javascript
inputSchema: {
  type: 'object',
  properties: {
    stringParam: { type: 'string' },
    numberParam: { type: 'number' },
    booleanParam: { type: 'boolean' },
    arrayParam: { 
      type: 'array',
      items: { type: 'string' }
    },
    objectParam: { 
      type: 'object',
      properties: {
        nested: { type: 'string' }
      }
    }
  }
}
```

### Validation

```javascript
inputSchema: {
  type: 'object',
  properties: {
    email: {
      type: 'string',
      format: 'email'
    },
    age: {
      type: 'number',
      minimum: 0,
      maximum: 150
    },
    status: {
      type: 'string',
      enum: ['active', 'inactive', 'pending']
    }
  },
  required: ['email', 'status']
}
```

## Handler Function

The handler function receives the validated arguments and returns the result:

### Async Operations

```javascript
handler: async (args) => {
  // Perform async operations
  const data = await fetchData(args.id);
  const processed = await processData(data);
  
  return {
    success: true,
    result: processed
  };
}
```

### Error Handling

```javascript
handler: async (args) => {
  try {
    const result = await riskyOperation(args);
    return { success: true, result };
  } catch (error) {
    // Return error info (will be handled by server)
    return {
      success: false,
      error: error.message,
      code: error.code || 'UNKNOWN_ERROR'
    };
  }
}
```

### File Operations

```javascript
import fs from 'fs-extra';
import path from 'path';

export default {
  name: 'read_file',
  description: 'Read contents of a file',
  
  inputSchema: {
    type: 'object',
    properties: {
      filename: { type: 'string' }
    },
    required: ['filename']
  },
  
  handler: async (args) => {
    const filepath = path.join(process.cwd(), 'data', args.filename);
    
    // Check if file exists
    if (!await fs.pathExists(filepath)) {
      throw new Error(`File not found: ${args.filename}`);
    }
    
    // Read file
    const content = await fs.readFile(filepath, 'utf-8');
    
    return {
      filename: args.filename,
      content: content,
      size: content.length
    };
  }
};
```

## Advanced Examples

### Database Operations

```javascript
import Database from 'better-sqlite3';

export default {
  name: 'query_database',
  description: 'Execute SQL query',
  
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string' },
      params: { 
        type: 'array',
        items: { type: ['string', 'number', 'boolean', 'null'] }
      }
    },
    required: ['query']
  },
  
  handler: async (args) => {
    const db = new Database('data/app.db');
    
    try {
      const stmt = db.prepare(args.query);
      const results = stmt.all(...(args.params || []));
      
      return {
        success: true,
        rows: results,
        count: results.length
      };
    } finally {
      db.close();
    }
  }
};
```

### External API Calls

```javascript
import fetch from 'node-fetch';

export default {
  name: 'fetch_weather',
  description: 'Get weather information',
  
  inputSchema: {
    type: 'object',
    properties: {
      city: { type: 'string' },
      units: { 
        type: 'string',
        enum: ['metric', 'imperial'],
        default: 'metric'
      }
    },
    required: ['city']
  },
  
  handler: async (args) => {
    const apiKey = process.env.WEATHER_API_KEY;
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${args.city}&units=${args.units}&appid=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch weather');
    }
    
    return {
      city: data.name,
      temperature: data.main.temp,
      description: data.weather[0].description,
      humidity: data.main.humidity,
      wind_speed: data.wind.speed
    };
  }
};
```

### Long-Running Operations

```javascript
export default {
  name: 'process_batch',
  description: 'Process a batch of items',
  
  inputSchema: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: { type: 'string' }
      },
      parallel: {
        type: 'boolean',
        default: false
      }
    },
    required: ['items']
  },
  
  handler: async (args) => {
    const results = [];
    const errors = [];
    
    const processItem = async (item) => {
      try {
        // Simulate processing
        await new Promise(resolve => setTimeout(resolve, 100));
        return { item, status: 'processed' };
      } catch (error) {
        return { item, status: 'failed', error: error.message };
      }
    };
    
    if (args.parallel) {
      // Process in parallel
      const promises = args.items.map(processItem);
      const allResults = await Promise.allSettled(promises);
      
      allResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          errors.push({
            item: args.items[index],
            error: result.reason.message
          });
        }
      });
    } else {
      // Process sequentially
      for (const item of args.items) {
        const result = await processItem(item);
        if (result.status === 'processed') {
          results.push(result);
        } else {
          errors.push(result);
        }
      }
    }
    
    return {
      processed: results.length,
      failed: errors.length,
      results,
      errors
    };
  }
};
```

## Best Practices

1. **Naming Convention**: Use snake_case for tool names
2. **Descriptions**: Write clear, concise descriptions
3. **Error Handling**: Always handle errors gracefully
4. **Validation**: Use input schema to validate parameters
5. **Return Values**: Return consistent, well-structured data
6. **Logging**: Use console.error for debug logging (respects debug flag)
7. **Resources**: Clean up resources (close files, databases, etc.)
8. **Timeouts**: Implement timeouts for long-running operations
9. **Documentation**: Document complex tools with examples
10. **Testing**: Write tests for your custom tools

## Testing Your Tools

```javascript
// tests/custom-tool.test.js
import tool from '../custom-tools/my-tool.js';

describe('my_tool', () => {
  it('should return expected result', async () => {
    const result = await tool.handler({
      param1: 'test'
    });
    
    expect(result.success).toBe(true);
    expect(result.result).toBeDefined();
  });
  
  it('should handle errors', async () => {
    const result = await tool.handler({
      param1: null // Invalid input
    });
    
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
```

## Loading Custom Tools

Place your tool files in the directory specified by `customToolsDir` in your configuration (default: `./custom-tools`).

The server will automatically:
1. Scan the directory for `.js` files
2. Import each file
3. Register tools that export a default object
4. Log any loading errors

Tools are loaded at server startup. Restart the server to load new tools.