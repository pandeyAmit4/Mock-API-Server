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
        routes[index] = JSON.parse(value);
        showUnsavedChanges();
    } catch (error) {
        showToast('Invalid JSON format', 'error');
    }
}

function deleteRoute(index) {
    routes.splice(index, 1);
    displayRoutes();
    showUnsavedChanges();
    showToast('Route deleted', 'warning');
}

function addRoute() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>Create New Route</h2>
            
            <div class="form-group">
                <label>Base Path:</label>
                <input type="text" id="routePath" placeholder="/api/resources" required>
            </div>

            <div class="form-group">
                <label>Operations:</label>
                <div class="checkbox-group">
                    <label><input type="checkbox" id="opGet" checked> GET (List/Read)</label>
                    <label><input type="checkbox" id="opPost" checked> POST (Create)</label>
                    <label><input type="checkbox" id="opPut" checked> PUT (Update)</label>
                    <label><input type="checkbox" id="opDelete" checked> DELETE (Remove)</label>
                </div>
            </div>

            <div class="form-group">
                <label>Response Template:</label>
                <textarea id="responseTemplate" rows="6">{
    "id": "{{faker.string.uuid}}",
    "name": "{{faker.commerce.productName}}",
    "description": "{{faker.commerce.productDescription}}"
}</textarea>
            </div>

            <div class="settings-section">
                <h3>Advanced Settings</h3>
                
                <div class="setting-group">
                    <label><input type="checkbox" id="enableSchema"> Enable Schema Validation</label>
                    <textarea id="schemaTemplate" rows="4" disabled>{
    "name": "string",
    "description": "string"
}</textarea>
                </div>

                <div class="setting-group">
                    <label><input type="checkbox" id="enableError"> Enable Error Simulation</label>
                    <div id="errorSettings" class="nested-settings" style="display: none;">
                        <input type="number" id="errorProb" placeholder="Error Probability %" min="0" max="100" value="25">
                        <input type="number" id="errorStatus" placeholder="Error Status Code" min="400" max="599" value="500">
                        <input type="text" id="errorMessage" placeholder="Error Message" value="Simulated error">
                    </div>
                </div>

                <div class="setting-group">
                    <label><input type="checkbox" id="enableDelay"> Enable Response Delay</label>
                    <div id="delaySettings" class="nested-settings" style="display: none;">
                        <input type="number" id="delayMs" placeholder="Delay in milliseconds" min="0" value="1000">
                    </div>
                </div>
            </div>

            <div class="actions">
                <button onclick="createRoutes()" class="primary">Create Routes</button>
                <button onclick="closeModal()">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Add event listeners for settings toggles
    document.getElementById('enableSchema').addEventListener('change', (e) => {
        document.getElementById('schemaTemplate').disabled = !e.target.checked;
    });
    document.getElementById('enableError').addEventListener('change', (e) => {
        document.getElementById('errorSettings').style.display = e.target.checked ? 'block' : 'none';
    });
    document.getElementById('enableDelay').addEventListener('change', (e) => {
        document.getElementById('delaySettings').style.display = e.target.checked ? 'block' : 'none';
    });
}

function closeModal() {
    document.querySelector('.modal').remove();
}

