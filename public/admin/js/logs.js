import { showToast } from './toast.js';
import { debounce } from './utils.js';

export class LogsManager {
    constructor() {
        this.logs = new Map();
        this.expandedStates = new Set();
        this.refreshInterval = null;
    }

    init() {
        this.setupEventListeners();
        this.loadLogs();
        this.startAutoRefresh();
    }

    setupEventListeners() {
        const elements = {
            statusFilter: document.getElementById('statusFilter'),
            methodFilter: document.getElementById('methodFilter'),
            timeFilter: document.getElementById('timeFilter'),
            logsSearch: document.getElementById('logsSearch'),
            clearLogs: document.getElementById('clearLogs'),
            exportLogs: document.getElementById('exportLogs'),
            expandAll: document.getElementById('expandAll'),
            collapseAll: document.getElementById('collapseAll'),
            refreshLogs: document.getElementById('refreshLogs')
        };

        // Only add listeners if elements exist
        if (elements.statusFilter) {
            elements.statusFilter.addEventListener('change', () => this.loadLogs());
        }
        if (elements.methodFilter) {
            elements.methodFilter.addEventListener('change', () => this.loadLogs());
        }
        if (elements.timeFilter) {
            elements.timeFilter.addEventListener('change', () => this.loadLogs());
        }
        if (elements.logsSearch) {
            elements.logsSearch.addEventListener('input', debounce(() => this.loadLogs(), 300));
        }
        if (elements.clearLogs) {
            elements.clearLogs.addEventListener('click', () => this.clearLogs());
        }
        if (elements.exportLogs) {
            elements.exportLogs.addEventListener('click', () => this.exportLogs());
        }
        if (elements.expandAll) {
            elements.expandAll.addEventListener('click', () => this.expandAllLogs());
        }
        if (elements.collapseAll) {
            elements.collapseAll.addEventListener('click', () => this.collapseAllLogs());
        }
        if (elements.refreshLogs) {
            elements.refreshLogs.addEventListener('click', () => this.refreshLogs());
        }
    }

    async loadLogs() {
        try {
            const response = await fetch('/api/admin/logs');
            if (!response.ok) throw new Error('Failed to load logs');
            const logs = await response.json();
            this.updateLogs(logs);
            this.displayLogs();
        } catch (error) {
            console.error('Error loading logs:', error);
        }
    }

    updateLogs(newLogs) {
        // Clear old logs first to ensure we have the latest data
        this.logs.clear();
        newLogs.forEach(log => {
            const logId = this.getLogId(log);
            this.logs.set(logId, log);
        });
        this.displayLogs(); // Immediately update display after new logs
    }

    getLogId(log) {
        return `${log.timestamp}-${log.method}-${log.url}-${log.status}`;
    }

    getFilteredLogs() {
        const filters = {
            status: document.getElementById('statusFilter').value,
            method: document.getElementById('methodFilter').value,
            timeFilter: document.getElementById('timeFilter').value,
            searchText: document.getElementById('logsSearch').value.toLowerCase()
        };

        return Array.from(this.logs.values()).filter(log => {
            if (filters.status === 'success' && log.status >= 400) return false;
            if (filters.status === 'error' && log.status < 400) return false;
            if (filters.method !== 'all' && log.method !== filters.method) return false;

            const logTime = new Date(log.timestamp).getTime();
            const now = Date.now();
            if (filters.timeFilter === '5m' && now - logTime > 5 * 60 * 1000) return false;
            if (filters.timeFilter === '15m' && now - logTime > 15 * 60 * 1000) return false;
            if (filters.timeFilter === '1h' && now - logTime > 60 * 60 * 1000) return false;
            if (filters.timeFilter === '24h' && now - logTime > 24 * 60 * 1000) return false;

            if (filters.searchText && !JSON.stringify(log).toLowerCase().includes(filters.searchText)) return false;

            return true;
        });
    }

    displayLogs() {
        const filteredLogs = this.getFilteredLogs();
        const logsList = document.getElementById('logsList');
        if (!logsList) return;
        
        const currentScroll = logsList.scrollTop;
        logsList.innerHTML = filteredLogs.map(log => this.createLogEntry(log)).join('');
        
        // Preserve scroll position
        logsList.scrollTop = currentScroll;
    }

    createLogEntry(log) {
        const logId = this.getLogId(log);
        return `
            <div class="log-item" data-log-id="${logId}">
                <div class="log-header" onclick="logManager.toggleLogDetails(this)">
                    <span>${new Date(log.timestamp).toLocaleString()} - ${log.method} ${log.url}</span>
                    <span class="log-status log-status-${log.status}">${log.status}</span>
                </div>
                <div class="log-details${this.expandedStates.has(logId) ? ' expanded' : ''}">
                    <div class="log-meta">
                        <span>Response Time: ${log.responseTime}ms</span>
                        <span>IP: ${log.ip}</span>
                    </div>
                    <pre>${JSON.stringify(log, null, 2)}</pre>
                </div>
            </div>
        `;
    }

    toggleLogDetails(header) {
        const logId = header.closest('.log-item').dataset.logId;
        this.expandedStates.has(logId) 
            ? this.expandedStates.delete(logId)
            : this.expandedStates.add(logId);
        header.nextElementSibling.classList.toggle('expanded');
    }

    async clearLogs() {
        try {
            const response = await fetch('/api/admin/logs', { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to clear logs');
            this.logs.clear();
            this.expandedStates.clear();
            this.displayLogs();
            showToast('Logs cleared successfully', 'success');
        } catch (error) {
            console.error('Error clearing logs:', error);
            showToast('Error clearing logs: ' + error.message, 'error');
        }
    }

    exportLogs() {
        const logs = Array.from(this.logs.values());
        const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mockapi-logs-${new Date().toISOString()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    expandAllLogs() {
        const logIds = Array.from(this.logs.values()).map(log => this.getLogId(log));
        logIds.forEach(id => this.expandedStates.add(id));
        this.displayLogs();
    }

    collapseAllLogs() {
        this.expandedStates.clear();
        this.displayLogs();
    }

    startAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        // Refresh logs every 2 seconds
        this.refreshInterval = setInterval(async () => {
            try {
                const response = await fetch('/api/admin/logs');
                if (!response.ok) throw new Error('Failed to fetch logs');
                const logs = await response.json();
                this.updateLogs(logs);
            } catch (error) {
                console.error('Auto-refresh error:', error);
                // Don't show toast for auto-refresh errors to avoid spam
            }
        }, 2000);
    }

    cleanup() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    restartIfActive() {
        const logsTabActive = document.querySelector('.tab-btn[data-tab="logs"].active');
        if (logsTabActive && !this.refreshInterval) {
            this.loadLogs();
            this.startAutoRefresh();
        }
    }

    searchLogs(query) {
        const searchText = query.toLowerCase();
        return Array.from(this.logs.values()).filter(log => 
            JSON.stringify(log).toLowerCase().includes(searchText)
        );
    }

    refreshLogs() {
        const currentScrollPosition = document.getElementById('logsList').scrollTop;
        this.loadLogs().then(() => {
            document.getElementById('logsList').scrollTop = currentScrollPosition;
        });
    }
}

export const logManager = new LogsManager();
