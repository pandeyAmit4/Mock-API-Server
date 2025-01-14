# Mock API Server

A flexible and feature-rich mock API server for development and testing.

## Table of Contents
- [Features](#features)
- [Quick Start](#quick-start)
- [Configuration Guide](#configuration-guide)
- [Admin Panel](#admin-panel)
- [API Reference](#api-reference)
- [Data Generation](#data-generation)
- [Schema Validation](#schema-validation)
- [Storage Management](#storage-management)
- [Error Handling](#error-handling)
- [Development Guide](#development-guide)
- [API Documentation](#api-documentation)
- [CLI Usage](#cli-usage)

## Features

### Core Features
### Core Features
- 🚀 Real-time route management via modern admin UI
- 📊 Dynamic data generation with Faker.js
- 🔄 Persistent data storage with auto-save
- 🔍 Schema validation
- 🚨 Customizable error simulation
- 📝 Request logging with advanced filtering
- 📜 Version control for routes
- 💾 Import/Export configurations

### Dynamic Data Generation
- Integration with Faker.js for realistic data
- Template-based response generation
- Support for nested objects and arrays
- Custom field handlers for specific data types
- Automatic ID generation for new items

### Error Simulation
- Configurable error responses
- Probability-based error triggering
- Custom error messages and status codes
- Per-route error configuration

### API Documentation
- Interactive API documentation via Swagger UI
- OpenAPI 3.0.0 specification
- Automatic documentation generation from routes
- Real-time API testing interface
- Example response schemas
- Error simulation documentation

## Quick Start

```bash
# Install dependencies
npm install

# Start the server
npm start

# Access admin panel
open http://localhost:3000/admin
```

## Configuration Guide

### Server Settings (config/settings.json)
```json
{
  "port": 3000,
  "cors": {
    "enabled": true,
    "origins": "*",           // Use array ["domain1", "domain2"] for specific domains
    "methods": ["GET", "POST", "PUT", "DELETE", "PATCH"],
    "allowHeaders": ["Content-Type", "Authorization"]
  },
  "delay": {
    "enabled": true,         // Master switch for delays
    "default": 0,           // Default delay in milliseconds
    "min": 0,              // Minimum allowed delay
    "max": 5000           // Maximum allowed delay
  },
  "logging": {
    "enabled": true,
    "format": "[:timestamp] :method :url :status :response-time ms"
  }
}
```

### Route Configuration (config/routes.json)
Full example with all available options:
```json
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
  "schema": {
    "name": "string",
    "email": "string"
  },
  "error": {
    "enabled": true,
    "probability": 25,
    "status": 503,
    "message": "Service Unavailable"
  }
}
```

### Error Simulation Configuration
```json
{
  "error": {
    "enabled": true,      // Enable/disable error simulation
    "probability": 25,    // Percentage chance (0-100)
    "status": 503,       // HTTP status code
    "message": "Custom error message"
  }
}
```

### Admin Interface
1. Route Management
   - Visual route editor
   - Route filtering and search
   - Batch operations
   - Sample routes loading
   - Schema validation
   - Error simulation settings
   - Auto-save warning

2. Storage Management
   - Per-endpoint data management
   - Data reset capabilities
   - Storage inspection
   - Storage statistics
   - Persistent data control

3. Version Control
   - Automatic versioning
   - Visual diff viewer
   - Version rollback
   - Version metadata

4. Request Logs
   - Real-time log updates
   - Advanced filtering:
     - Status codes
     - HTTP methods
     - Time ranges
     - Text search
   - Expandable log details
   - Log export
   - Auto-refresh

### Usage
1. Access: `http://localhost:3000/admin`
2. Routes Tab:
   - Click "Add New Route" for new routes
   - Edit JSON directly in the text area
   - Click "Save Changes" to apply
   - Red save button indicates unsaved changes

3. Storage Tab:
   - Use reset buttons to clear specific endpoint data
   - All operations are immediate

4. Log Viewer:
   - Real-time log updates
   - Filter by:
     - Status (success/error)
     - HTTP method
     - Time range (5m, 15m, 1h, 24h)
     - Text search
   - Expandable log details
   - Export filtered logs
   - Clear logs functionality

## API Reference

### Admin API Endpoints
```
GET    /api/admin/routes   - Get all routes
POST   /api/admin/routes   - Update routes
GET    /api/admin/logs     - Get request logs
DELETE /api/admin/logs     - Clear logs
GET    /api/admin/versions - Get version history
POST   /api/admin/versions - Save new version
POST   /api/admin/versions/:hash/rollback - Rollback to version
```

### Dynamic Route Parameters
- `:id` - URL parameter (e.g., /api/users/:id)
- Query parameters are automatically available
- Request body is parsed for POST/PUT

## Data Generation

### Faker.js Patterns
```javascript
// Simple value
"name": "{{faker.person.fullName}}"

// With parameters
"rating": "{{faker.number.float({ min: 1, max: 5, precision: 0.1 })}}"

// Nested objects
"user": {
  "id": "{{faker.string.uuid}}",
  "email": "{{faker.internet.email}}"
}

// Arrays
"tags": ["{{faker.lorem.word}}", "{{faker.lorem.word}}"]
```

### Common Faker Methods
- `string.uuid` - Generate UUID
- `person.fullName` - Generate name
- `internet.email` - Generate email
- `date.recent` - Generate date
- `number.int/float` - Generate numbers
- `commerce.productName` - Generate product names
- `image.url` - Generate image URLs

## Schema Validation

### Available Types
```json
{
  "schema": {
    "id": "auto",            // Auto-generated field
    "name": "string",        // String validation
    "age": "number",         // Number validation
    "active": "boolean",     // Boolean validation
    "email": "string"        // String validation
  }
}
```
## Storage Management

### Persistence Options
```json
{
  "persist": true,           // Enable storage
  "persist": false          // Generate new data each time
}
```

## Error Handling

### HTTP Status Codes
- 200: Success
- 201: Created
- 204: No Content (DELETE)
- 400: Validation Error
- 404: Not Found
- 500: Server Error

### Error Response Format
```json
{
  "error": "Error type",
  "message": "Detailed error message"
}
```

## Development Guide

### Testing
```bash
# Run all tests
npm test

# Watch mode
npm run test:watch
```

## CLI Usage

Start server:
```bash
# Basic usage
mock-server start

# Custom config file
mock-server start --config my-routes.json

# Custom port
mock-server start --port 8080

# Verbose logging
mock-server start --verbose

# Reset in-memory data
mock-server start --reset
```

### CLI Options

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| --config | -c | Routes configuration file | routes.json |
| --port | -p | Port number | 3000 |
| --verbose | -v | Enable verbose logging | false |
| --reset | -r | Reset in-memory data | false |

## API Documentation

### Swagger UI
Access the interactive API documentation at:
```
http://localhost:3000/docs
```

### OpenAPI Specification
Raw OpenAPI spec available at:
```
http://localhost:3000/docs.json
```

### Features
- Interactive API testing interface
- Request/response schema documentation
- Error simulation documentation
- Path parameter documentation
- Example values from Faker.js patterns
- Response codes and error states
- Authentication requirements (if configured)

### Documentation Generation
The OpenAPI specification is automatically generated from your routes configuration, including:
- Path parameters
- Query parameters
- Request bodies
- Response schemas
- Error responses
- Example values
- Validation rules

## Plugin System

### Using Plugins
```javascript
import { AuthPlugin } from 'mock-api-server/plugins/AuthPlugin';

const server = await startServer({
    port: 3000,
    plugins: [
        new AuthPlugin({ apiKey: 'your-api-key' })
    ]
});
```

### Creating Custom Plugins
```javascript
import { BasePlugin } from 'mock-api-server/plugins/BasePlugin';

class LoggingPlugin extends BasePlugin {
    constructor(options = {}) {
        super('logging-plugin', options);
        
        this.hooks = {
            beforeRequest: (req, res, next) => {
                console.log(`${req.method} ${req.path}`);
                next();
            },
            afterRequest: (req, res) => {
                console.log(`Response sent: ${res.statusCode}`);
            }
        };
    }
}
```

### Available Hooks
- `beforeRequest`: Before request processing
- `afterRequest`: After response sent
- `beforeResponse`: Before sending response
- `onError`: On error handling
- `onRouteLoad`: When routes are loaded
- `customMiddleware`: Add custom Express middleware

### Plugin Configuration
```javascript
{
    name: 'plugin-name',    // Required
    options: {},           // Plugin-specific options
    hooks: {              // Optional hooks
        beforeRequest: (req, res, next) => {},
        afterRequest: (req, res) => {},
        beforeResponse: (req, res, data) => {},
        onError: (error, req, res) => {},
        onRouteLoad: (route) => {}
    }
}
```

### Contributing
1. Fork repository
2. Create feature branch
3. Update tests
4. Submit pull request

## License

MIT License

### Route Configuration
Example with all features:
```json
{
  "path": "/api/example",
  "method": "GET",
  "response": { "message": "Example response" },
  "persist": false,
  "statusCode": 200,
  "delay": 1000,
  "error": {
    "enabled": true,
    "probability": 25,
    "status": 503,
    "message": "Service Unavailable"
  },
  "schema": {
    "field": "type"
  }
}
```

### Route Validation Rules
- Path must be unique per HTTP method
- Same path can have different HTTP methods
- Validation occurs only on save
- All routes are validated before saving
- Error simulation configuration is validated

## Features Checklist

### Core Features
✅ Dynamic route configuration
✅ CRUD operations
✅ Persistent storage
✅ Data validation
✅ Error simulation
✅ Request logging
✅ OpenAPI documentation
✅ Admin interface
✅ CLI support

### Data Generation
✅ Faker.js integration
✅ Custom field handlers
✅ Nested object support
✅ Array generation
✅ Template-based responses

### Storage Features
✅ In-memory persistence
✅ Automatic ID generation
✅ Data validation
✅ Reset capabilities
✅ Batch operations

### Error Handling
✅ Configurable error rates
✅ Custom error messages
✅ Validation errors
✅ Not found handling
✅ Schema validation