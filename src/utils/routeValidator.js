export class RouteValidator {
    static isDuplicateRoute(routes, newRoute) {
        // Bug: Method comparison should happen before toUpperCase()
        // Current: route.method.toUpperCase() could throw if method is undefined
        return routes.some(route => 
            route.path === newRoute.path && 
            route.method?.toUpperCase() === newRoute.method?.toUpperCase()
        );
    }

    static validateNewRoute(routes, newRoute) {
        if (!newRoute.path || !newRoute.method) {
            throw new Error('Route must have path and method');
        }

        if (this.isDuplicateRoute(routes, newRoute)) {
            throw new Error(`Route ${newRoute.method} ${newRoute.path} already exists`);
        }

        return true;
    }

    static validateRoutes(routes) {
        const usedPaths = new Set();

        for (const route of routes) {
            const routeKey = `${route.method.toUpperCase()}:${route.path}`;
            if (usedPaths.has(routeKey)) {
                throw new Error(`Duplicate route found: ${routeKey}`);
            }
            usedPaths.add(routeKey);
        }

        return true;
    }
}
