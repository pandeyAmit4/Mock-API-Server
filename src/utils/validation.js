import { SchemaValidator } from './schemaValidator.js';

export function validateRouteConfig(route, checkSchema = false) {
    if (!route || typeof route !== 'object') {
        throw new Error('Route configuration must be an object');
    }

    if (!route.path || typeof route.path !== 'string') {
        throw new Error('Route must have a valid path');
    }

    if (!route.method || typeof route.method !== 'string') {
        throw new Error('Route must have a valid HTTP method');
    }

    // Only validate schema format, not the response data
    if (checkSchema && route.schema) {
        try {
            // Just verify the schema is valid JSON and has the correct structure
            if (typeof route.schema !== 'object') {
                const parsed = JSON.parse(route.schema);
                if (typeof parsed !== 'object') {
                    throw new Error('Schema must be a valid JSON object');
                }
            }
        } catch (error) {
            throw new Error(`Invalid schema format: ${error.message}`);
        }
    }

    return true;
}

export function validateDuplicateRoutes(routes) {
    const routeMap = new Map();
    
    routes.forEach(route => {
        const key = `${route.method.toUpperCase()}:${route.path}`;
        if (routeMap.has(key)) {
            throw new Error(`Duplicate route found: ${route.method} ${route.path}`);
        }
        routeMap.set(key, true);
    });

    return true;
}

export function validateRequestData(data, schema) {
    return SchemaValidator.validate(data, schema);
}
