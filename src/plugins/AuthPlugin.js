import { BasePlugin } from './BasePlugin.js';

export class AuthPlugin extends BasePlugin {
    constructor(options = {}) {
        super('auth-plugin', options);
        
        this.hooks = {
            beforeRequest: this.checkAuth.bind(this),
            customMiddleware: [(req, res, next) => {
                req.isAuthenticated = () => {
                    return req.headers['authorization'] === this.options.apiKey;
                };
                next();
            }]
        };
    }

    async checkAuth(req, res, next) {
        // Skip auth check for public routes
        if (this.isPublicRoute(req.path)) {
            return next();
        }

        const apiKey = req.headers['authorization'];
        if (apiKey !== this.options.apiKey) {
            res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid API key'
            });
            return;
        }
        next();
    }

    isPublicRoute(path) {
        return path.startsWith('/public') || 
               path.startsWith('/docs') || 
               path.startsWith('/admin');
    }
}
