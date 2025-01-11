import { SchemaValidator } from './schemaValidator.js';

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

  static getStore(path) {
    if (!storage.has(path)) {
      storage.set(path, []);
    }
    return storage.get(path);
  }

  static add(path, data) {
    const validation = this.validateData(path, data);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Remove the :id from the path for storage
    const basePath = path.replace(/\/:[^/]+$/, '');
    const store = this.getStore(basePath);
    const id = data.id || crypto.randomUUID();
    const item = { ...data, id };
    store.push(item);
    return item;
  }

  static update(path, id, data) {
    const validation = this.validateData(path, data);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Remove the :id from the path for storage
    const basePath = path.replace(/\/:[^/]+$/, '');
    const store = this.getStore(basePath);
    const index = store.findIndex(item => String(item.id) === String(id));
    if (index === -1) return null;
    
    const originalId = store[index].id;
    store[index] = { ...data, id: originalId };
    return store[index];
  }

  static delete(path, id) {
    // Remove the :id from the path for storage
    const basePath = path.replace(/\/:[^/]+$/, '');
    const store = this.getStore(basePath);
    const index = store.findIndex(item => String(item.id) === String(id));
    if (index === -1) return false;
    
    store.splice(index, 1);
    return true;
  }

  static getAll(path) {
    const store = this.getStore(path);
    // Handle different endpoints
    switch (path) {
      case '/api/users':
        return { users: store };
      case '/api/products':
        return { products: store };
      case '/api/blog-posts':
        return { posts: store };
      default:
        return store;
    }
  }

  static getById(path, id) {
    console.log(`Looking for item with ID ${id} in path ${path}`);
    // Remove the :id from the path for storage lookup
    const basePath = path.replace(/\/:[^/]+$/, '');
    console.log('Base path for storage lookup:', basePath);
    
    const store = this.getStore(basePath);
    // Convert both IDs to strings for comparison
    const item = store.find(item => String(item.id) === String(id));
    console.log('Found item:', item);
    return item;
  }

  static reset(path, initialData = []) {
    storage.set(path, [...initialData]);
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
    console.log('All storage and schemas reset');
  }
}
