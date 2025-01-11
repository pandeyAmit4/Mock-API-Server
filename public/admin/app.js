let routes = [];
let hasUnsavedChanges = false;

// Configure toast notifier with default settings
const toast = new jsToastNotifier.ToastNotifier({
    position: 'top-right',
    animation: 'slide',
    theme: 'light',
    progressBar: true,
    closeButton: true,
    pauseOnHover: true,
    duration: 3000,
    maxToasts: 5,
    icons: true,
    offset: {
        x: 20,
        y: 20
    }
});

function showToast(message, type = 'info') {
    const options = {
        type: type,
        dismissible: true,
        styles: {
            [type]: {
                container: {
                    backgroundColor: getToastColor(type),
                    color: type === 'warning' ? '#000' : '#fff'
                },
                progressBar: {
                    backgroundColor: getProgressBarColor(type)
                }
            }
        }
    };

    toast.show(message, options);
}

function getToastColor(type) {
    const colors = {
        success: '#28a745',
        error: '#dc3545',
        info: '#17a2b8',
        warning: '#ffc107'
    };
    return colors[type] || colors.info;
}

function getProgressBarColor(type) {
    const colors = {
        success: '#1e7e34',
        error: '#bd2130',
        info: '#117a8b',
        warning: '#d39e00'
    };
    return colors[type] || colors.info;
}

async function loadRoutes() {
    try {
        const response = await fetch('/api/admin/routes');
        if (!response.ok) {
            throw new Error('Failed to load routes');
        }
        routes = await response.json();
        displayRoutes();
    } catch (error) {
        console.error('Load error:', error);
        showToast('Error loading routes: ' + error.message, 'error');
    }
}

function displayRoutes() {
    const routesList = document.getElementById('routesList');
    routesList.innerHTML = routes.map((route, index) => `
        <div class="route-item" id="route-${index}">
            <div class="route-header">
                <h3>${route.method} ${route.path}</h3>
                <button onclick="deleteRoute(${index})">Delete</button>
            </div>
            <textarea
                class="json-editor"
                onchange="updateRoute(${index}, this.value)"
            >${JSON.stringify(route, null, 2)}</textarea>
        </div>
    `).join('');
}

async function saveRoutes() {
    try {
        // Check for duplicates before saving
        const usedPaths = new Set();
        for (const route of routes) {
            const routeKey = `${route.method.toUpperCase()}:${route.path}`;
            if (usedPaths.has(routeKey)) {
                throw new Error(`Duplicate route found: ${routeKey}`);
            }
            usedPaths.add(routeKey);
        }

        const response = await fetch('/api/admin/routes', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(routes)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to save routes');
        }

        await response.json();
        showToast('Routes saved successfully', 'success');
        await loadRoutes();
        hideUnsavedChanges();
    } catch (error) {
        console.error('Save error:', error);
        showToast(error.message, 'error');
    }
}

function updateRoute(index, value) {
    try {
        const updatedRoute = JSON.parse(value);
        
        // Validate error configuration if present
        if (updatedRoute.error && updatedRoute.error.enabled) {
            if (typeof updatedRoute.error.probability !== 'number' || 
                updatedRoute.error.probability < 0 || 
                updatedRoute.error.probability > 100) {
                throw new Error('Error probability must be between 0 and 100');
            }
            if (!updatedRoute.error.status || !updatedRoute.error.message) {
                throw new Error('Error configuration must include status and message');
            }
        }

        routes[index] = updatedRoute;
        showUnsavedChanges();
    } catch (error) {
        showToast(error.message || 'Invalid JSON format', 'error');
    }
}

function deleteRoute(index) {
    routes.splice(index, 1);
    displayRoutes();
    showUnsavedChanges();
    showToast('Route deleted', 'warning');
}

