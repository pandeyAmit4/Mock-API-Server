import { getSettings } from './settings.js';

// Log levels enum
export const LogLevel = {
    ERROR: 'error',
    WARN: 'warn',
    INFO: 'info',
    DEBUG: 'debug'
};

class Logger {
    constructor() {
        this.logs = [];
        this.maxLogs = 1000; // Maximum number of logs to keep
        this.logLevel = LogLevel.INFO; // Default log level
    }

    setLogLevel(level) {
        if (!Object.values(LogLevel).includes(level)) {
            throw new Error(`Invalid log level: ${level}`);
        }
        this.logLevel = level;
    }

    shouldLog(level) {
        const levels = Object.values(LogLevel);
        return levels.indexOf(level) <= levels.indexOf(this.logLevel);
    }

    // Enhanced log method with levels
    log(level, message, metadata = {}) {
        if (!this.shouldLog(level)) return;

        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            ...metadata
        };

        this.addLog(logEntry);
        
        // Only log to console if it's not a test environment AND if metadata is not empty
        if (process.env.NODE_ENV !== 'test' && Object.keys(metadata).length > 0) {
            const colors = {
                error: '\x1b[31m',
                warn: '\x1b[33m',
                info: '\x1b[36m',
                debug: '\x1b[90m'
            };
            console.log(`${colors[level]}[${logEntry.timestamp}] ${level.toUpperCase()}: ${message}\x1b[0m`, metadata);
        }
    }

    error(message, metadata = {}) {
        this.log(LogLevel.ERROR, message, metadata);
    }

    warn(message, metadata = {}) {
        this.log(LogLevel.WARN, message, metadata);
    }

    info(message, metadata = {}) {
        this.log(LogLevel.INFO, message, metadata);
    }

    debug(message, metadata = {}) {
        this.log(LogLevel.DEBUG, message, metadata);
    }

    addLog(log) {
        // Add timestamp if not present
        if (!log.timestamp) {
            log.timestamp = new Date().toISOString();
        }

        // Add to beginning of array for reverse chronological order
        this.logs.unshift(log);

        // Trim logs if exceeding max
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(0, this.maxLogs);
        }

        // Remove the debug console.log that's causing undefined outputs
    }

    getLogs(limit = 100) {
        // console.log('Getting logs, total:', this.logs.length);  // Debug log
        return this.logs.slice(0, Math.min(limit, this.logs.length));
    }

    clear() {
        console.log('Clearing logs');  // Debug log
        this.logs = [];
    }
}

// Create log entry with enhanced error handling
export function createRequestLog(req, res, responseTime) {
    try {
        const settings = getSettings();
        const { verbose = false, logBody = false, logHeaders = false } = settings?.logging || {};

        const log = {
            timestamp: new Date().toISOString(),
            level: res.statusCode >= 400 ? LogLevel.ERROR : LogLevel.INFO,
            method: req.method,
            url: req.originalUrl || req.url,
            status: res.statusCode,
            responseTime,
            ip: req.ip || req.connection.remoteAddress
        };

        // Add verbose information if enabled
        if (verbose) {
            if (logBody && req.body && Object.keys(req.body).length > 0) {
                log.body = req.body;
            }

            if (logHeaders && req.headers) {
                log.headers = req.headers;
            }

            if (req.query && Object.keys(req.query).length > 0) {
                log.query = req.query;
            }

            if (req.params && Object.keys(req.params).length > 0) {
                log.params = req.params;
            }
        }

        return log;
    } catch (error) {
        console.error('Error creating request log:', error);
        return {
            timestamp: new Date().toISOString(),
            level: LogLevel.ERROR,
            message: 'Error creating request log',
            error: error.message
        };
    }
}

// Export singleton instance
export const logger = new Logger();
