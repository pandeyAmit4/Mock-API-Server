import express from 'express';
import { validateRouteConfig, validateDuplicateRoutes } from '../utils/validation.js';
import { StorageManager } from '../utils/storage.js';
import { loadRoutes } from '../utils/routeLoader.js';
import { generateDynamicData } from '../utils/dataGenerator.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { sampleRoutes } from '../config/sampleRoutes.js';
import { logger } from '../utils/logger.js';
import { versionControl } from '../utils/versionControl.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();
let routesConfig = [];
let requestLogs = [];

// Initialize routes from config file
async function initializeRoutes() {
    try {
        const configPath = path.join(__dirname, '../../config/routes.json');
        const routesData = await fs.readFile(configPath, 'utf8');
        routesConfig = JSON.parse(routesData);
        console.log('Loaded routes from config:', routesConfig.length);
    } catch (error) {
        console.log('No existing routes found, using defaults');
        routesConfig = sampleRoutes;
        const configPath = path.join(__dirname, '../../config/routes.json');
        await fs.writeFile(configPath, JSON.stringify(sampleRoutes, null, 2));
    }
}

// Initialize routes when the module loads
await initializeRoutes();

// Remove the duplicate validate-route endpoint and keep only this one
router.post('/validate-route', async (req, res) => {
    console.log('Validating route:', req.body);  // Add logging
    try {
        // Ensure proper headers
        res.setHeader('Content-Type', 'application/json');

        const route = req.body;
        
        if (!route || typeof route !== 'object') {
            console.log('Invalid route object');  // Add logging
            return res.status(400).json({
                success: false,
                error: 'Invalid route configuration'
            });
        }

        // Basic route validation
        validateRouteConfig(route, true);  // Pass true to only check schema format
        
        // For route validation during save, don't check for duplicates
        if (!req.query.checkDuplicates) {
            res.json({ 
                success: true,
                message: 'Route configuration is valid'
            });
            return;
        }
        
        // Only check duplicates when explicitly requested
        const duplicateRoute = routesConfig.find(r => 
            r.path === route.path && 
            r.method.toUpperCase() === route.method.toUpperCase()
        );
        
        if (duplicateRoute) {
            return res.status(400).json({
                success: false,
                error: `Route ${route.method} ${route.path} already exists`
            });
        }

        console.log('Route validation successful');  // Add logging
        res.json({ 
            success: true,
            message: 'Route configuration is valid'
        });
    } catch (error) {
        console.error('Validation error:', error);  // Add logging
        res.status(400).json({ 
            success: false,
            error: error.message || 'Validation failed'
        });
    }
});

// Get all routes
router.get('/routes', (req, res) => {
    console.log('Current routes:', routesConfig.length);  // Debug log
    res.json(routesConfig);
});

// Save routes with enhanced validation
router.post('/routes', async (req, res) => {
    try {
        const routes = req.body;
        const configPath = path.join(__dirname, '../../config/routes.json');
        
        if (!Array.isArray(routes)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Routes must be an array' 
            });
        }
        
        // Validate all routes
        routes.forEach(route => validateRouteConfig(route, true));
        
        // Check for duplicates
        validateDuplicateRoutes(routes);
        
        // Update routes configuration first
        routesConfig = routes;
        
        // Save to config file
        await fs.writeFile(configPath, JSON.stringify(routes, null, 2));
        
        // Reload routes in the server - this is crucial for updates to take effect
        await loadRoutes(req.app, routes);
        
        res.json({ 
            success: true, 
            message: 'Routes updated and saved successfully',
            count: routes.length
        });
    } catch (error) {
        console.error('Failed to save routes:', error);
        res.status(400).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Update the load-samples endpoint
router.post('/load-samples', async (req, res) => {
    try {
        const configPath = path.join(__dirname, '../../config/routes.json');

        // Validate sample routes
        sampleRoutes.forEach(validateRouteConfig);
        
        // Add to existing routes
        routesConfig = [...routesConfig, ...sampleRoutes];
        
        // Save updated config to file
        await fs.writeFile(configPath, JSON.stringify(routesConfig, null, 2));
        
        // Reload routes in the server
        await loadRoutes(req.app, routesConfig);
        
        res.json({ 
            success: true, 
            message: 'Sample routes loaded successfully',
            count: sampleRoutes.length
        });
    } catch (error) {
        console.error('Error loading samples:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to load sample routes',
            message: error.message 
        });
    }
});

// Get storage info for a resource
router.get('/storage/:resource', (req, res) => {
    try {
        const resource = req.params.resource;
        const path = `/api/${resource}`; // Ensure proper path format
        console.log('Fetching storage for path:', path);
        const data = StorageManager.getAll(path); // Using static method
        // console.log('Storage data:', data);
        
        if (!data || !data[`${resource}s`]) {
            // Return empty collection if no data exists
            return res.json({ [`${resource}s`]: [] });
        }
        
        res.json(data);
    } catch (error) {
        console.error('Storage fetch error:', error);
        res.status(500).json({ error: true, message: error.message });
    }
});

// Reset storage for a resource
router.post('/reset/:resource', (req, res) => {
    try {
        const resource = req.params.resource;
        const path = `/api/${resource}`;
        const route = routesConfig.find(r => r.path === path);
        
        if (!route) {
            throw new Error(`Route not found for resource: ${resource}`);
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
        StorageManager.reset(path, { [`${resource}s`]: initialData });
        
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
    try {
        const logs = logger.getLogs();
        // console.log('Sending logs:', logs.length);  // Debug log
        res.json(logs || []);
    } catch (error) {
        console.error('Error fetching logs:', error);
        res.status(500).json({ error: true, message: error.message });
    }
});

// Clear logs
router.delete('/logs', (req, res) => {
    try {
        logger.clear();
        res.json({ success: true, message: 'Logs cleared successfully' });
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
});

// Add version control endpoints
router.get('/versions', (req, res) => {
    try {
        const history = versionControl.getVersionHistory();
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/versions', async (req, res) => {
    try {
        const { routes, description } = req.body;
        const version = await versionControl.saveVersion(routes, description);
        res.json(version);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/versions/:hash/rollback', async (req, res) => {
    try {
        const routes = await versionControl.rollback(req.params.hash);
        
        // Update config file
        const configPath = path.join(__dirname, '../../config/routes.json');
        await fs.writeFile(configPath, JSON.stringify(routes, null, 2));
        
        // Reload routes
        await loadRoutes(req.app, routes);
        
        res.json(routes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/versions/:hash/diff', async (req, res) => {
    try {
        const currentVersion = versionControl.getCurrentVersion();
        const diff = versionControl.diffVersions(currentVersion.hash, req.params.hash);
        res.json(diff);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
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
    
// Can also keep default export if needed
    next();
});

// Export both named and default
export const adminRouter = router;
export default router;
