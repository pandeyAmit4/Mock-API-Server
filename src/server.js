import express from 'express';
import cors from 'cors';
import { StorageManager } from './utils/storage.js';
import swaggerUi from 'swagger-ui-express';
import { generateOpenApiSpec } from './utils/openApiGenerator.js';
// ...existing imports...

export async function startServer({
    port = 3000,
    routesConfig = [],
    verbose = false,
    reset = false
}) {
    const app = express();
    
    // Enable verbose logging if requested
    if (verbose) {
        app.use((req, res, next) => {
            console.log(`${req.method} ${req.path}`);
            next();
        });
    }

    // Reset storage if requested
    if (reset) {
        StorageManager.resetAll();
    }

    // Basic middleware setup
    app.use(express.json());
    app.use(cors());

    // Generate OpenAPI spec
    const openApiSpec = generateOpenApiSpec(routesConfig);

    // Setup Swagger UI
    app.use('/docs', swaggerUi.serve);
    app.get('/docs', swaggerUi.setup(openApiSpec));

    // ... rest of your existing server setup ...

    // Start server
    return new Promise((resolve, reject) => {
        const server = app.listen(port, () => {
            console.log(`Mock API Server running on port ${port}`);
            console.log(`Documentation available at http://localhost:${port}/docs`);
            if (verbose) {
                console.log('Loaded routes:', routesConfig.map(r => `${r.method} ${r.path}`));
            }
            resolve(server);
        });
    });
}
