import assert from 'assert';
import { generateOpenApiSpec } from '../utils/openApiGenerator.js';

async function runOpenApiTests() {
    console.log('Starting OpenAPI Tests...\n');
    let totalTests = 0;
    let passedTests = 0;

    function test(name, fn) {
        totalTests++;
        try {
            fn();
            console.log(`✅ ${name}`);
            passedTests++;
        } catch (error) {
            console.error(`❌ ${name}`);
            console.error('Error:', error.message);
        }
    }

    // Sample route for testing
    const sampleRoute = {
        path: '/api/test/:id',
        method: 'GET',
        response: {
            id: '{{faker.string.uuid}}',
            name: '{{faker.person.fullName}}'
        },
        error: {
            enabled: true,
            probability: 25,
            status: 503,
            message: 'Service Unavailable'
        }
    };

    test('Should generate valid OpenAPI spec', () => {
        const spec = generateOpenApiSpec([sampleRoute]);
        assert.ok(spec.openapi);
        assert.ok(spec.paths['/api/test/:id']);
    });

    test('Should include path parameters', () => {
        const spec = generateOpenApiSpec([sampleRoute]);
        const pathItem = spec.paths['/api/test/:id'].get;
        assert.ok(pathItem.parameters);
        assert.ok(pathItem.parameters.find(p => p.name === 'id'));
    });

    test('Should include error responses', () => {
        const spec = generateOpenApiSpec([sampleRoute]);
        const responses = spec.paths['/api/test/:id'].get.responses;
        assert.ok(responses['503']);
    });

    test('Should handle nested response schemas', () => {
        const nestedRoute = {
            path: '/api/nested',
            method: 'GET',
            response: {
                user: {
                    id: '{{faker.string.uuid}}',
                    profile: {
                        name: '{{faker.person.fullName}}'
                    }
                }
            }
        };
        const spec = generateOpenApiSpec([nestedRoute]);
        const schema = spec.paths['/api/nested'].get.responses['200'].content['application/json'].schema;
        assert.ok(schema.properties.user.properties.profile);
    });

    test('Should handle array responses', () => {
        const arrayRoute = {
            path: '/api/array',
            method: 'GET',
            response: {
                items: [{
                    id: '{{faker.string.uuid}}'
                }]
            }
        };
        const spec = generateOpenApiSpec([arrayRoute]);
        const schema = spec.paths['/api/array'].get.responses['200'].content['application/json'].schema;
        assert.ok(schema.properties.items.type === 'array');
    });

    // Test Summary
    console.log(`\nOpenAPI Test Summary: ${passedTests}/${totalTests} tests passed`);
}

runOpenApiTests().catch(console.error);
