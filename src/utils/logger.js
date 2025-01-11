import { getSettings } from './settings.js';

class Logger {
  constructor() {
    this.logs = [];
    this.maxLogs = 1000;
  }

  addLog(log) {
    this.logs.unshift(log);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }
  }

  getLogs(limit = 100) {
    return this.logs.slice(0, limit);
  }

  clear() {
    this.logs = [];
  }
}

export const logger = new Logger();

export function createRequestLog(req, res, responseTime) {
  const settings = getSettings();
  const { verbose, logBody, logHeaders } = settings.logging;
  
  const log = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    status: res.statusCode,
    responseTime,
    ip: req.ip
  };

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
}
