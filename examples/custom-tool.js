/**
 * Example custom tool for MCP Server
 * 
 * This demonstrates how to create a custom tool that can be loaded
 * dynamically by the MCP server.
 */

export default {
  name: 'analyze_data',
  description: 'Analyze data and generate insights',
  
  inputSchema: {
    type: 'object',
    properties: {
      data: {
        type: 'array',
        description: 'Array of data points to analyze',
        items: {
          type: 'object',
          properties: {
            value: { type: 'number' },
            timestamp: { type: 'string' }
          }
        }
      },
      metric: {
        type: 'string',
        description: 'Metric to calculate',
        enum: ['average', 'sum', 'min', 'max', 'count']
      },
      groupBy: {
        type: 'string',
        description: 'Group data by time period',
        enum: ['hour', 'day', 'week', 'month']
      }
    },
    required: ['data', 'metric']
  },

  handler: async (args) => {
    const { data, metric, groupBy } = args;
    
    if (!data || data.length === 0) {
      return {
        success: false,
        error: 'No data provided'
      };
    }

    // Calculate the requested metric
    let result;
    const values = data.map(d => d.value);
    
    switch (metric) {
      case 'average':
        result = values.reduce((a, b) => a + b, 0) / values.length;
        break;
      case 'sum':
        result = values.reduce((a, b) => a + b, 0);
        break;
      case 'min':
        result = Math.min(...values);
        break;
      case 'max':
        result = Math.max(...values);
        break;
      case 'count':
        result = values.length;
        break;
      default:
        throw new Error(`Unknown metric: ${metric}`);
    }

    // Group by time period if requested
    let groupedResults = null;
    if (groupBy) {
      groupedResults = groupDataByPeriod(data, groupBy, metric);
    }

    return {
      success: true,
      metric: metric,
      result: result,
      dataPoints: data.length,
      groupedResults: groupedResults,
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Helper function to group data by time period
 */
function groupDataByPeriod(data, period, metric) {
  // This is a simplified example - in production you'd use a library like date-fns
  const groups = {};
  
  data.forEach(point => {
    const date = new Date(point.timestamp);
    let key;
    
    switch (period) {
      case 'hour':
        key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
        break;
      case 'day':
        key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        break;
      case 'week':
        const week = Math.floor(date.getDate() / 7);
        key = `${date.getFullYear()}-${date.getMonth()}-W${week}`;
        break;
      case 'month':
        key = `${date.getFullYear()}-${date.getMonth()}`;
        break;
    }
    
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(point.value);
  });

  // Calculate metric for each group
  const results = {};
  for (const [key, values] of Object.entries(groups)) {
    switch (metric) {
      case 'average':
        results[key] = values.reduce((a, b) => a + b, 0) / values.length;
        break;
      case 'sum':
        results[key] = values.reduce((a, b) => a + b, 0);
        break;
      case 'min':
        results[key] = Math.min(...values);
        break;
      case 'max':
        results[key] = Math.max(...values);
        break;
      case 'count':
        results[key] = values.length;
        break;
    }
  }

  return results;
}