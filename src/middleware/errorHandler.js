import { StatusCodes } from 'http-status-codes';
import { logger, LogLevel } from '../utils/logger.js';

export class AppError extends Error {
    constructor(message, statusCode = 500, details = {}) {
        super(message);
        this.statusCode = statusCode;
        this.details = details;
        this.timestamp = new Date().toISOString();
    }
}

export const errorHandler = (err, req, res, next) => {
    const error = {
        message: err.message || 'Internal Server Error',
        status: err.statusCode || 500,
        timestamp: err.timestamp || new Date().toISOString(),
        path: req.path,
        method: req.method
    };

    // Add details for non-production environments
    if (process.env.NODE_ENV !== 'production') {
        error.details = err.details || {};
        error.stack = err.stack;
    }

    // Log error with appropriate level
    const level = error.status >= 500 ? LogLevel.ERROR : LogLevel.WARN;
    logger.log(level, error.message, error);

    res.status(error.status).json(error);
};
