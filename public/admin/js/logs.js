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
            methodFilter: document.getElementById('logsMethodFilter'),
            timeFilter: document.getElementById('timeFilter'),
            logsSearch: document.getElementById('logsSearch'),
            clearLogs: document.getElementById('clearLogs'),
            exportLogs: document.getElementById('exportLogs'),
            expandAll: document.getElementById('expandAll'),
            collapseAll: document.getElementById('collapseAll'),
            refreshLogs: document.getElementById('refreshLogs')
        };

        // Immediate filtering for dropdown changes
        if (elements.statusFilter) {
            elements.statusFilter.addEventListener('change', () => this.loadLogs());
        }
        console.log('Method filter:', elements.methodFilter);
        if (elements.methodFilter) {
            elements.methodFilter.addEventListener('change', () => {
                console.log('Method filter changed:', elements.methodFilter.value);
                this.loadLogs();
            });
        }
        if (elements.timeFilter) {
            elements.timeFilter.addEventListener('change', () => this.loadLogs());
        }

        // Debounced filtering for search input
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
            const loader = this.createLoadingIndicator(elements.refreshLogs);
            loader.start();
            elements.refreshLogs.addEventListener('click', () => {
                this.refreshLogs()
                    .finally(() => loader.stop());
            });
        }
    }

    async loadLogs() {
        try {
            const response = await fetch('/api/admin/logs');
            if (!response.ok) throw new Error('Failed to load logs');
            const logs = await response.json();
            this.updateLogs(logs);
        } catch (error) {
            console.error('Error loading logs:', error);
            showToast('Error loading logs', 'error');
        }
    }

    updateLogs(newLogs) {
        // Clear old logs first to ensure we have the latest data
        this.logs.clear();
        newLogs.forEach(log => {
            const logId = this.getLogId(log);
            this.logs.set(logId, log);
        });
        requestAnimationFrame(() => this.displayLogs()); // Use requestAnimationFrame for smoother updates
    }

    getLogId(log) {
        return `${log.timestamp}-${log.method}-${log.url}-${log.status}`;
    }

    getFilteredLogs() {
        const statusFilter = document.getElementById('statusFilter')?.value || 'all';
        const methodFilter = document.getElementById('logsMethodFilter')?.value || 'all';
        const timeFilter = document.getElementById('timeFilter')?.value || 'all';
        const searchText = document.getElementById('logsSearch')?.value.toLowerCase() || '';

        return Array.from(this.logs.values()).filter(log => {
            // Status filter
            if (statusFilter === 'success' && log.status >= 400) return false;
            if (statusFilter === 'error' && log.status < 400) return false;
            
            // Method filter - Make sure to match exact method
            if (methodFilter !== 'all' && log.method !== methodFilter) return false;

            // Time filter
            const logTime = new Date(log.timestamp).getTime();
            const now = Date.now();
            switch(timeFilter) {
                case '5m': if (now - logTime > 5 * 60 * 1000) return false; break;
                case '15m': if (now - logTime > 15 * 60 * 1000) return false; break;
                case '1h': if (now - logTime > 60 * 60 * 1000) return false; break;
                case '24h': if (now - logTime > 24 * 60 * 60 * 1000) return false; break;
            }

            // Text search
            if (searchText && !JSON.stringify(log).toLowerCase().includes(searchText)) return false;

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
        
        this.refreshInterval = setInterval(async () => {
            try {
                if (document.getElementById('logs').classList.contains('active')) {
                    await this.loadLogs();
                }
            } catch (error) {
                console.error('Auto-refresh error:', error);
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

    async refreshLogs() {
        const currentScrollPosition = document.getElementById('logsList')?.scrollTop || 0;
        await this.loadLogs();
        requestAnimationFrame(() => {
            const logsList = document.getElementById('logsList');
            if (logsList) {
                logsList.scrollTop = currentScrollPosition;
            }
        });
        showToast('Logs refreshed', 'info');
    }

    createLoadingIndicator(button) {
        const originalContent = button.innerHTML;
        return {
            start: () => {
                button.disabled = true;
                button.innerHTML = '<i class="material-icons loading">refresh</i> Refreshing...';
            },
            stop: () => {
                button.disabled = false;
                button.innerHTML = originalContent;
            }
        };
    }
}

export const logManager = new LogsManager();