function createRoutes() {
    const path = document.getElementById('routePath').value.trim();
    if (!path.startsWith('/api/')) {
        showToast('Path must start with /api/', 'error');
        return;
    }

    const resourceName = path.split('/').pop();
    let template, schema;
    try {
        template = JSON.parse(document.getElementById('responseTemplate').value);
        if (document.getElementById('enableSchema').checked) {
            schema = JSON.parse(document.getElementById('schemaTemplate').value);
        }
    } catch (error) {
        showToast('Invalid JSON format in template or schema', 'error');
        return;
    }

    // Collect advanced settings
    const errorSettings = document.getElementById('enableError').checked ? {
        enabled: true,
        probability: parseInt(document.getElementById('errorProb').value),
        status: parseInt(document.getElementById('errorStatus').value),
        message: document.getElementById('errorMessage').value
    } : undefined;

    const delay = document.getElementById('enableDelay').checked ? 
        parseInt(document.getElementById('delayMs').value) : undefined;

    const newRoutes = [];

    // GET (List all)
    if (document.getElementById('opGet').checked) {
        newRoutes.push({
            path: path,
            method: 'GET',
            response: {
                [`${resourceName}s`]: [template]
            },
            persist: true,
            statusCode: 200
        });

        // GET (Single item)
        newRoutes.push({
            path: `${path}/:id`,
            method: 'GET',
            response: template,
            persist: true,
            statusCode: 200
        });
    }

    // POST with schema validation
    if (document.getElementById('opPost').checked) {
        newRoutes.push({
            path: path,
            method: 'POST',
            response: template,
            persist: true,
            statusCode: 201,
            schema: schema,
            error: errorSettings,
            delay: delay
        });
    }

    // PUT with schema validation
    if (document.getElementById('opPut').checked) {
        newRoutes.push({
            path: `${path}/:id`,
            method: 'PUT',
            response: template,
            persist: true,
            statusCode: 200,
            schema: schema,
            error: errorSettings,
            delay: delay
        });
    }

    // DELETE
    if (document.getElementById('opDelete').checked) {
        newRoutes.push({
            path: `${path}/:id`,
            method: 'DELETE',
            response: null,  // DELETE doesn't need a response template
            persist: true,
            statusCode: 204
        });
    }

    // Validate new routes
    try {
        for (const route of newRoutes) {
            if (routes.some(r => 
                r.path === route.path && 
                r.method.toUpperCase() === route.method.toUpperCase()
            )) {
                throw new Error(`Route ${route.method} ${route.path} already exists`);
            }
        }
    } catch (error) {
        showToast(error.message, 'error');
        return;
    }

    // Add new routes to existing routes
    routes.unshift(...newRoutes);
    displayRoutes();
    showUnsavedChanges();
    closeModal();

    showToast(`Created ${newRoutes.length} routes for ${resourceName}`, 'success');
}

// Add CSS for modal
const style = document.createElement('style');
style.textContent = `
.modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.modal-content {
    background: white;
    padding: 20px;
    border-radius: 8px;
    width: 80%;
    max-width: 600px;
}

.form-group {
    margin-bottom: 15px;
}

.form-group label {
    display: block;
    margin-bottom: 5px;
}

.form-group input[type="text"] {
    width: 100%;
    padding: 8px;
}

.checkbox-group {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
}

.checkbox-group label {
    display: flex;
    align-items: center;
    gap: 5px;
}

.actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 20px;
}

textarea {
    width: 100%;
    font-family: monospace;
}

.settings-section {
    margin-top: 20px;
    padding: 15px;
    background: #f8f9fa;
    border-radius: 4px;
}
.setting-group {
    margin: 10px 0;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
}
.nested-settings {
    margin-top: 10px;
    padding: 10px;
    background: white;
    border-radius: 4px;
    display: grid;
    gap: 10px;
}
.nested-settings input {
    padding: 5px;
    border: 1px solid #ddd;
    border-radius: 4px;
}
`;
document.head.appendChild(style);

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
        const cleanPath = path.replace(/^\/api\//, '');
        const response = await fetch(`/api/admin/reset/${cleanPath}`, { 
            method: 'POST'
        });
        if (!response.ok) {
            throw new Error('Failed to reset storage');
        }
        const result = await response.json();
        showToast(`Storage reset for ${path}. Items: ${result.count}`, 'success');
        await updateStorageDetails(path);
    } catch (error) {
        console.error('Error resetting storage:', error);
        showToast('Error resetting storage: ' + error.message, 'error');
    }
}

function displayStorageInfo() {
    const storageDiv = document.getElementById('storage');
    const persistentRoutes = routes.filter(route => route.persist)
        .reduce((acc, route) => {
            const basePath = route.path.split(':')[0].replace(/\/$/, '');
            if (!acc.includes(basePath)) {
                acc.push(basePath);
            }
            return acc;
        }, []);

    if (persistentRoutes.length === 0) {
        storageDiv.innerHTML = `
            <h2>Storage Management</h2>
            <p class="no-storage">No persistent routes configured</p>
        `;
        return;
    }

    storageDiv.innerHTML = `
        <h2>Storage Management</h2>
        <div class="storage-info">
            ${persistentRoutes.map(path => `
                <div class="storage-item">
                    <div class="storage-header">
                        <h3>${path}</h3>
                        <button onclick="resetStorage('${path}')">Reset Storage</button>
                    </div>
                    <div class="storage-details" id="storage-${path.replace(/\//g, '-')}">
                        Loading...
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    persistentRoutes.forEach(path => updateStorageDetails(path));
}

