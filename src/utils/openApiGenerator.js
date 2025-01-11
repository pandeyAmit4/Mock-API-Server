import { getSettings } from './settings.js';

export function generateOpenApiSpec(routes) {
    const settings = getSettings();
    const spec = {
        openapi: '3.0.0',
        info: {
            title: 'Mock API Documentation',
            version: '1.0.0',
            description: 'Automatically generated API documentation from routes configuration'
        },
        servers: [{
            url: `http://localhost:${settings.port}`,
            description: 'Mock API Server'
        }],
        paths: {},
        components: {
            schemas: {}
        }
    };

    routes.forEach(route => {
        const path = route.path;
        if (!spec.paths[path]) {
            spec.paths[path] = {};
        }

        const method = route.method.toLowerCase();
        const operation = {
            summary: `${route.method} ${path}`,
            responses: {
                [route.statusCode || 200]: {
                    description: 'Successful response',
                    content: {
                        'application/json': {
                            schema: generateResponseSchema(route.response)
                        }
                    }
                }
            }
        };

        // Add error responses if error simulation is enabled
        if (route.error?.enabled) {
            operation.responses[route.error.status] = {
                description: route.error.message,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                error: { type: 'boolean' },
                                message: { type: 'string' }
                            }
                        }
                    }
                }
            };
        }

        // Add request body for POST/PUT methods
        if (['post', 'put'].includes(method) && route.schema) {
            operation.requestBody = {
                required: true,
                content: {
                    'application/json': {
                        schema: convertSchemaToOpenApi(route.schema)
                    }
                }
            };
        }

        // Add path parameters
        const pathParams = extractPathParams(path);
        if (pathParams.length > 0) {
            operation.parameters = pathParams.map(param => ({
                name: param,
                in: 'path',
                required: true,
                schema: {
                    type: 'string'
                }
            }));
        }

        spec.paths[path][method] = operation;
    });

    return spec;
}

function generateResponseSchema(response) {
    if (!response) return { type: 'object' };

    const schema = {
        type: 'object',
        properties: {}
    };

    Object.entries(response).forEach(([key, value]) => {
        if (Array.isArray(value)) {
            schema.properties[key] = {
                type: 'array',
                items: generateResponseSchema(value[0])
            };
        } else if (typeof value === 'object' && value !== null) {
            schema.properties[key] = generateResponseSchema(value);
        } else if (typeof value === 'string' && value.includes('{{faker')) {
            // Handle Faker.js patterns
            schema.properties[key] = {
                type: 'string',
                example: value.replace(/{{faker\.(.*?)}}/, '$1')
            };
        } else {
            schema.properties[key] = {
                type: typeof value
            };
        }
    });

    return schema;
}

function convertSchemaToOpenApi(schema) {
    const openApiSchema = {
        type: 'object',
        properties: {},
        required: []
    };

    Object.entries(schema).forEach(([field, type]) => {
        if (type !== 'auto') {
            openApiSchema.properties[field] = {
                type: type === 'number' ? 'number' : type
            };
            openApiSchema.required.push(field);
        }
    });

    return openApiSchema;
}

function extractPathParams(path) {
    const params = [];
    const matches = path.match(/:[a-zA-Z]+/g);
    if (matches) {
        matches.forEach(match => {
            params.push(match.substring(1));
        });
    }
    return params;
}
