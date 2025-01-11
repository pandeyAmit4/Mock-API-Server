import { getSettings } from './settings.js';

export async function applyDelay(routeDelay) {
  const settings = getSettings();
  const delaySettings = settings?.delay || { enabled: true, default: 0, min: 0, max: 5000 };

  if (!delaySettings.enabled) {
    return;
  }

  const delay = typeof routeDelay === 'number' ? 
    Math.min(Math.max(routeDelay, delaySettings.min), delaySettings.max) : 
    delaySettings.default;

  if (delay > 0) {
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}
