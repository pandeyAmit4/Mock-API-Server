import { showToast } from './toast.js';
import { validateRouteConfig } from './utils.js';
import { ModalManager } from './modal.js';

export class RouteManager {
    constructor() {
        this.routes = [];
        this.hasUnsavedChanges = false;
        this.modalManager = new ModalManager();
    }

    init() {
        this.loadRoutes();
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('saveRoutes').addEventListener('click', () => this.saveRoutes());
        document.getElementById('addRoute').addEventListener('click', () => this.addRoute());
        document.getElementById('loadSamples').addEventListener('click', () => this.loadSampleRoutes());
    }

    // Display and Update Methods
    displayRoutes() {
        const routesList = document.getElementById('routesList');
        routesList.innerHTML = this.routes.map((route, index) => `
            <div class="route-item" id="route-${index}">
                <div class="route-header">
                    <h3>${route.method} ${route.path}</h3>
                    <div class="route-actions">
                        <button onclick="routeManager.editRoute(${index})" class="edit">Edit</button>
                        <button onclick="routeManager.duplicateRoute(${index})">Duplicate</button>
                        <button onclick="routeManager.deleteRoute(${index})">Delete</button>
                    </div>
                </div>
                <textarea
                    class="json-editor"
                    onchange="routeManager.updateRoute(${index}, this.value)"
                >${JSON.stringify(route, null, 2)}</textarea>
            </div>
        `).join('');
    }

    editRoute(index) {
        const route = this.routes[index];
        console.log('Original route before edit:', route);
        this.modalManager.show(route, (updatedRoute) => {
            console.log('Updated route from modal:', updatedRoute);
            
            // Preserve settings and ensure they're properly structured
            const mergedRoute = {
                ...route,                // Keep existing settings
                ...updatedRoute,         // Apply updates
                persist: true,
                method: updatedRoute.method.toUpperCase(),
                // Preserve error settings
                error: updatedRoute.error || route.error,
                // Preserve delay settings
                delay: updatedRoute.delay || route.delay,
                // Handle schema validation
                schema: updatedRoute.schema,
                validateRequest: (updatedRoute.method === 'POST' || updatedRoute.method === 'PUT') 
                    && updatedRoute.schema != null
            };

            console.log('Final merged route:', mergedRoute);
            this.routes[index] = mergedRoute;
            
            this.displayRoutes();
            this.showUnsavedChanges();
            showToast('Route updated successfully', 'success');
        });
    }

    // API Methods
    async loadRoutes() {
        try {
            const response = await fetch('/api/admin/routes');
            if (!response.ok) throw new Error('Failed to load routes');
            this.routes = await response.json();
            this.displayRoutes();
        } catch (error) {
            console.error('Load error:', error);
            showToast('Error loading routes: ' + error.message, 'error');
        }
    }

