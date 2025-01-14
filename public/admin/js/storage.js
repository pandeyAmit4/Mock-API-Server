import { showToast } from './toast.js';
import { DOMUpdater } from './utils/domUpdater.js';

export class StorageManager {
    constructor() {
        this.updateInterval = null;
    }

    async displayStorageInfo(routes) {
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
                            <div class="storage-actions">
                                <button onclick="storageManager.resetStorage('${path}')">Reset Storage</button>
                                <button onclick="storageManager.exportStorage('${path}')">Export</button>
                            </div>
                        </div>
                        <div class="storage-details" id="storage-${path.replace(/\//g, '-')}">
                            Loading...
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        persistentRoutes.forEach(path => this.updateStorageDetails(path));
    }

    async updateStorageDetails(path, previousData = null) {
        try {
            const resource = path.split('/').pop()
                .replace(/([a-z])([A-Z])/g, '$1-$2')
                .toLowerCase();
                
            const cleanPath = path.replace(/^\/api\//, '');
            const response = await fetch(`/api/admin/storage/${cleanPath}`);
            if (!response.ok) throw new Error('Failed to fetch storage info');
            const data = await response.json();
            const resourceKey = `${resource}s`;
            const currentData = data[resourceKey] || [];
            
            const detailsDiv = document.getElementById(`storage-${path.replace(/\//g, '-')}`);
            if (!detailsDiv) return;

            // First time load
            if (!detailsDiv.querySelector('.storage-stats')) {
                detailsDiv.innerHTML = `
                    <div class="storage-stats">
                        <div class="stat-item">
                            <p>Total Items: ${currentData.length}</p>
                            <p>Last Updated: ${new Date().toLocaleTimeString()}</p>
                        </div>
                    </div>
                    <div class="storage-preview">
                        <pre></pre>
                    </div>
                `;
            }

            // Update stats if count changed
            const statsDiv = detailsDiv.querySelector('.storage-stats');
            const previewDiv = detailsDiv.querySelector('.storage-preview pre');
            
            if (statsDiv) {
                statsDiv.innerHTML = this.createStatsHTML(currentData);
            }

            // Use DOMUpdater to calculate changes
            const prevItems = previousData ? previousData[resourceKey] || [] : [];
            const changes = DOMUpdater.calculateUpdates(prevItems, currentData, 'id');

            // Only update content if there are actual changes
            if (changes.added.length || changes.modified.length || changes.removed.length) {
                const formattedData = JSON.stringify(currentData, null, 2);
                if (previewDiv && previewDiv.textContent !== formattedData) {
                    // Use requestAnimationFrame for smooth updates
                    requestAnimationFrame(() => {
                        const scrollPos = previewDiv.scrollTop;
                        previewDiv.innerHTML = formattedData;
                        previewDiv.scrollTop = scrollPos;
                    });
                }
            }

            // Cache current data for next comparison
            detailsDiv.dataset.previousData = JSON.stringify(data);
            
            return data;
        } catch (error) {
            console.error(`Error fetching storage details for ${path}:`, error);
            const detailsDiv = document.getElementById(`storage-${path.replace(/\//g, '-')}`);
            if (detailsDiv) {
                detailsDiv.innerHTML = `<p class="error">Error loading storage details: ${error.message}</p>`;
            }
        }
    }

    createStatsHTML(data) {
        return `
            <div class="stat-item">
                <p>Total Items: ${data?.length || 0}</p>
                <p>Last Updated: ${new Date().toLocaleTimeString()}</p>
            </div>
        `;
    }

    async resetStorage(path) {
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
            await this.updateStorageDetails(path);
        } catch (error) {
            console.error('Error resetting storage:', error);
            showToast('Error resetting storage: ' + error.message, 'error');
        }
    }

    async exportStorage(path) {
        try {
            const cleanPath = path.replace(/^\/api\//, '');
            const response = await fetch(`/api/admin/storage/${cleanPath}`);
            if (!response.ok) throw new Error('Failed to fetch storage data');
            const data = await response.json();
            const resourceKey = `${cleanPath}s`;
            
            // Export the entire array of items
            const exportData = {
                [resourceKey]: data[resourceKey] || []
            };
            
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${cleanPath}-${new Date().toISOString()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showToast(`Storage data exported for ${path}`, 'success');
        } catch (error) {
            console.error('Error exporting storage:', error);
            showToast('Error exporting storage: ' + error.message, 'error');
        }
    }

    async importStorage(path, file) {
        try {
            const content = await file.text();
            const data = JSON.parse(content);
            
            const response = await fetch(`/api/admin/storage/${path}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error('Failed to import storage data');
            }

            await this.updateStorageDetails(path);
            showToast('Storage data imported successfully', 'success');
        } catch (error) {
            showToast(`Import failed: ${error.message}`, 'error');
        }
    }

    async backupAllStorage() {
        try {
            const allStorageData = {};
            for (const path of this.getPersistentPaths()) {
                const cleanPath = path.replace(/^\/api\//, '');
                const response = await fetch(`/api/admin/storage/${cleanPath}`);
                if (response.ok) {
                    allStorageData[cleanPath] = await response.json();
                }
            }
            
            const blob = new Blob([JSON.stringify(allStorageData, null, 2)], 
                { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `mockapi-storage-backup-${new Date().toISOString()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showToast('Storage backup created successfully', 'success');
        } catch (error) {
            showToast(`Backup failed: ${error.message}`, 'error');
        }
    }

    startAutoUpdate(routes) {
        this.stopAutoUpdate();
        this.updateInterval = setInterval(() => {
            if (document.querySelector('.tab-btn[data-tab="storage"].active')) {
                document.querySelectorAll('.storage-details').forEach(element => {
                    const path = element.id.replace('storage-', '').replace(/-/g, '/');
                    const previousData = element.dataset.previousData ? 
                        JSON.parse(element.dataset.previousData) : null;
                    this.updateStorageDetails(path, previousData);
                });
            }
        }, 5000);
    }

    stopAutoUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
}

export const storageManager = new StorageManager();
