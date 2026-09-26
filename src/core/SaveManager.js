// SaveManager: local persistence (no accounts, no server). Uses
// localStorage on web/PWA; any object with getItem/setItem can be injected
// (tests, or a native wrapper). Corrupt or missing data falls back safely.

import { SAVE_KEY } from '../config.js';

export const DEFAULTS = Object.freeze({
  version: 1,
  highScore: 0,
  bestTime: 0,
  gamesPlayed: 0,
  totalCoins: 0,
  muted: false,
  musicVolume: 0.7,
  sfxVolume: 0.8,
});

function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
}

export class SaveManager {
  constructor(storage) {
    if (!storage) {
      try {
        storage = globalThis.localStorage;
        const probe = '__cj_probe__';
        storage.setItem(probe, '1');
        storage.removeItem?.(probe);
      } catch {
        storage = null;
      }
    }
    this.storage = storage || memoryStorage();
    this.data = this.load();
  }

  load() {
    let raw = null;
    try {
      raw = this.storage.getItem(SAVE_KEY);
    } catch {
      raw = null;
    }
    const data = { ...DEFAULTS };
    if (!raw) return data;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        for (const k of Object.keys(DEFAULTS)) {
          const v = parsed[k];
          if (typeof v === typeof DEFAULTS[k] && (typeof v !== 'number' || Number.isFinite(v))) data[k] = v;
        }
      }
    } catch {
      /* corrupt save: keep defaults */
    }
    data.highScore = Math.max(0, Math.floor(data.highScore));
    data.musicVolume = Math.min(1, Math.max(0, data.musicVolume));
    data.sfxVolume = Math.min(1, Math.max(0, data.sfxVolume));
    return data;
  }

  save() {
    try {
      this.storage.setItem(SAVE_KEY, JSON.stringify(this.data));
      return true;
    } catch {
      return false;
    }
  }

  get(key) {
    return this.data[key];
  }

  set(key, value) {
    this.data[key] = value;
    this.save();
  }

  /** Record a finished run. Returns { newHighScore, newBestTime }. */
  recordRun(score, time, coins = 0) {
    const d = this.data;
    const newHighScore = score > d.highScore && score > 0;
    const newBestTime = time > d.bestTime;
    if (newHighScore) d.highScore = score;
    if (newBestTime) d.bestTime = Math.round(time * 10) / 10;
    d.gamesPlayed += 1;
    d.totalCoins += coins;
    this.save();
    return { newHighScore, newBestTime };
  }
}
