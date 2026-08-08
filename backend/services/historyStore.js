import fs from 'fs';
import path from 'path';
import os from 'os';

// On Vercel / serverless, write to /tmp directory instead of read-only /var/task/
const DATA_DIR = process.env.VERCEL 
  ? path.join(os.tmpdir(), 'data')
  : path.resolve(process.cwd(), 'data');

const HISTORY_FILE = path.join(DATA_DIR, 'session_history.json');
const PREFERENCES_FILE = path.join(DATA_DIR, 'user_preferences.json');

// In-memory fallback if disk operations fail on serverless
let memoryHistory = [];
let memoryPreferences = {
  favoriteGenres: ['Shooter', 'Puzzle', 'Strategy'],
  preferredPlatforms: ['PC', 'Web'],
  likedGames: []
};

// Safely ensure data directory exists without crashing on read-only environments
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('[HistoryStore] Filesystem write protected, using in-memory store:', e.message);
}

export class HistoryStore {
  static getHistory() {
    try {
      if (fs.existsSync(HISTORY_FILE)) {
        const raw = fs.readFileSync(HISTORY_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('[HistoryStore] Reading memory history fallback');
    }
    return memoryHistory;
  }

  static addHistoryEntry(entry) {
    const history = this.getHistory();
    const newEntry = {
      id: `hist_${Date.now()}`,
      timestamp: new Date().toISOString(),
      prompt: entry.prompt,
      archetype: entry.archetype,
      isGeneratable: entry.isGeneratable,
      attributes: entry.attributes,
      gameConfig: entry.gameConfig || null
    };

    history.unshift(newEntry);
    const trimmed = history.slice(0, 30); // Keep last 30 searches
    memoryHistory = trimmed;

    try {
      if (fs.existsSync(DATA_DIR)) {
        fs.writeFileSync(HISTORY_FILE, JSON.stringify(trimmed, null, 2));
      }
    } catch (e) {
      console.warn('[HistoryStore] Updated in-memory history entry');
    }

    return newEntry;
  }

  static clearHistory() {
    memoryHistory = [];
    try {
      if (fs.existsSync(HISTORY_FILE)) {
        fs.writeFileSync(HISTORY_FILE, JSON.stringify([]));
      }
    } catch (e) {
      console.warn('[HistoryStore] Cleared in-memory history');
    }
    return [];
  }

  static getPreferences() {
    try {
      if (fs.existsSync(PREFERENCES_FILE)) {
        const raw = fs.readFileSync(PREFERENCES_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('[HistoryStore] Reading memory preferences fallback');
    }
    return memoryPreferences;
  }

  static savePreferences(prefs) {
    memoryPreferences = prefs;
    try {
      if (fs.existsSync(DATA_DIR)) {
        fs.writeFileSync(PREFERENCES_FILE, JSON.stringify(prefs, null, 2));
      }
    } catch (e) {
      console.warn('[HistoryStore] Saved in-memory preferences');
    }
    return prefs;
  }
}
