export class PluginSystem {
    constructor() {
        this.plugins = new Map();
        this.hooks = {
            beforeRequest: [],
            afterRequest: [],
            beforeResponse: [],
            onError: [],
            onRouteLoad: [],
            customMiddleware: []
        };
    }

    register(plugin) {
        if (!plugin.name) {
            throw new Error('Plugin must have a name');
        }

        if (this.plugins.has(plugin.name)) {
            throw new Error(`Plugin ${plugin.name} is already registered`);
        }

        // Register hooks
        Object.entries(plugin.hooks || {}).forEach(([hook, handler]) => {
            if (this.hooks[hook]) {
                this.hooks[hook].push(handler);
            }
        });

        // Store plugin instance
        this.plugins.set(plugin.name, plugin);
        console.log(`Plugin ${plugin.name} registered successfully`);
    }

    async executeHook(hookName, ...args) {
        const hooks = this.hooks[hookName] || [];
        for (const hook of hooks) {
            await hook(...args);
        }
    }

    getMiddleware() {
        return this.hooks.customMiddleware;
    }
}

export const pluginSystem = new PluginSystem();
