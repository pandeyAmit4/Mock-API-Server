import { RouteManager } from '../../public/admin/js/routes.js';
import assert from 'assert';

async function runRouteManagerTests() {
    console.log('Starting Route Manager Tests...\n');
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

    const routeManager = new RouteManager();

    // Route Generation Tests
    test('Should generate CRUD routes correctly', () => {
        const path = '/api/products';
        const template = { name: 'Test', price: 100 };
        const schema = { name: 'string', price: 'number' };
        const formData = {
            operations: { get: true, post: true, put: true, delete: true },
            path,
            response: template,
            schema
        };

        const routes = routeManager.generateRoutes(path, 'product', template, schema, formData);
        assert.strictEqual(routes.length, 5); // GET list, GET single, POST, PUT, DELETE
        assert.ok(routes.find(r => r.method === 'GET' && r.path === path));
        assert.ok(routes.find(r => r.method === 'GET' && r.path === `${path}/:id`));
    });

    test('Should preserve error settings in generated routes', () => {
        const formData = {
            operations: { get: true },
            path: '/api/test',
            response: {},
            error: {
                enabled: true,
                probability: 30,
                status: 503
            }
        };

        const routes = routeManager.generateRoutes('/api/test', 'test', {}, null, formData);
        assert.strictEqual(routes[0].error.probability, 30);
        assert.strictEqual(routes[0].error.status, 503);
    });

    // Route Management Tests
    test('Should handle route deletion', () => {
        routeManager.routes = [
            { path: '/api/test1' },
            { path: '/api/test2' }
        ];
        routeManager.deleteRoute(0);
        assert.strictEqual(routeManager.routes.length, 1);
        assert.strictEqual(routeManager.routes[0].path, '/api/test2');
    });

    test('Should duplicate route correctly', () => {
        const originalRoute = {
            path: '/api/original',
            method: 'GET'
        };
        routeManager.routes = [originalRoute];
        routeManager.duplicateRoute(0);
        
        assert.strictEqual(routeManager.routes.length, 2);
        assert.strictEqual(routeManager.routes[1].path, '/api/original_copy');
    });

    console.log(`\nRoute Manager Test Summary: ${passedTests}/${totalTests} tests passed`);
}

runRouteManagerTests().catch(console.error);
