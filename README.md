# MockFlow

A powerful and flexible mock API server with dynamic data generation, built-in admin interface, and real-time configuration.

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

## Features

### Core Features
- 🚀 Dynamic route configuration
- 🔄 Real-time route updates
- 🎭 Faker.js integration for realistic mock data
- 💾 In-memory data persistence
- ⏱️ Configurable response delays
- ✅ Schema validation
- 🔍 Request logging
- 🛡️ CORS support

### Admin Interface
- 📝 Visual route management
- 🔄 Live route editing
- 🗑️ Storage reset capabilities
- 💡 JSON validation
- ⚡ Immediate feedback

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
    "data": "{{faker.type.method}}"  // Dynamic data template
  },
  "persist": true,             // Enable in-memory storage
  "statusCode": 200,           // HTTP status code
  "delay": 1000,              // Response delay in milliseconds
  "schema": {                  // Validation schema for POST/PUT
    "name": "string",
    "age": "number",
    "active": "boolean"
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

2. Storage Management
   - Reset storage for specific endpoints
   - View current storage state
   - Manage persistence

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

## API Reference

### Admin API Endpoints
```
GET    /admin              - Admin interface
GET    /api/admin/routes   - Get routes configuration
POST   /api/admin/routes   - Update routes configuration
POST   /api/admin/reset/:path  - Reset storage for path
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

### Contributing
1. Fork repository
2. Create feature branch
3. Update tests
4. Submit pull request

## License

MIT License
