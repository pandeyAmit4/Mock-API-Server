import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { StorageManager } from './utils/storage.js';
import swaggerUi from 'swagger-ui-express';
import { generateOpenApiSpec } from './utils/openApiGenerator.js';
import { pluginSystem } from './utils/pluginSystem.js';
import { loadSettings } from './utils/settings.js';
import { loadRoutes } from './utils/routeLoader.js';
import { sampleRoutes } from './config/sampleRoutes.js';
import { logger } from './utils/logger.js';
import { requestLogger } from './middleware/requestLogger.js';
import adminRouter from './routes/admin.js';  // Updated import

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function startServer({
    port = 3000,
    routesConfig = [],
    verbose = false,
    reset = false,
    plugins = []
}) {
    const app = express();
    
    // Load routes from config file
    let loadedRoutes = [];
    try {
        const configPath = path.join(__dirname, '../config/routes.json');
        try {
            const routesData = await fs.readFile(configPath, 'utf8');
            loadedRoutes = JSON.parse(routesData);
            console.log(`Loaded ${loadedRoutes.length} routes from config`);
        } catch (error) {
            console.log('No existing routes found, using defaults');
            loadedRoutes = sampleRoutes;
            // Save sample routes as initial config
            await fs.writeFile(configPath, JSON.stringify(sampleRoutes, null, 2));
        }
    } catch (error) {
        console.error('Error loading routes:', error);
    }

    app.use(express.json());
    app.use(cors());
    app.use(requestLogger);

    // Initialize settings
    await loadSettings();
    
    // Mount admin routes with loaded configuration
    app.use('/api/admin', (req, res, next) => {
        req.routesConfig = loadedRoutes;
        next();
    }, adminRouter);

    // Admin API endpoints (must come before dynamic routes)
    app.get('/api/admin/routes', async (req, res) => {
        try {
            // First try to read from config file
            let routes = [];
            try {
                const configPath = path.join(__dirname, '../config/routes.json');
                routes = JSON.parse(await fs.readFile(configPath, 'utf8'));
            } catch (error) {
                // If file doesn't exist or is invalid, use sample routes
                console.log('Using sample routes as default configuration');
                routes = sampleRoutes;
                
                // Save sample routes to config file
                const configPath = path.join(__dirname, '../config/routes.json');
                await fs.writeFile(configPath, JSON.stringify(sampleRoutes, null, 2));
            }
            
            // Load the routes into the server
            await loadRoutes(app, routes);
            
            res.json(routes);
        } catch (error) {
            console.error('Error reading routes:', error);
            res.status(500).json({ 
                error: 'Failed to read routes',
                message: error.message 
            });
        }
    });

    app.post('/api/admin/routes', async (req, res) => {
        try {
            const configPath = path.join(__dirname, '../config/routes.json');
            await fs.writeFile(configPath, JSON.stringify(req.body, null, 2));
            // Reload routes after saving
            await loadRoutes(app, req.body);
            res.json({ message: 'Routes updated successfully' });
        } catch (error) {
            console.error('Error saving routes:', error);
            res.status(500).json({ error: 'Failed to save routes' });
        }
    });

    app.post('/api/admin/load-samples', async (req, res) => {
        try {
            const configPath = path.join(__dirname, '../config/routes.json');
            const currentRoutes = JSON.parse(await fs.readFile(configPath, 'utf8'));
            
            // Merge existing routes with samples, avoiding duplicates
            const newRoutes = [...currentRoutes];
            sampleRoutes.forEach(sample => {
                if (!newRoutes.some(r => 
                    r.path === sample.path && 
                    r.method.toUpperCase() === sample.method.toUpperCase()
                )) {
                    newRoutes.push(sample);
                }
            });

            await fs.writeFile(configPath, JSON.stringify(newRoutes, null, 2));
            await loadRoutes(app, newRoutes);
            res.json({ message: 'Sample routes loaded successfully' });
        } catch (error) {
            console.error('Error loading samples:', error);
            res.status(500).json({ error: 'Failed to load sample routes' });
        }
    });

    // Add logs endpoints
    app.get('/api/admin/logs', (req, res) => {
        try {
            const limit = parseInt(req.query.limit) || 100;
            const logs = logger.getLogs(limit);
            res.json(logs || []);
        } catch (error) {
            console.error('Logs error:', error);
            res.status(500).json({ error: 'Failed to get logs' });
        }
    });

    app.delete('/api/admin/logs', (req, res) => {
        try {
            logger.clear();
            res.json({ message: 'Logs cleared' });
        } catch (error) {
            console.error('Clear logs error:', error);
            res.status(500).json({ error: 'Failed to clear logs' });
        }
    });

    // Add storage endpoints
    app.get('/api/admin/storage/*', (req, res) => {
        try {
            const path = '/api/' + req.params[0];
            console.log('Fetching storage for:', path);
            const data = StorageManager.getAll(path);
            res.json(data);
        } catch (error) {
            console.error('Storage fetch error:', error);
            res.status(500).json({ error: 'Failed to get storage info' });
        }
    });

    app.post('/api/admin/reset/*', (req, res) => {
        try {
            const path = '/api/' + req.params[0];
            console.log('Resetting storage for:', path);
            StorageManager.reset(path);
            res.json({ 
                message: `Storage reset for ${path}`,
                count: StorageManager.getAll(path)[path.split('/').pop() + 's'].length
            });
        } catch (error) {
            console.error('Storage reset error:', error);
            res.status(500).json({ error: 'Failed to reset storage' });
        }
    });

    // Serve static files for admin interface
    app.use('/admin', express.static(path.join(__dirname, '../public/admin')));
    app.get('/admin', (req, res) => {
        res.sendFile(path.join(__dirname, '../public/admin/index.html'));
    });

    // Setup Swagger UI
    const openApiSpec = generateOpenApiSpec(loadedRoutes, { port });
    app.use('/docs', swaggerUi.serve);
    app.get('/docs', swaggerUi.setup(openApiSpec));

    // Register plugins
    plugins.forEach(plugin => pluginSystem.register(plugin));

    // Reset storage if requested
    if (reset) StorageManager.resetAll();

    // Load dynamic routes last
    await loadRoutes(app, loadedRoutes);

    // Error handling middleware
    app.use((err, req, res, next) => {
        console.error('Server error:', err);
        res.status(500).json({ error: 'Internal server error' });
    });

    // Start server
    return new Promise((resolve) => {
        const server = app.listen(port, () => {
            console.log(`Mock API Server running on port ${port}`);
            console.log(`Admin interface: http://localhost:${port}/admin`);
            console.log(`Documentation: http://localhost:${port}/docs`);
            resolve(server);
        });
    });
}
