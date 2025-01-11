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
- Dynamic route configuration via JSON
- Support for all HTTP methods (GET, POST, PUT, DELETE, PATCH)
- Persistent data storage with automatic ID generation
- Data validation with JSON schemas
- Customizable response delays
- CORS support
- Detailed request logging

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

### Admin Interface
- Visual route management
- Real-time log viewer with filtering
- Export logs functionality
- Route validation
- Unsaved changes warning
- Storage reset capability

### API Documentation
- Interactive API documentation via Swagger UI
- OpenAPI 3.0.0 specification
- Automatic documentation generation from routes
- Real-time API testing interface
- Example response schemas
- Error simulation documentation

## Quick Start

```bash
# Installation
git clone https://github.com/yourusername/mockflow.git
cd mockflow
npm install
npm start

# Development mode
npm run dev

# Access Admin Panel
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
  "path": "/api/users",          // Route path (supports parameters like :id)
  "method": "GET",              // HTTP method
  "response": {
    "users": [{
      "id": "{{faker.string.uuid}}",
      "name": "{{faker.person.fullName}}",
      "email": "{{faker.internet.email}}"
    }]
  },
  "persist": true,             // Enable in-memory storage
  "statusCode": 200,           // HTTP status code
  "delay": 1000,              // Response delay in milliseconds
  "schema": {                  // Validation schema for POST/PUT
    "name": "string",
    "email": "string"
  },
  "error": {
    "enabled": true,
    "probability": 25,
    "status": 503,
    "message": "Service Temporarily Unavailable"
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

## Admin Panel

### Features
1. Route Management
   - View all routes
   - Add new routes
   - Edit existing routes
   - Delete routes
   - Real-time JSON validation
   - Unsaved changes warning
   - Duplicate route detection
   - Error simulation configuration
   - Auto-save warning

2. Storage Management
   - Reset storage for specific endpoints
   - View current storage state
   - Manage persistence

3. Log Viewer
   - Real-time log updates
   - Filter by:
     - Status (success/error)
     - HTTP method
     - Time range (5m, 15m, 1h, 24h)
     - Text search
   - Expandable log details
   - Export filtered logs
   - Clear logs functionality

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
GET    /admin              - Admin interface
GET    /api/admin/routes   - Get routes configuration
POST   /api/admin/routes   - Update routes configuration
POST   /api/admin/reset/:path  - Reset storage for path
GET    /api/admin/logs     - Get request logs
DELETE /api/admin/logs     - Clear logs
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

### Validation Rules
- Required fields must be present
- Types must match exactly
- Auto fields are skipped in validation
- Invalid data returns 400 error

## Storage Management

### Persistence Options
```json
{
  "persist": true,           // Enable storage
  "persist": false          // Generate new data each time
}
```

### Storage Operations
1. GET: Retrieve stored data
2. POST: Add new data (generates ID)
3. PUT: Update existing data
4. DELETE: Remove data

### Storage Reset
- Via Admin Panel buttons
- Via API endpoint
- Automatic reset on server restart

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

### Project Structure
```
mockflow/
├── config/              # Configuration files
├── public/admin/        # Admin interface
├── src/
│   ├── middleware/     # Express middleware
│   ├── utils/          # Utilities
│   ├── tests/         # Test files
│   └── index.js       # Entry point
```

### Testing
```bash
# Run all tests
npm test

# Watch mode
npm run test:watch
```

## CLI Usage

Install globally:
```bash
npm install -g @yourusername/mock-api-server
```

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

Example route with documentation:
```json
{
  "path": "/api/users/:id",
  "method": "GET",
  "response": {
    "id": "{{faker.string.uuid}}",
    "name": "{{faker.person.fullName}}"
  },
  "persist": true,
  "statusCode": 200,
  "error": {
    "enabled": true,
    "probability": 25,
    "status": 503,
    "message": "Service Temporarily Unavailable"
  }
}
```

This route will generate documentation including:
- Path parameter `:id`
- Success response schema
- Error response (503)
- Example values from Faker.js
- Response format


### Contributing
1. Fork repository
2. Create feature branch
3. Update tests
4. Submit pull request

## License

MIT License