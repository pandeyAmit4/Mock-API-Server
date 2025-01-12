import { SchemaValidator } from './schemaValidator.js';
import { logger, LogLevel } from './logger.js';

const storage = new Map();
const schemas = new Map();

export class StorageManager {
  static setSchema(path, schema) {
    schemas.set(path, schema);
  }

  static validateData(path, data) {
    const schema = schemas.get(path);
    if (!schema) return { isValid: true };
    return SchemaValidator.validate(data, schema);
  }

  static initializeStore(path, template, count = 5) {
    if (!storage.has(path) || storage.get(path).length === 0) {
      // Generate multiple items using the template
      const items = Array(count).fill(null).map(() => ({
        ...template,
        id: crypto.randomUUID()
      }));
      storage.set(path, items);
    }
    return this.getStore(path);
  }

  static getStoreName(path) {
    const parts = path.split('/');
    return parts[parts.length - 1] + 's';
  }

  static getStore(path) {
    const storeName = this.getStoreName(path);
    if (!storage.has(path)) {
      storage.set(path, { [storeName]: [] });
    }
    return storage.get(path);
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
    return this.getStore(path);
  }

  static getById(path, id) {
    console.log(`Looking for item with ID ${id} in path ${path}`);
    const store = this.getStore(path);
    const storeName = this.getStoreName(path);
    return store[storeName].find(item => item.id === id);
  }

  static reset(path, initialData = []) {
    const storeName = this.getStoreName(path);
    storage.set(path, { [storeName]: [...initialData] });
    logger.info(`Reset storage for ${path}`);
    return this.getStore(path);
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
    storage.clear();
    schemas.clear();
    logger.info('Reset all storage');
  }
}