async function updateStorageDetails(path) {
    try {
        const cleanPath = path.replace(/^\/api\//, '');
        const response = await fetch(`/api/admin/storage/${cleanPath}`);
        if (!response.ok) {
            throw new Error('Failed to fetch storage info');
        }
        const data = await response.json();
        const key = path.split('/').pop() + 's';
        const itemCount = Array.isArray(data[key]) ? data[key].length : 0;

        const detailsDiv = document.getElementById(`storage-${path.replace(/\//g, '-')}`);
        if (detailsDiv) {
            detailsDiv.innerHTML = `
                <p>Items: ${itemCount}</p>
                <p>Last Updated: ${new Date().toLocaleTimeString()}</p>
                <p class="storage-path">Path: ${path}</p>
            `;
        }
    } catch (error) {
        console.error(`Error fetching storage details for ${path}:`, error);
        const detailsDiv = document.getElementById(`storage-${path.replace(/\//g, '-')}`);
        if (detailsDiv) {
            detailsDiv.innerHTML = `<p class="error">Error loading storage details</p>`;
        }
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
    const logs = Array.from(document.querySelectorAll('.log-item')).map(item => {
        return {
            timestamp: item.querySelector('.log-header').textContent.split(' - ')[0],
            method: item.querySelector('.log-header').textContent.split(' - ')[1].split(' ')[0],
            url: item.querySelector('.log-header').textContent.split(' - ')[1].split(' ')[1],
            status: item.querySelector('.log-status').textContent
        };
    });

    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mockflow-logs-${new Date().toISOString()}.json`;
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
        // Clear any existing interval first
        if (logRefreshInterval) {
            clearInterval(logRefreshInterval);
            logRefreshInterval = null;
        }

        document.querySelectorAll('.tab-btn').forEach(btn => 
            btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => 
            content.classList.remove('active'));
        
        button.classList.add('active');
        const tab = button.dataset.tab;
        document.getElementById(tab).classList.add('active');

        // Only set up interval if switching to logs tab
        if (tab === 'logs') {
            loadLogs(); // Initial load
            logRefreshInterval = setInterval(loadLogs, 5000);
        }

        // Update storage info when switching to storage tab
        if (button.dataset.tab === 'storage') {
            displayStorageInfo();
        }
    });
});

// Cleanup function
function cleanup() {
    if (logRefreshInterval) {
        clearInterval(logRefreshInterval);
        logRefreshInterval = null;
    }
}

// Update beforeunload handlers
window.addEventListener('beforeunload', (e) => {
    cleanup();
    if (hasUnsavedChanges) {
        showToast('You have unsaved changes!', 'warning');
        e.preventDefault();
        return e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
    }
});

// Add cleanup on tab switch
window.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        cleanup();
    } else {
        // Restart interval if we're on logs tab
        const logsTabActive = document.querySelector('.tab-btn[data-tab="logs"].active');
        if (logsTabActive && !logRefreshInterval) {
            loadLogs();
            logRefreshInterval = setInterval(loadLogs, 5000);
        }
    }
});

// Event Listeners
document.getElementById('saveRoutes').addEventListener('click', saveRoutes);
document.getElementById('addRoute').addEventListener('click', addRoute);

async function loadSampleRoutes() {
    try {
        const response = await fetch('/api/admin/load-samples', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load sample routes');
        }

        const result = await response.json();
        showToast(result.message, 'success');
        await loadRoutes(); // Reload routes to show new samples
        displayStorageInfo(); // Refresh storage info
    } catch (error) {
        console.error('Error loading samples:', error);
        showToast('Error loading sample routes: ' + error.message, 'error');
    }
}

// Add event listener for load samples button
document.getElementById('loadSamples').addEventListener('click', loadSampleRoutes);

// Initial load
loadRoutes();
loadLogs();
