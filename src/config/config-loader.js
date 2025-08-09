/**
 * Configuration loader for MCP server
 * Supports JSON, environment variables, and defaults
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class ConfigLoader {
  constructor() {
    this.config = {};
    this.configPath = null;
  }

  /**
   * Load configuration from multiple sources
   * Priority: Environment > Config file > Defaults
   */
  loadConfig() {
    // 1. Load defaults
    this.config = this.getDefaults();
    
    // 2. Load from config file
    const configFile = this.findConfigFile();
    if (configFile) {
      this.loadConfigFile(configFile);
    }
    
    // 3. Override with environment variables
    this.loadEnvironmentVariables();
    
    // 4. Validate configuration
    this.validateConfig();
    
    return this.config;
  }

  /**
   * Default configuration values
   */
  getDefaults() {
    return {
      serverName: 'mcp-server',
      version: '1.0.0',
      debug: false,
      dataDir: './data',
      outputDir: './output',
      maxFileSize: 10 * 1024 * 1024, // 10MB
      timeout: 30000, // 30 seconds
      tools: {
        enabled: true,
        customToolsDir: './custom-tools'
      }
    };
  }

  /**
   * Find configuration file
   */
  findConfigFile() {
    const locations = [
      process.env.MCP_CONFIG_PATH,
      path.join(process.cwd(), 'mcp-config.json'),
      path.join(process.cwd(), 'config.json'),
      path.join(__dirname, '../../config.json'),
      '/etc/mcp-server/config.json'
    ];

    for (const location of locations) {
      if (location && fs.existsSync(location)) {
        this.configPath = location;
        return location;
      }
    }

    return null;
  }

  /**
   * Load configuration from file
   */
  loadConfigFile(filePath) {
    try {
      const fileConfig = fs.readJsonSync(filePath);
      this.config = this.deepMerge(this.config, fileConfig);
      console.error(`Loaded configuration from: ${filePath}`);
    } catch (error) {
      console.error(`Failed to load config file: ${error.message}`);
    }
  }

  /**
   * Load environment variables
   */
  loadEnvironmentVariables() {
    const envMapping = {
      'MCP_SERVER_NAME': 'serverName',
      'MCP_VERSION': 'version',
      'MCP_DEBUG': 'debug',
      'MCP_DATA_DIR': 'dataDir',
      'MCP_OUTPUT_DIR': 'outputDir',
      'MCP_MAX_FILE_SIZE': 'maxFileSize',
      'MCP_TIMEOUT': 'timeout'
    };

    for (const [envVar, configKey] of Object.entries(envMapping)) {
      if (process.env[envVar]) {
        this.setNestedValue(this.config, configKey, this.parseValue(process.env[envVar]));
      }
    }
  }

  /**
   * Validate configuration
   */
  validateConfig() {
    // Ensure required directories exist
    const dirs = [this.config.dataDir, this.config.outputDir];
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.ensureDirSync(dir);
      }
    }

    // Validate numeric values
    if (this.config.maxFileSize <= 0) {
      throw new Error('maxFileSize must be positive');
    }
    if (this.config.timeout <= 0) {
      throw new Error('timeout must be positive');
    }
  }

  /**
   * Deep merge two objects
   */
  deepMerge(target, source) {
    const output = Object.assign({}, target);
    
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    
    return output;
  }

  /**
   * Check if value is an object
   */
  isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  /**
   * Set nested value in object
   */
  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
  }

  /**
   * Parse string value to appropriate type
   */
  parseValue(value) {
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (!isNaN(value)) return Number(value);
    return value;
  }

  /**
   * Get configuration value
   */
  get(section, key, defaultValue) {
    if (key) {
      return this.config[section]?.[key] ?? defaultValue;
    }
    return this.config[section] ?? defaultValue;
  }

  /**
   * Get path with base directory
   */
  getPath(key) {
    const value = this.config[key];
    if (!value) return null;
    
    if (path.isAbsolute(value)) {
      return value;
    }
    
    return path.join(process.cwd(), value);
  }
}

export default new ConfigLoader();