export function validateRouteConfig(route) {
  if (!route.path || typeof route.path !== 'string') {
    throw new Error('Route path must be a string');
  }

  if (!route.method || !['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(route.method.toUpperCase())) {
    throw new Error('Invalid HTTP method');
  }

  // Make response optional for DELETE requests
  if (route.method.toUpperCase() !== 'DELETE' && !route.response) {
    throw new Error('Response configuration is required');
  }

  if (route.statusCode && (!Number.isInteger(route.statusCode) || route.statusCode < 100 || route.statusCode > 599)) {
    throw new Error('Invalid status code');
  }

  if (route.delay && (!Number.isInteger(route.delay) || route.delay < 0)) {
    throw new Error('Delay must be a positive integer');
  }
}
