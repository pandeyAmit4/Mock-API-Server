import express from 'express';
import { validateRouteConfig, validateDuplicateRoutes } from '../utils/validation.js';
import { SchemaValidator } from '../utils/schemaValidator.js';
import { RouteValidator } from '../utils/routeValidator.js';
import { StorageManager } from '../utils/storage.js';
import { loadRoutes } from '../utils/routeLoader.js';
import { generateDynamicData } from '../utils/dataGenerator.js';
import path from 'path';
import fs from 'fs/promises';

const router = express.Router();
let routesConfig = [];
let requestLogs = [];

// Get all routes
router.get('/routes', (req, res) => {
    res.json(routesConfig);
});

// Save routes with enhanced validation
router.post('/routes', async (req, res) => {
    try {
        const routes = req.body;
        
        // Validate all routes' basic configuration
        routes.forEach(validateRouteConfig);
        
        // Validate schemas if present
        routes.forEach(route => {
            if (route.schema && route.response) {
                const validation = SchemaValidator.validate(route.response, route.schema);
                if (!validation.isValid) {
                    throw new Error(`Schema validation failed for ${route.method} ${route.path}: ${validation.errors.join(', ')}`);
                }
            }
        });
        
        // Check for duplicate routes using RouteValidator
        if (!RouteValidator.validateRoutes(routes)) {
            throw new Error('Duplicate routes found');
        }
        
        // Save routes configuration
        routesConfig = routes;
        
        // Reload routes in the server
        await loadRoutes(req.app, routes);
        
        res.json({ success: true, message: 'Routes updated successfully' });
    } catch (error) {
        res.status(400).json({ error: true, message: error.message });
    }
});

// Validate single route with enhanced validation
router.post('/validate-route', (req, res) => {
    try {
        const route = req.body;
        
        // Validate basic route configuration
        validateRouteConfig(route);
        
        // Additional schema validation if schema is present
        if (route.schema && route.response) {
            const validation = SchemaValidator.validate(route.response, route.schema);
            if (!validation.isValid) {
                throw new Error(`Schema validation failed: ${validation.errors.join(', ')}`);
            }
        }
        
        // Check for route conflicts
        if (routesConfig.length > 0 && RouteValidator.isDuplicateRoute(routesConfig, route)) {
            throw new Error(`Route ${route.method} ${route.path} conflicts with existing route`);
        }
        
        res.json({ valid: true });
    } catch (error) {
        res.status(400).json({ error: true, message: error.message });
    }
});

// Load sample routes
router.post('/load-samples', async (req, res) => {
    try {
        const samplesPath = path.join(process.cwd(), 'samples', 'routes.json');
        const samplesData = await fs.readFile(samplesPath, 'utf-8');
        const sampleRoutes = JSON.parse(samplesData);
        
        // Validate sample routes
        sampleRoutes.forEach(validateRouteConfig);
        
        // Add to existing routes
        routesConfig = [...routesConfig, ...sampleRoutes];
        
        // Reload routes in the server
        await loadRoutes(req.app, routesConfig);
        
        res.json({ success: true, message: 'Sample routes loaded successfully' });
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
});

// Get storage info for a resource
router.get('/storage/:resource', (req, res) => {
    try {
        const data = StorageManager.getAll(req.params.resource);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
});

// Reset storage for a resource
router.post('/reset/:resource', (req, res) => {
    try {
        const resource = req.params.resource;
        const route = routesConfig.find(r => r.path === `/api/${resource}`);
        
        if (!route) {
            throw new Error('Route not found');
        }
        
        // Generate initial data if template exists
        let initialData = [];
        if (route.response) {
            const template = route.response[`${resource}s`]?.[0];
            if (template) {
                initialData = Array(5).fill(null).map(() => ({
                    id: crypto.randomUUID(),
                    ...generateDynamicData(template)
                }));
            }
        }
        
        // Reset storage with initial data
        StorageManager.reset(resource, { [`${resource}s`]: initialData });
        
        res.json({ 
            success: true, 
            message: 'Storage reset successfully',
            count: initialData.length
        });
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
});

// Get request logs
router.get('/logs', (req, res) => {
    res.json(requestLogs);
});

// Clear logs
router.delete('/logs', (req, res) => {
    requestLogs = [];
    res.json({ success: true, message: 'Logs cleared successfully' });
});

// Middleware to log requests
router.use((req, res, next) => {
    const startTime = Date.now();
    
    // Capture the original end function
    const originalEnd = res.end;
    
    // Override the end function
    res.end = function(...args) {
        const responseTime = Date.now() - startTime;
        
        // Add log entry
        requestLogs.unshift({
            timestamp: new Date().toISOString(),
            method: req.method,
            url: req.url,
            status: res.statusCode,
            responseTime,
            ip: req.ip,
            headers: req.headers,
            body: req.body,
            query: req.query,
            params: req.params
        });
        
        // Limit logs array size
        if (requestLogs.length > 1000) {
            requestLogs = requestLogs.slice(0, 1000);
        }
        
        // Call the original end function
        originalEnd.apply(res, args);
    };
    
    next();
});

export default router;
