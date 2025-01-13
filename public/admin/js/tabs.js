import { routeManager } from './routes.js';
import { logManager } from './logs.js';
import { storageManager } from './storage.js';

export class TabManager {
    constructor() {
        this.activeTab = null;
    }

    init() {
        this.setupTabHandlers();
        // Set initial active tab
        const defaultTab = document.querySelector('.tab-btn.active');
        if (defaultTab) {
            this.switchTab(defaultTab);
        }
    }

    setupTabHandlers() {
        document.querySelectorAll('.tab-btn').forEach(button => {
            button.addEventListener('click', () => this.switchTab(button));
        });
    }

    switchTab(button) {
        // Deactivate current tabs
        document.querySelectorAll('.tab-btn').forEach(btn => 
            btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => 
            content.classList.remove('active'));
        
        // Activate new tab
        button.classList.add('active');
        const tab = button.dataset.tab;
        document.getElementById(tab).classList.add('active');
        this.activeTab = tab;

        // Handle tab-specific initialization
        const { routeManager, logManager, storageManager } = window;
        
        switch(tab) {
            case 'logs':
                logManager.init();
                break;
            case 'storage':
                storageManager.displayStorageInfo(routeManager.routes);
                storageManager.startAutoUpdate(routeManager.routes);
                break;
            case 'routes':
                routeManager.loadRoutes();
                break;
        }

        // Cleanup other tabs
        if (tab !== 'logs') {
            logManager.cleanup();
        }
        if (tab !== 'storage') {
            storageManager.stopAutoUpdate();
        }
    }

    getActiveTab() {
        return this.activeTab;
    }
}

export const tabManager = new TabManager();

// Initialize tabs when document is ready
document.addEventListener('DOMContentLoaded', () => {
    tabManager.init();
});
