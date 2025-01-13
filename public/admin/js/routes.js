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
            const template = JSON.parse(formData.template);
            const schema = formData.schema ? JSON.parse(formData.schema) : null;
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
        const baseConfig = {
            persist: true,
            schema: schema,
            error: formData.error,
            delay: formData.delay
        };

        const newRoutes = [];

        if (formData.operations.get) {
            newRoutes.push({
                ...baseConfig,
                path: path,
                method: 'GET',
                response: { [`${resourceName}s`]: [template] },
                statusCode: 200
            });

            newRoutes.push({
                ...baseConfig,
                path: `${path}/:id`,
                method: 'GET',
                response: template,
                statusCode: 200
            });
        }

        if (formData.operations.post) {
            newRoutes.push({
                ...baseConfig,
                path: path,
                method: 'POST',
                response: template,
                statusCode: 201,
                validateRequest: true
            });
        }

        if (formData.operations.put) {
            newRoutes.push({
                ...baseConfig,
                path: `${path}/:id`,
                method: 'PUT',
                response: template,
                statusCode: 200,
                validateRequest: true
            });
        }

        if (formData.operations.delete) {
            newRoutes.push({
                ...baseConfig,
                path: `${path}/:id`,
                method: 'DELETE',
                response: null,
                statusCode: 204
            });
        }

        return newRoutes;
    }
}

export const routeManager = new RouteManager();
