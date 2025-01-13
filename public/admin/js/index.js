import { RouteManager } from './routes.js';
import { LogsManager } from './logs.js';
import { StorageManager } from './storage.js';
import { ModalManager } from './modal.js';
import { TabManager } from './tabs.js';
import { showToast } from './toast.js';
import { handleApiError } from './utils.js';

class AdminApp {
    constructor() {
        // Initialize managers
        this.routeManager = new RouteManager();
        this.logManager = new LogsManager();
        this.storageManager = new StorageManager();
        this.modalManager = new ModalManager();
        this.tabManager = new TabManager();

        // Make managers globally available with proper binding
        window.routeManager = this.routeManager;
        window.logManager = this.logManager;
        window.storageManager = this.storageManager;
        window.modalManager = this.modalManager;
        window.tabManager = this.tabManager;

        // Bind methods to their managers for global access
        window.resetStorage = this.storageManager.resetStorage.bind(this.storageManager);
        window.createRoutes = this.routeManager.createRoutes.bind(this.routeManager);
        window.toggleLogDetails = this.logManager.toggleLogDetails.bind(this.logManager);
    }

    init() {
        // Initialize core functionality
        this.routeManager.init();
        this.logManager.init();
        this.tabManager.init();
        
        this.setupGlobalEventHandlers();
        this.loadInitialData();
    }

    setupGlobalEventHandlers() {
        // Unsaved changes warning
        window.addEventListener('beforeunload', (e) => {
            if (this.routeManager.hasUnsavedChanges) {
                e.preventDefault();
                return e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            }
        });

        // Tab visibility handling
        window.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.logManager.cleanup();
                this.storageManager.stopAutoUpdate();
            } else {
                const activeTab = this.tabManager.getActiveTab();
                if (activeTab === 'logs') {
                    this.logManager.restartIfActive();
                } else if (activeTab === 'storage') {
                    this.storageManager.startAutoUpdate(this.routeManager.routes);
                }
            }
        });

        // Global error handling
        window.addEventListener('unhandledrejection', (event) => {
            handleApiError(event.reason);
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case 's':
                        e.preventDefault();
                        this.routeManager.saveRoutes();
                        break;
                    case 'n':
                        e.preventDefault();
                        this.modalManager.show();
                        break;
                }
            }
        });
    }

    async loadInitialData() {
        try {
            await this.routeManager.loadRoutes();
            
            const defaultTab = document.querySelector('.tab-btn');
            if (defaultTab) {
                this.tabManager.switchTab(defaultTab);
            }

            showToast('Admin interface loaded successfully', 'success');
        } catch (error) {
            handleApiError(error);
        }
    }
}

// Initialize when DOM is ready
const app = new AdminApp();
document.addEventListener('DOMContentLoaded', () => app.init());

// Export for module usage
export default app;
