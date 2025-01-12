import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const defaultRoutes = [
    {
        "path": "/api/users",
        "method": "GET",
        "response": {
            "users": [{
                "id": "{{faker.string.uuid}}",
                "name": "{{faker.person.fullName}}",
                "email": "{{faker.internet.email}}"
            }]
        },
        "persist": true,
        "statusCode": 200
    }
];

const defaultSettings = {
    "port": 3000,
    "cors": {
        "enabled": true,
        "origins": "*",
        "methods": ["GET", "POST", "PUT", "DELETE", "PATCH"],
        "allowHeaders": ["Content-Type", "Authorization"]
    },
    "delay": {
        "enabled": true,
        "default": 0,
        "min": 0,
        "max": 5000
    },
    "logging": {
        "enabled": true,
        "format": "[:timestamp] :method :url :status :response-time ms"
    }
};

async function setup() {
    try {
        // Ensure config directory exists
        const configDir = path.join(__dirname, '../config');
        try {
            await fs.access(configDir);
        } catch {
            await fs.mkdir(configDir, { recursive: true });
            console.log('Created config directory');
        }

        // Create default routes if not exists
        const routesPath = path.join(configDir, 'routes.json');
        try {
            await fs.access(routesPath);
            console.log('Routes configuration already exists');
        } catch {
            await fs.writeFile(
                routesPath, 
                JSON.stringify(defaultRoutes, null, 2),
                'utf8'
            );
            console.log('Created default routes configuration');
        }

        // Create default settings if not exists
        const settingsPath = path.join(configDir, 'settings.json');
        try {
            await fs.access(settingsPath);
            console.log('Settings configuration already exists');
        } catch {
            await fs.writeFile(
                settingsPath,
                JSON.stringify(defaultSettings, null, 2),
                'utf8'
            );
            console.log('Created default settings configuration');
        }

        console.log('Setup completed successfully');
    } catch (error) {
        console.error('Setup failed:', error);
        process.exit(1);
    }
}

setup();
