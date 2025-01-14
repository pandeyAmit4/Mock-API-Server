// ...existing code...

test('Should validate route method formats', () => {
    const routes = [];
    const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    
    validMethods.forEach(method => {
        const route = { path: '/test', method };
        assert.doesNotThrow(() => RouteValidator.validateNewRoute(routes, route));
    });

    const invalidRoute = { path: '/test', method: 'INVALID' };
    assert.throws(() => RouteValidator.validateNewRoute(routes, invalidRoute));
});

test('Should validate path parameters', () => {
    const routes = [];
    const validPaths = [
        '/api/users/:id',
        '/api/users/:userId/posts/:postId',
        '/api/items'
    ];
    
    validPaths.forEach(path => {
        const route = { path, method: 'GET' };
        assert.doesNotThrow(() => RouteValidator.validateNewRoute(routes, route));
    });
});

// ...existing code...
