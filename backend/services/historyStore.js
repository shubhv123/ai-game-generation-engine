import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const HISTORY_FILE = path.join(DATA_DIR, 'session_history.json');
const PREFERENCES_FILE = path.join(DATA_DIR, 'user_preferences.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export class HistoryStore {
  static getHistory() {
    try {
      if (fs.existsSync(HISTORY_FILE)) {
        const raw = fs.readFileSync(HISTORY_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('[HistoryStore] Failed to read session history:', e.message);
    }
    return [];
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

    try {
      fs.writeFileSync(HISTORY_FILE, JSON.stringify(trimmed, null, 2));
    } catch (e) {
      console.error('[HistoryStore] Error saving session history:', e.message);
    }

    return newEntry;
  }

  static clearHistory() {
    try {
      fs.writeFileSync(HISTORY_FILE, JSON.stringify([]));
    } catch (e) {
      console.error('[HistoryStore] Error clearing history:', e.message);
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
      console.warn('[HistoryStore] Failed to read user preferences:', e.message);
    }
    return {
      favoriteGenres: ['Shooter', 'Puzzle', 'Strategy'],
      preferredPlatforms: ['PC', 'Web'],
      likedGames: []
    };
  }

  static savePreferences(prefs) {
    try {
      fs.writeFileSync(PREFERENCES_FILE, JSON.stringify(prefs, null, 2));
    } catch (e) {
      console.error('[HistoryStore] Error saving preferences:', e.message);
    }
    return prefs;
  }
}
