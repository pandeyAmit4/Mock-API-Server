import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateRouteConfig } from './validation.js';
import { generateDynamicData } from './dataGenerator.js';
import { StorageManager } from './storage.js';
import { applyDelay } from './delay.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function loadRoutes(app, routesConfig) {
    try {
        // Add route count validation
        if (!Array.isArray(routesConfig) || routesConfig.length === 0) {
            console.warn('No routes configured');
            return;
        }

        // Track route metrics
        const metrics = {
            total: routesConfig.length,
            loaded: 0,
            failed: 0,
            duplicates: 0
        };

        console.log('Loading routes from configuration');
        
        if (!Array.isArray(routesConfig)) {
            throw new Error('Routes configuration must be an array');
        }
        
        console.log('Found routes:', routesConfig.length);
        const registeredRoutes = new Set();

        for (const route of routesConfig) {
            try {
                // Ensure path starts with /
                const path = route.path.startsWith('/') ? route.path : `/${route.path}`;
                console.log('\nProcessing route:', {
                    path: path,
                    method: route.method,
                    persist: route.persist,
                    hasResponse: !!route.response,
                    hasSchema: !!route.schema
                });
                
                validateRouteConfig(route);
                
                const routeKey = `${route.method.toUpperCase()}:${path}`;
                if (registeredRoutes.has(routeKey)) {
                    console.warn(`Skipping duplicate route: ${routeKey}`);
                    metrics.duplicates++;
                    continue;
                }

                registeredRoutes.add(routeKey);

                // Register route handler with normalized path
                app[route.method.toLowerCase()](path, async (req, res) => {
                    try {
                        // Handle error simulation
                        if (route.error?.enabled) {
                            const shouldError = Math.random() * 100 <= route.error.probability;
                            if (shouldError) {
                                return res.status(route.error.status).json({
                                    error: true,
                                    message: route.error.message
                                });
                            }
                        }

                        // Apply delay if specified
                        if (route.delay) {
                            await new Promise(resolve => setTimeout(resolve, route.delay));
                        }

                        let responseData;
                        // Normalize base path for storage
                        const basePath = path.split(':')[0].replace(/\/$/, '');

                        if (route.persist) {
                            switch (route.method.toUpperCase()) {
                                case 'GET':
                                    if (req.params.id) {
                                        responseData = StorageManager.getById(basePath, req.params.id);
                                        if (!responseData) {
                                            return res.status(404).json({
                                                error: 'Not found',
                                                message: `No item found with id: ${req.params.id}`
                                            });
                                        }
                                    } else {
                                        // Initialize store with template data if empty
                                        if (route.response.products || route.response.users || route.response.posts) {
                                            const template = route.response.products?.[0] || 
                                                           route.response.users?.[0] || 
                                                           route.response.posts?.[0];
                                            const count = route.response.posts?.length || 5;
                                            StorageManager.initializeStore(basePath, generateDynamicData(template), count);
                                        }
                                        responseData = StorageManager.getAll(basePath);
                                    }
                                    break;

                                case 'POST':
                                    // Validate request body against schema if defined
                                    if (route.schema) {
                                        const validation = SchemaValidator.validate(req.body, route.schema);
                                        if (!validation.isValid) {
                                            return res.status(400).json({
                                                error: 'Validation Error',
                                                details: validation.errors
                                            });
                                        }
                                    }

                                    const storeName = basePath.split('/').pop();
                                    const collectionName = `${storeName}s`;
                                    
                                    // Initialize store if needed
                                    const store = StorageManager.getAll(basePath);
                                    if (!store[collectionName]) {
                                        store[collectionName] = [];
                                    }

                                    // Create new item with template and validated body data
                                    const template = route.response || {};
                                    const newData = {
                                        id: crypto.randomUUID(),
                                        ...generateDynamicData(template),
                                        ...req.body
                                    };

                                    responseData = StorageManager.add(basePath, newData);
                                    res.status(201);
                                    break;

                                case 'PUT':
                                    // Validate request body against schema if defined
                                    if (route.schema) {
                                        const validation = SchemaValidator.validate(req.body, route.schema);
                                        if (!validation.isValid) {
                                            return res.status(400).json({
                                                error: 'Validation Error',
                                                details: validation.errors
                                            });
                                        }
                                    }

                                    const updateData = typeof req.body === 'object' ? 
                                        { ...generateDynamicData(route.response), ...req.body } : 
                                        req.body;
                                    responseData = StorageManager.update(basePath, req.params.id, updateData);
                                    if (!responseData) {
                                        return res.status(404).json({
                                            error: 'Not found',
                                            message: `No item found with id: ${req.params.id}`
                                        });
                                    }
                                    break;

                                case 'DELETE':
                                    if (!req.params.id) {
                                        return res.status(400).json({
                                            error: 'Bad Request',
                                            message: 'ID parameter is required for DELETE operation'
                                        });
                                    }
                                    const result = StorageManager.delete(basePath, req.params.id);
                                    if (!result) {
                                        return res.status(404).json({
                                            error: 'Not Found',
                                            message: `No item found with id: ${req.params.id}`
                                        });
                                    }
                                    return res.status(204).send();

                            }
                        } else {
                            // Non-persistent route, just generate dynamic data
                            responseData = typeof route.response === 'object' ? 
                                generateDynamicData(route.response) : route.response;
                        }

                        res.status(route.statusCode || 200).json(responseData);
                    } catch (error) {
                        console.error('Route handler error:', error);
                        res.status(500).json({ 
                            error: 'Internal server error',
                            message: error.message
                        });
                    }
                });

                console.log(`Registered route: ${route.method} ${path}`);
                metrics.loaded++;
            } catch (error) {
                console.error(`Failed to load route: ${route.path}`, {
                    error: error.message,
                    route: JSON.stringify(route, null, 2)
                });
                metrics.failed++;
            }
        }

        console.log('\nAll registered routes:');
        registeredRoutes.forEach(route => console.log(`- ${route}`));

        // Log metrics after loading
        console.log('\nRoute Loading Metrics:');
        console.log(`Total Routes: ${metrics.total}`);
        console.log(`Successfully Loaded: ${metrics.loaded}`);
        console.log(`Failed to Load: ${metrics.failed}`);
        console.log(`Duplicate Routes Skipped: ${metrics.duplicates}`);

    } catch (error) {
        console.error('Fatal error loading routes:', error);
        throw error;
    }
}
