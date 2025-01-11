import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadRoutes } from './utils/routeLoader.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { loadSettings, getSettings } from './utils/settings.js';
import { StorageManager } from './utils/storage.js';
import fs from 'fs/promises';
import { logger } from './utils/logger.js';
import { RouteValidator } from './utils/routeValidator.js';
import swaggerUi from 'swagger-ui-express';
import { generateOpenApiSpec } from './utils/openApiGenerator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// Admin route checker - must be first middleware
app.use((req, res, next) => {
    // Check if path is admin-related
    const isAdminPath = (
        req.path.startsWith('/admin') ||
        req.path.startsWith('/api/admin') ||
        req.path.startsWith('/node_modules')
    );
    
    // Add flag and skip logger for admin paths
    if (isAdminPath) {
        req.skipLogging = true;
    }
    next();
});

// Initialize settings
await loadSettings();
const settings = getSettings();

// Middleware
app.use(express.json());
app.use(requestLogger);  // Now requestLogger can check req.skipLogging

// Configure CORS
if (settings.cors.enabled) {
  app.use(cors({
    origin: settings.cors.origins,
    methods: settings.cors.methods,
    allowedHeaders: settings.cors.allowHeaders
  }));
}

// Serve admin panel static files and node_modules
app.use('/admin', express.static(path.join(__dirname, '../public/admin')));
app.use('/node_modules', express.static(path.join(__dirname, '../node_modules')));

// Admin API endpoints
app.use('/api/admin', (req, res, next) => {
    req.isAdminRequest = true;
    next();
});

// Admin API routes with better error handling
app.get('/api/admin/routes', async (req, res) => {
  try {
    const configPath = path.join(__dirname, '../config/routes.json');
    const routes = JSON.parse(await fs.readFile(configPath, 'utf8'));
    res.json(routes);
  } catch (error) {
    console.error('Error reading routes:', error);
    res.status(500).json({ error: 'Failed to read routes configuration' });
  }
});

app.post('/api/admin/routes', async (req, res) => {
  try {
    const configPath = path.join(__dirname, '../config/routes.json');
    const newRoutes = req.body;
    
    // Validate routes before saving
    if (!Array.isArray(newRoutes)) {
      return res.status(400).json({ error: 'Routes must be an array' });
    }

    try {
      RouteValidator.validateRoutes(newRoutes);
    } catch (validationError) {
      return res.status(400).json({ error: validationError.message });
    }

    // Pretty print JSON with 2 spaces
    await fs.writeFile(configPath, JSON.stringify(newRoutes, null, 2), 'utf8');
    
    // Reload routes
    await loadRoutes(app);
    
    res.json({ message: 'Routes updated successfully' });
  } catch (error) {
    console.error('Error updating routes:', error);
    res.status(500).json({ error: 'Failed to update routes configuration' });
  }
});

app.post('/api/admin/reset/:path', (req, res) => {
  const path = req.params.path;
  StorageManager.reset(path);
  res.json({ message: `Storage reset for ${path}` });
});

// Logs endpoint
app.get('/api/admin/logs', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const logs = logger.getLogs(limit);
  res.json(logs);
});

app.delete('/api/admin/logs', (req, res) => {
  logger.clear();
  res.json({ message: 'Logs cleared successfully' });
});

// Load routes from configuration
const configPath = path.join(__dirname, '../config/routes.json');
const routesConfig = JSON.parse(await fs.readFile(configPath, 'utf8'));
const openApiSpec = generateOpenApiSpec(routesConfig);

// Serve Swagger UI
app.use('/docs', swaggerUi.serve);
app.get('/docs', swaggerUi.setup(openApiSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: "Mock API Documentation"
}));

// Serve OpenAPI spec as JSON
app.get('/docs.json', (req, res) => {
    res.json(openApiSpec);
});

await loadRoutes(app);

// Error handling middleware
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || settings.port;
app.listen(PORT, () => {
  console.log(`Mock API Server running on port ${PORT}`);
});
