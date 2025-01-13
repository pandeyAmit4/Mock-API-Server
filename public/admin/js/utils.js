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

export function createLoadingIndicator(element) {
    const loader = document.createElement('div');
    loader.className = 'loading-indicator';
    loader.textContent = 'Loading...';
    element.appendChild(loader);
    return () => loader.remove();
}
