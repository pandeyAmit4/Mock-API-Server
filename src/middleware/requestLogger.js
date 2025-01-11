import { getSettings } from '../utils/settings.js';
import { logger, createRequestLog } from '../utils/logger.js';

export function requestLogger(req, res, next) {
    // Skip logging if disabled or admin request
    if (req.skipLogging || !getSettings()?.logging?.enabled) {
        return next();
    }

    const start = Date.now();

    // Add response finish handler
    res.on('finish', () => {
        // Double check path before logging
        if (req.skipLogging) {
            return;
        }

        const duration = Date.now() - start;
        const log = createRequestLog(req, res, duration);
        logger.addLog(log);

        const settings = getSettings();
        if (settings.logging.format) {
            const message = settings.logging.format
                .replace(':timestamp', log.timestamp)
                .replace(':method', log.method)
                .replace(':url', log.url)
                .replace(':status', log.status)
                .replace(':response-time', duration);

            console.log(message);
        }
    });

    next();
}
