import { showToast } from './toast.js';

export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

export async function validateRouteConfig(route, checkDuplicates = false) {
    try {
        const url = checkDuplicates ? 
            '/api/admin/validate-route?checkDuplicates=true' : 
            '/api/admin/validate-route';

        const response = await fetch(url, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(route)
        });

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Invalid server response');
        }
        
        const data = await response.json();
        
        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Validation failed');
        }
        
        return true;
    } catch (error) {
        console.error('Validation error:', error);
        throw error;
    }
}

export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

export function sanitizePath(path) {
    // Bug: Doesn't handle null/undefined paths
    // Should add type check
    if (typeof path !== 'string') {
        throw new Error('Path must be a string');
    }
    return path.replace(/\/+/g, '/').replace(/\/$/, '');
}

export function isValidJson(str) {
    try {
        JSON.parse(str);
        return true;
    } catch (e) {
        return false;
    }
}

export function formatDateTime(date) {
    return new Date(date).toLocaleString(undefined, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

export function downloadJson(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export async function readJsonFile(file) {
    try {
        const text = await file.text();
        return JSON.parse(text);
    } catch (error) {
        throw new Error('Invalid JSON file');
    }
}

export function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function filterObjectsByQuery(objects, query) {
    const searchText = query.toLowerCase();
    return objects.filter(obj => 
        JSON.stringify(obj).toLowerCase().includes(searchText)
    );
}

export function validateHttpMethod(method) {
    const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    return validMethods.includes(method.toUpperCase());
}

export function validateStatusCode(code) {
    return Number.isInteger(code) && code >= 100 && code <= 599;
}

// Error handling utilities
export function handleApiError(error) {
    console.error('API Error:', error);
    showToast(error.message || 'An unexpected error occurred', 'error');
}

export function createLoadingIndicator(element, options = {}) {
    const isButton = element.tagName.toLowerCase() === 'button';
    const spinner = document.createElement('span');
    spinner.className = 'loading-indicator';
    
    if (isButton) {
        const originalContent = element.innerHTML;
        return {
            start: () => {
                element.disabled = true;
                element.prepend(spinner);
                element.classList.add('loading');
            },
            stop: () => {
                element.disabled = false;
                element.innerHTML = originalContent;
                element.classList.remove('loading');
            }
        };
    } else {
        spinner.textContent = options.text || 'Loading...';
        return {
            start: () => {
                element.appendChild(spinner);
                element.classList.add('loading');
            },
            stop: () => {
                spinner.remove();
                element.classList.remove('loading');
            }
        };
    }
}

export function addButtonFeedback(button) {
    button.addEventListener('click', function(e) {
        const rect = button.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;
        
        button.appendChild(ripple);
        setTimeout(() => ripple.remove(), 1000);
    });
}

export function exportConfiguration() {
    // Get routeManager from the global scope if not passed directly
    const routeManager = window.routeManager;
    if (!routeManager) {
        throw new Error('Route manager not initialized');
    }

    const config = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        routes: routeManager.routes,
        metadata: {
            routeCount: routeManager.routes.length,
            exportedBy: 'Mock API Admin'
        }
    };
    
    downloadJson(config, `mockapi-config-${new Date().toISOString()}.json`);
}

export async function importConfiguration(file) {
    try {
        const config = await readJsonFile(file);
        
        // Validate configuration file
        if (!config.routes || !Array.isArray(config.routes)) {
            throw new Error('Invalid configuration file format');
        }

        // Validate each route
        for (const route of config.routes) {
            if (!route.path || !route.method) {
                throw new Error('Invalid route configuration found');
            }
        }

        return config.routes;
    } catch (error) {
        throw new Error(`Failed to import configuration: ${error.message}`);
    }
}
