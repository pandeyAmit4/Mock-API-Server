import { SchemaValidator } from './schemaValidator.js';
import { logger, LogLevel } from './logger.js';

const schemas = new Map();

class StorageManager {
  static storage = new Map();  // Convert to static property

  // Remove instance storage since we're using static

  static setSchema(path, schema) {
    schemas.set(path, schema);
  }

  static validateData(path, data) {
    const schema = schemas.get(path);
    if (!schema) return { isValid: true };
    return SchemaValidator.validate(data, schema);
  }

  static initializeStore(path, template, count = 5) {
    const storeName = this.getStoreName(path);
    if (!this.storage.has(path) || !this.storage.get(path)[storeName]?.length) {
      // Generate multiple items using the template
      const items = Array(count).fill(null).map(() => ({
        ...template,
        id: crypto.randomUUID()
      }));
      this.storage.set(path, { [storeName]: items });
    }
    return this.getStore(path);
  }

  static normalizePath(path) {
    // Remove trailing slash and ensure /api/ prefix
    path = path.replace(/\/$/, '');
    if (!path.startsWith('/api/')) {
      path = `/api${path.startsWith('/') ? path : `/${path}`}`;
    }
    return path;
  }

  static getStoreName(path) {
    const parts = path.split('/');
    const resource = parts[parts.length - 1];
    // Ensure we have a valid resource name
    return resource ? `${resource}s` : 'items';
  }

  static getStore(path) {
    const normalizedPath = this.normalizePath(path);
    const storeName = this.getStoreName(normalizedPath);
    if (!this.storage.has(normalizedPath)) {
      this.storage.set(normalizedPath, { [storeName]: [] });
    }
    return this.storage.get(normalizedPath);
  }

  static add(path, data) {
    try {
      const validation = this.validateData(path, data);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      const store = this.getStore(path);
      const storeName = this.getStoreName(path);
      
      // Ensure store array exists
      if (!store[storeName]) {
        store[storeName] = [];
      }
      
      // Ensure ID is present
      if (!data.id) {
        data.id = crypto.randomUUID();
      }
      
      // Add the new item
      store[storeName].push(data);
      logger.debug(`Added item to ${path}`, { id: data.id });
      return data;
    } catch (error) {
      logger.error(`Error adding item to ${path}:`, error);
      throw error;
    }
  }

  static update(path, id, data) {
    const validation = this.validateData(path, data);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const store = this.getStore(path);
    const storeName = this.getStoreName(path);
    const index = store[storeName].findIndex(item => item.id === id);
    
    if (index === -1) {
      logger.warn(`Update failed: Item not found`, { path, id });
      return null;
    }

    // Preserve the original ID
    data.id = id;
    store[storeName][index] = data;
    logger.debug(`Updated item in ${path}`, { id });
    return data;
  }

  static delete(path, id) {
    const store = this.getStore(path);
    const storeName = this.getStoreName(path);
    const initialLength = store[storeName].length;
    
    store[storeName] = store[storeName].filter(item => item.id !== id);
    
    const deleted = store[storeName].length < initialLength;
    if (deleted) {
      logger.debug(`Deleted item from ${path}`, { id });
    } else {
      logger.warn(`Delete failed: Item not found`, { path, id });
    }
    
    return deleted;
  }

  static getAll(path) {
    try {
      const normalizedPath = this.normalizePath(path);
      console.log('Getting storage for:', normalizedPath);
      const storeName = this.getStoreName(normalizedPath);
      const store = this.getStore(normalizedPath);
      
      // Ensure the store has the correct structure
      if (!store[storeName]) {
        store[storeName] = [];
      }
      
      console.log('Storage data:', store);
      return store;
    } catch (error) {
      console.error('Error getting storage:', error);
      throw new Error(`Failed to get storage for ${path}: ${error.message}`);
    }
  }

  static getById(path, id) {
    console.log(`Looking for item with ID ${id} in path ${path}`);
    const store = this.getStore(path);
    const storeName = this.getStoreName(path);
    return store[storeName].find(item => item.id === id);
  }

  static reset(path, initialData = []) {
    const normalizedPath = this.normalizePath(path);
    const storeName = this.getStoreName(normalizedPath);
    
    // Handle both array and object with collection
    const data = Array.isArray(initialData) ? 
      { [storeName]: initialData } : 
      initialData;
    
    this.storage.set(normalizedPath, data);
    logger.info(`Reset storage for ${normalizedPath}`);
    return this.getStore(normalizedPath);
  }

  static preload(path, data) {
    if (Array.isArray(data)) {
      data.forEach(item => {
        const validation = this.validateData(path, item);
        if (!validation.isValid) {
          throw new Error(`Preload validation failed: ${validation.errors.join(', ')}`);
        }
      });
      return this.reset(path, data);
    }
    throw new Error('Preload data must be an array');
  }

  static resetAll() {
    this.storage.clear();
    schemas.clear();
    logger.info('Reset all storage');
  }
}

export { StorageManager };  // Export the class
