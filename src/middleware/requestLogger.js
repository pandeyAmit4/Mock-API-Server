import { getSettings } from '../utils/settings.js';

export function requestLogger(req, res, next) {
  const settings = getSettings();
  
  if (!settings?.logging?.enabled) {
    return next();
  }

  const start = Date.now();
  const timestamp = new Date().toISOString();

  // Add response time tracking
  const originalSend = res.send;
  res.send = function(body) {
    const duration = Date.now() - start;
    const log = settings.logging.format
      .replace(':timestamp', timestamp)
      .replace(':method', req.method)
      .replace(':url', req.url)
      .replace(':status', res.statusCode)
      .replace(':response-time', duration);

    console.log(log);
    return originalSend.call(this, body);
  };

  next();
}