function addRoute() {
    const newRoute = {
        path: '/api/new-route',
        method: 'GET',
        response: { message: 'New route' },
        persist: false,
        statusCode: 200,
        error: {
            enabled: false,
            probability: 0,
            status: 500,
            message: 'Internal Server Error'
        }
    };
    
    // Check for duplicate route
    const isDuplicate = routes.some(route => 
        route.path === newRoute.path && 
        route.method.toUpperCase() === newRoute.method.toUpperCase()
    );

    if (isDuplicate) {
        showToast(`Route ${newRoute.method} ${newRoute.path} already exists`, 'error');
        return;
    }

    routes.unshift(newRoute);
    displayRoutes();
    showUnsavedChanges();

    const firstRoute = document.getElementById('route-0');
    if (firstRoute) {
        firstRoute.scrollIntoView({ behavior: 'smooth' });
        firstRoute.style.backgroundColor = '#f0f8ff';
        setTimeout(() => {
            firstRoute.style.backgroundColor = '';
        }, 1000);
    }
    showToast('New route added with error simulation support - Remember to save changes!', 'info');
}

function showUnsavedChanges() {
    hasUnsavedChanges = true;
    document.getElementById('unsavedIndicator').style.display = 'inline';
    document.getElementById('saveRoutes').style.backgroundColor = '#dc3545';
}

function hideUnsavedChanges() {
    hasUnsavedChanges = false;
    document.getElementById('unsavedIndicator').style.display = 'none';
    document.getElementById('saveRoutes').style.backgroundColor = '#28a745';
}

async function resetStorage(path) {
    try {
        await fetch(`/api/admin/reset${path}`, { method: 'POST' });
        showToast(`Storage reset for ${path}`, 'success');
    } catch (error) {
        showToast('Error resetting storage: ' + error.message, 'error');
    }
}

class LogsManager {
    constructor() {
        this.logs = new Map(); // Use Map to store logs with unique IDs
        this.expandedStates = new Set(); // Track expanded states
    }

    updateLogs(newLogs) {
        // Add new logs to the map
        newLogs.forEach(log => {
            const logId = this.getLogId(log);
            if (!this.logs.has(logId)) {
                this.logs.set(logId, log);
            }
        });
    }

    getLogId(log) {
        return `${log.timestamp}-${log.method}-${log.url}-${log.status}`;
    }

    toggleExpanded(logId) {
        if (this.expandedStates.has(logId)) {
            this.expandedStates.delete(logId);
        } else {
            this.expandedStates.add(logId);
        }
    }

    isExpanded(logId) {
        return this.expandedStates.has(logId);
    }

    clear() {
        this.logs.clear();
        this.expandedStates.clear();
    }

    getFilteredLogs(filters) {
        const { status, method, timeFilter, searchText } = filters;
        return Array.from(this.logs.values()).filter(log => {
            if (status === 'success' && log.status >= 400) return false;
            if (status === 'error' && log.status < 400) return false;
            if (method !== 'all' && log.method !== method) return false;

            const logTime = new Date(log.timestamp).getTime();
            const now = Date.now();
            if (timeFilter === '5m' && now - logTime > 5 * 60 * 1000) return false;
            if (timeFilter === '15m' && now - logTime > 15 * 60 * 1000) return false;
            if (timeFilter === '1h' && now - logTime > 60 * 60 * 1000) return false;
            if (timeFilter === '24h' && now - logTime > 24 * 60 * 60 * 1000) return false;

            if (searchText && !JSON.stringify(log).toLowerCase().includes(searchText)) return false;

            return true;
        });
    }
}

const logsManager = new LogsManager();

function toggleLogDetails(header) {
    const logId = header.closest('.log-item').dataset.logId;
    logsManager.toggleExpanded(logId);
    header.nextElementSibling.classList.toggle('expanded');
}

