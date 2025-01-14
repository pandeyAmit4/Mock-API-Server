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
    // Don't convert case in the path to maintain original format
    return path;
  }

  static getStoreName(path) {
    const parts = path.split('/');
    const resource = parts[parts.length - 1].replace(/:.+/, '');
    
    // Convert both camelCase and kebab-case to lowercase plural
    const normalized = resource
      // Convert camelCase to kebab
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .toLowerCase();
    
    return normalized + 's';
  }

  static getCollectionName(path) {
    const basePath = path.split(':')[0].replace(/\/$/, '');
    const resource = basePath.split('/').pop();
    
    // Convert both camelCase and kebab-case to lowercase plural
    const normalized = resource
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .toLowerCase();
    
    return normalized + 's';
  }

  static getStore(path) {
    const collectionName = this.getStoreName(path);
    const store = this.storage.get(path) || { [collectionName]: [] };
    this.storage.set(path, store);
    return store;
  }

  static add(path, data, params = {}) {
    try {
      // Resolve path with parameters for nested routes
      const actualPath = params ? Object.entries(params).reduce(
        (p, [key, value]) => p.replace(`:${key}`, value),
        path
      ) : path;

      const store = this.getStore(actualPath);
      const collectionName = this.getStoreName(actualPath);
      
      const newItem = {
        id: crypto.randomUUID(),
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      store[collectionName].push(newItem);
      return newItem;
    } catch (error) {
      logger.error(`Error adding item to ${path}:`, error);
      throw error;
    }
  }

  static addBatch(path, items) {
    const store = this.getStore(path);
    const storeName = this.getStoreName(path);
    const newItems = items.map(item => ({
      id: crypto.randomUUID(),
      ...item,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
    store[storeName].push(...newItems);
    return newItems;
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
    const normalizedPath = this.normalizePath(path);
    const storeName = this.getStoreName(normalizedPath);
    const store = this.storage.get(normalizedPath) || { [storeName]: [] };
    return store;
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

  static query(path, filter = {}, options = {}) {
    const store = this.getStore(path);
    const storeName = this.getStoreName(path);
    let results = [...store[storeName]];

    // Apply filters
    if (Object.keys(filter).length > 0) {
      results = results.filter(item => 
        Object.entries(filter).every(([key, value]) => item[key] === value)
      );
    }

    // Apply sorting
    if (options.sort) {
      const [field, direction] = Object.entries(options.sort)[0];
      results.sort((a, b) => {
        return direction === 'asc' ? 
          (a[field] || 0) - (b[field] || 0) : 
          (b[field] || 0) - (a[field] || 0);
      });
    }

    return results;
  }
}

export { StorageManager };  // Export the class
