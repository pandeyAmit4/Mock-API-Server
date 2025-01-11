import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateRouteConfig } from './validation.js';
import { generateDynamicData } from './dataGenerator.js';
import { StorageManager } from './storage.js';
import { applyDelay } from './delay.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function loadRoutes(app) {
  try {
    const configPath = path.join(__dirname, '../../config/routes.json');
    console.log('Loading routes from:', configPath);
    
    const routesConfig = JSON.parse(await fs.readFile(configPath, 'utf8'));
    console.log('Found routes:', routesConfig.length);
    
    const usedPaths = new Set();

    for (const route of routesConfig) {
      try {
        console.log('Processing route:', route.path, route.method);
        validateRouteConfig(route);
        
        const { 
          path: routePath, 
          method, 
          response, 
          statusCode = 200, 
          delay = 0, 
          persist = false,
          schema,
          modify 
        } = route;
        const routeKey = `${method.toUpperCase()}:${routePath}`;

        if (usedPaths.has(routeKey)) {
          console.warn(`Duplicate route found: ${routeKey}. Skipping...`);
          continue;
        }

        usedPaths.add(routeKey);
        console.log('Registering route handler for:', routeKey);

        // Register schema if provided
        if (schema) {
          StorageManager.setSchema(routePath, schema);
        }

        app[method.toLowerCase()](routePath, async (req, res) => {
          console.log('Handling request for:', routeKey, 'params:', req.params);
          try {
            // Apply route-specific delay
            await applyDelay(delay);

            let responseData = response;

            if (persist) {
              // Get the base path without parameters for storage
              const basePath = routePath.split(':')[0].replace(/\/$/, '');
              console.log('Base path for storage:', basePath);

              switch (method.toUpperCase()) {
                case 'GET':
                  if (req.params.id) {
                    const item = StorageManager.getById(basePath, req.params.id);
                    console.log('Found item:', item);
                    if (!item) {
                      return res.status(404).json({ 
                        error: 'Not found',
                        message: `No item found with id: ${req.params.id}`
                      });
                    }
                    responseData = item;
                  } else {
                    // Initialize with template data if empty
                    if (response.products || response.users || response.posts) {
                      const template = (response.products?.[0] || response.users?.[0] || response.posts?.[0]);
                      const count = response.posts?.length || 5; // Use template array length or default to 5
                      StorageManager.initializeStore(basePath, generateDynamicData(template), count);
                    }
                    responseData = StorageManager.getAll(basePath);
                  }
                  break;
                case 'POST':
                  // Generate dynamic data first for new items
                  const newData = typeof req.body === 'object' ? 
                    { ...generateDynamicData(response), ...req.body } : 
                    req.body;
                  try {
                    responseData = StorageManager.add(basePath, newData);
                  } catch (validationError) {
                    return res.status(400).json({ 
                      error: 'Validation Error',
                      message: validationError.message 
                    });
                  }
                  break;
                case 'PUT':
                  // Merge dynamic data with request body
                  const updateData = typeof req.body === 'object' ? 
                    { ...generateDynamicData(response), ...req.body } : 
                    req.body;
                  try {
                    responseData = StorageManager.update(basePath, req.params.id, updateData);
                  } catch (validationError) {
                    return res.status(400).json({ 
                      error: 'Validation Error',
                      message: validationError.message 
                    });
                  }
                  if (!responseData) {
                    return res.status(404).json({ 
                      error: 'Not found',
                      message: `No item found with id: ${req.params.id}`
                    });
                  }
                  break;
                case 'DELETE':
                  const deleted = StorageManager.delete(basePath, req.params.id);
                  if (!deleted) {
                    return res.status(404).json({ 
                      error: 'Not found',
                      message: `No item found with id: ${req.params.id}`
                    });
                  }
                  // Send response message before ending connection
                  return res.status(statusCode).json(responseData);
              }
            } else if (typeof responseData === 'object') {
              responseData = generateDynamicData(responseData);
            }

            res.status(statusCode).json(responseData);
          } catch (error) {
            console.error('Request handling error:', error);
            res.status(500).json({ 
              error: 'Internal Server Error',
              message: error.message 
            });
          }
        });

        console.log(`Route loaded successfully: ${method.toUpperCase()} ${routePath}`);
      } catch (routeError) {
        console.error(`Failed to load route: ${route.path}`, routeError.message);
      }
    }

    // Log all registered routes
    console.log('All registered routes:');
    usedPaths.forEach(route => console.log(`- ${route}`));

  } catch (error) {
    console.error('Error loading routes:', error);
    throw error;
  }
}
