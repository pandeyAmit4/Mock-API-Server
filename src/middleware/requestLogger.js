import { logger } from '../utils/logger.js';

export function requestLogger(req, res, next) {
    // Skip logging for admin and docs routes
    if (req.path.startsWith('/admin') || 
        req.path.startsWith('/api/admin') ||
        req.path.startsWith('/docs')) {
        return next();
    }

    const start = Date.now();

    // Capture response methods once
    const originalJson = res.json;
    const originalEnd = res.end;
    let logSent = false;

    // Override json method
    res.json = function(data) {
        if (!logSent) {
            logSent = true;
            const responseTime = Date.now() - start;
            logger.addLog({
                timestamp: new Date().toISOString(),
                method: req.method,
                url: req.originalUrl || req.url,
                status: res.statusCode,
                responseTime,
                ip: req.ip || req.connection.remoteAddress,
                body: req.body,
                response: data
            });
        }
        return originalJson.call(this, data);
    };

    // Override end for non-JSON responses
    res.end = function(...args) {
        if (!logSent) {
            logSent = true;
            const responseTime = Date.now() - start;
            logger.addLog({
                timestamp: new Date().toISOString(),
                method: req.method,
                url: req.originalUrl || req.url,
                status: res.statusCode,
                responseTime,
                ip: req.ip || req.connection.remoteAddress,
                body: req.body
            });
        }
        return originalEnd.apply(this, args);
    };

    next();
}
