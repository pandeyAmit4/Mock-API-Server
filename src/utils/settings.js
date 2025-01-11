import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const settingsPath = path.join(__dirname, '../../config/settings.json');

let cachedSettings = null;

export async function loadSettings() {
  try {
    const settings = JSON.parse(await fs.readFile(settingsPath, 'utf8'));
    cachedSettings = settings;
    return settings;
  } catch (error) {
    console.error('Error loading settings:', error);
    throw error;
  }
}

export function getSettings() {
  return cachedSettings;
}

// Watch for settings changes
fs.watch(path.dirname(settingsPath), async (eventType, filename) => {
  if (filename === 'settings.json') {
    try {
      await loadSettings();
      console.log('Settings reloaded successfully');
    } catch (error) {
      console.error('Error reloading settings:', error);
    }
  }
});