function displayLogs(newLogs) {
    // Update logs in manager
    logsManager.updateLogs(newLogs);

    // Get current filter values
    const filters = {
        status: document.getElementById('statusFilter').value,
        method: document.getElementById('methodFilter').value,
        timeFilter: document.getElementById('timeFilter').value,
        searchText: document.getElementById('logsSearch').value.toLowerCase()
    };

    // Get filtered logs
    const filteredLogs = logsManager.getFilteredLogs(filters);

    // Update or add only new log entries
    const logsList = document.getElementById('logsList');
    
    filteredLogs.forEach(log => {
        const logId = logsManager.getLogId(log);
        let logElement = document.querySelector(`[data-log-id="${logId}"]`);
        
        if (!logElement) {
            // Create new log entry if it doesn't exist
            const newLogElement = document.createElement('div');
            newLogElement.className = 'log-item';
            newLogElement.dataset.logId = logId;
            newLogElement.innerHTML = `
                <div class="log-header" onclick="toggleLogDetails(this)">
                    <span>${new Date(log.timestamp).toLocaleString()} - ${log.method} ${log.url}</span>
                    <span class="log-status log-status-${log.status}">${log.status}</span>
                </div>
                <div class="log-details${logsManager.isExpanded(logId) ? ' expanded' : ''}">
                    <div class="log-meta">
                        <span>Response Time: ${log.responseTime}ms</span>
                        <span>IP: ${log.ip}</span>
                    </div>
                    <pre>${JSON.stringify(log, null, 2)}</pre>
                </div>
            `;
            logsList.insertBefore(newLogElement, logsList.firstChild);
        }
    });

    // Remove logs that don't match filters
    document.querySelectorAll('.log-item').forEach(item => {
        const logId = item.dataset.logId;
        if (!filteredLogs.find(log => logsManager.getLogId(log) === logId)) {
            item.remove();
        }
    });
}

async function clearLogs() {
    try {
        const response = await fetch('/api/admin/logs', { method: 'DELETE' });
        if (!response.ok) {
            throw new Error('Failed to clear logs');
        }
        logsManager.clear();
        document.getElementById('logsList').innerHTML = '';
        showToast('Logs cleared successfully', 'success');
    } catch (error) {
        console.error('Error clearing logs:', error);
        showToast('Error clearing logs: ' + error.message, 'error');
    }
}

async function loadLogs() {
    try {
        const response = await fetch('/api/admin/logs');
        if (!response.ok) {
            throw new Error('Failed to load logs');
        }
        const logs = await response.json();
        displayLogs(logs);
    } catch (error) {
        console.error('Error loading logs:', error);
    }
}

function expandAllLogs() {
    document.querySelectorAll('.log-details').forEach(detail => {
        detail.classList.add('expanded');
    });
}

function collapseAllLogs() {
    document.querySelectorAll('.log-details').forEach(detail => {
        detail.classList.remove('expanded');
    });
}

function exportLogs() {
    // Get current filter values
    const filters = {
        status: document.getElementById('statusFilter').value,
        method: document.getElementById('methodFilter').value,
        timeFilter: document.getElementById('timeFilter').value,
        searchText: document.getElementById('logsSearch').value.toLowerCase()
    };

    // Get filtered logs from the logsManager
    const logsToExport = logsManager.getFilteredLogs(filters);

    const blob = new Blob([JSON.stringify(logsToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mock-api-server-logs-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Add event listeners for filters
document.getElementById('statusFilter').addEventListener('change', () => loadLogs());
document.getElementById('methodFilter').addEventListener('change', () => loadLogs());
document.getElementById('timeFilter').addEventListener('change', () => loadLogs());
document.getElementById('logsSearch').addEventListener('input', debounce(() => loadLogs(), 300));

function debounce(func, wait) {
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

function refreshLogs() {
    const currentScrollPosition = document.getElementById('logsList').scrollTop;
    loadLogs().then(() => {
        document.getElementById('logsList').scrollTop = currentScrollPosition;
    });
}

// Auto-refresh logs every 5 seconds when logs tab is active
let logRefreshInterval;

document.querySelectorAll('.tab-btn').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        button.classList.add('active');
        document.getElementById(button.dataset.tab).classList.add('active');

        // Handle logs auto-refresh
        clearInterval(logRefreshInterval);
        if (button.dataset.tab === 'logs') {
            loadLogs(); // Initial load
            logRefreshInterval = setInterval(loadLogs, 5000);
        }
    });
});

// Cleanup interval when leaving the page
window.addEventListener('beforeunload', () => {
    clearInterval(logRefreshInterval);
});

// Add window beforeunload event
window.addEventListener('beforeunload', (e) => {
    clearInterval(logRefreshInterval);
    if (hasUnsavedChanges) {
        showToast('You have unsaved changes!', 'warning');
        e.preventDefault();
        return e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
    }
});

// Event Listeners
document.getElementById('saveRoutes').addEventListener('click', saveRoutes);
document.getElementById('addRoute').addEventListener('click', addRoute);

// Initial load
loadRoutes();
loadLogs();
