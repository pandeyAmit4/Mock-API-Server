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

  // Validate error configuration if present
  if (route.error) {
    if (typeof route.error.enabled !== 'boolean') {
      throw new Error('Error simulation enabled must be a boolean');
    }

    if (route.error.enabled) {
      if (typeof route.error.probability !== 'number' || 
          route.error.probability < 0 || 
          route.error.probability > 100) {
        throw new Error('Error probability must be between 0 and 100');
      }

      if (!route.error.status || 
          !Number.isInteger(route.error.status) || 
          route.error.status < 100 || 
          route.error.status > 599) {
        throw new Error('Invalid error status code');
      }

      if (!route.error.message || typeof route.error.message !== 'string') {
        throw new Error('Error message must be a non-empty string');
      }
    }
  }
}