    async loadSampleRoutes() {
        try {
            const response = await fetch('/api/admin/load-samples', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Server returned non-JSON response');
            }

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Failed to load sample routes');
            }

            if (result.success) {
                showToast(`${result.count} sample routes loaded successfully`, 'success');
                await this.loadRoutes();
            } else {
                throw new Error(result.message || 'Failed to load sample routes');
            }
        } catch (error) {
            console.error('Error loading samples:', error);
            showToast('Error loading sample routes: ' + error.message, 'error');
        }
    }

    async saveRoutes() {
        try {
            console.log('Saving routes:', this.routes);
            
            // Validate each route
            for (const route of this.routes) {
                try {
                    const isValid = await validateRouteConfig(route);
                    if (!isValid) {
                        throw new Error(`Invalid route configuration: ${route.method} ${route.path}`);
                    }
                } catch (error) {
                    throw new Error(`Validation failed for route ${route.method} ${route.path}: ${error.message}`);
                }
            }

            const response = await fetch('/api/admin/routes', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(this.routes)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to save routes');
            }

            const result = await response.json();
            console.log('Save result:', result);

            showToast('Routes saved successfully', 'success');
            await this.loadRoutes();
            this.hideUnsavedChanges();
        } catch (error) {
            console.error('Save error:', error);
            showToast(error.message, 'error');
        }
    }

    // Route Management Methods
    updateRoute(index, value) {
        try {
            this.routes[index] = JSON.parse(value);
            this.showUnsavedChanges();
        } catch (error) {
            showToast('Invalid JSON format', 'error');
        }
    }

    deleteRoute(index) {
        this.routes.splice(index, 1);
        this.displayRoutes();
        this.showUnsavedChanges();
        showToast('Route deleted', 'warning');
    }

    duplicateRoute(index) {
        const newRoute = JSON.parse(JSON.stringify(this.routes[index]));
        newRoute.path += '_copy';
        this.routes.splice(index + 1, 0, newRoute);
        this.displayRoutes();
        this.showUnsavedChanges();
        showToast('Route duplicated', 'info');
    }

    // UI State Methods
    showUnsavedChanges() {
        this.hasUnsavedChanges = true;
        document.getElementById('unsavedIndicator').style.display = 'inline';
        document.getElementById('saveRoutes').style.backgroundColor = '#dc3545';
    }

    hideUnsavedChanges() {
        this.hasUnsavedChanges = false;
        document.getElementById('unsavedIndicator').style.display = 'none';
        document.getElementById('saveRoutes').style.backgroundColor = '#28a745';
    }

    // Route Creation Methods
    addRoute() {
        this.modalManager.show();
    }

    async createRoutes() {
        const formData = this.modalManager.getFormData();
        const path = formData.path;
        
        if (!path.startsWith('/api/')) {
            showToast('Path must start with /api/', 'error');
            return;
        }

        try {
            // Use the response property from formData instead of template
            const template = formData.response;
            const schema = formData.schema;
            const resourceName = path.split('/').pop();
            
            const newRoutes = this.generateRoutes(path, resourceName, template, schema, formData);
            
            if (newRoutes.length === 0) {
                showToast('No operations selected', 'warning');
                return;
            }

            // Validate routes with duplicate checking
            for (const route of newRoutes) {
                try {
                    await validateRouteConfig(route, true);
                } catch (error) {
                    showToast(`Validation failed: ${error.message}`, 'error');
                    return;
                }
            }

            // Add routes and update UI
            this.routes.unshift(...newRoutes);
            this.displayRoutes();
            this.showUnsavedChanges();
            this.modalManager.close();
            showToast(`Created ${newRoutes.length} routes for ${resourceName}`, 'success');
        } catch (error) {
            showToast(error.message || 'Failed to create routes', 'error');
        }
    }

    generateRoutes(path, resourceName, template, schema, formData) {
        console.log('Generating routes with formData:', formData);
        
        // Common configuration for all routes
        const baseConfig = {
            persist: true,
            // Apply error simulation settings if enabled
            ...(formData.error && {
                error: {
                    enabled: true,
                    probability: parseInt(formData.error.probability) || 25,
                    status: parseInt(formData.error.status) || 500,
                    message: formData.error.message || 'Simulated error'
                }
            }),
            // Apply delay if enabled
            ...(formData.delay && { delay: parseInt(formData.delay) })
        };

        // Configuration for write operations (POST, PUT)
        const writeConfig = {
            ...baseConfig,
            schema: schema,
            validateRequest: true
        };

        // Configuration for read operations (GET, DELETE)
        const readConfig = {
            ...baseConfig,
            schema: null,
            validateRequest: false
        };

        const newRoutes = [];

        // GET collection
        if (formData.operations.get) {
            newRoutes.push({
                ...readConfig,
                path: path,
                method: 'GET',
                response: { [`${resourceName}s`]: [template] },
                statusCode: 200
            });

            // GET single item
            newRoutes.push({
                ...readConfig,
                path: `${path}/:id`,
                method: 'GET',
                response: template,
                statusCode: 200
            });
        }

        // POST new item
        if (formData.operations.post) {
            newRoutes.push({
                ...writeConfig,
                path: path,
                method: 'POST',
                response: template,
                statusCode: 201
            });
        }

        // PUT update item
        if (formData.operations.put) {
            newRoutes.push({
                ...writeConfig,
                path: `${path}/:id`,
                method: 'PUT',
                response: template,
                statusCode: 200
            });
        }

        // DELETE item
        if (formData.operations.delete) {
            newRoutes.push({
                ...readConfig,
                path: `${path}/:id`,
                method: 'DELETE',
                response: null,
                statusCode: 204
            });
        }

        // Log the generated routes for debugging
        console.log('Generated routes:', JSON.stringify(newRoutes, null, 2));

        return newRoutes;
    }
}

export const routeManager = new RouteManager();
