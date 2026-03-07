import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { DEFAULT_THEME, normalizeThemeId } from './themes.js';

const VALID_SOURCES = ['youtube', 'soundcloud', 'mixcloud'];

const APP_DIR = join(homedir(), '.config', 'sonic');
const STORE_PATH = join(APP_DIR, 'store.json');
const MAX_FAVORITES = 100;
const MAX_RECENTS = 25;

const DEFAULT_STORE = {
  version: 1,
  config: {
    defaultSource: 'youtube',
    theme: DEFAULT_THEME,
    vizMode: 'bars',
    volume: 100,
    searchLimit: 5,
    colorMode: 'auto'
  },
  favorites: [],
  recents: []
};

function clampInt(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function normalizeTrack(track, timestampField = null) {
  if (!track || typeof track !== 'object') return null;
  if (!track.url || !track.title) return null;

  const normalized = {
    id: track.id || null,
    title: String(track.title),
    url: String(track.url),
    duration: Number.isFinite(track.duration) ? track.duration : null,
    channel: track.channel ? String(track.channel) : '',
    source: VALID_SOURCES.includes(track.source) ? track.source : 'youtube'
  };

  if (timestampField) {
    const stamp = track[timestampField];
    normalized[timestampField] = typeof stamp === 'string' && stamp ? stamp : new Date().toISOString();
  }

  return normalized;
}

function dedupeTracks(tracks, timestampField, maxItems) {
  const seen = new Set();
  const output = [];

  for (const track of tracks) {
    const normalized = normalizeTrack(track, timestampField);
    if (!normalized) continue;

    const key = getTrackKey(normalized);
    if (seen.has(key)) continue;

    seen.add(key);
    output.push(normalized);

    if (output.length >= maxItems) break;
  }

  return output;
}

function normalizeStore(raw) {
  const config = raw?.config || {};

  return {
    version: 1,
    config: {
      defaultSource: VALID_SOURCES.includes(config.defaultSource) ? config.defaultSource : 'youtube',
      theme: normalizeThemeId(config.theme),
      vizMode: typeof config.vizMode === 'string' && config.vizMode ? config.vizMode : DEFAULT_STORE.config.vizMode,
      volume: clampInt(config.volume, 0, 150, DEFAULT_STORE.config.volume),
      searchLimit: clampInt(config.searchLimit, 1, 10, DEFAULT_STORE.config.searchLimit),
      colorMode: ['auto', 'dark', 'light'].includes(config.colorMode) ? config.colorMode : 'auto'
    },
    favorites: dedupeTracks(raw?.favorites || [], 'savedAt', MAX_FAVORITES),
    recents: dedupeTracks(raw?.recents || [], 'playedAt', MAX_RECENTS)
  };
}

export function getStorePaths() {
  return {
    appDir: APP_DIR,
    storePath: STORE_PATH
  };
}

export function loadStore() {
  if (!existsSync(STORE_PATH)) {
    return structuredClone(DEFAULT_STORE);
  }

  try {
    const raw = JSON.parse(readFileSync(STORE_PATH, 'utf8'));
    return normalizeStore(raw);
  } catch {
    return structuredClone(DEFAULT_STORE);
  }
}

export function saveStore(store) {
  mkdirSync(APP_DIR, { recursive: true });
  writeFileSync(STORE_PATH, JSON.stringify(normalizeStore(store), null, 2) + '\n', 'utf8');
}

export function updateConfig(store, partialConfig) {
  store.config = normalizeStore({
    ...store,
    config: {
      ...store.config,
      ...partialConfig
    }
  }).config;
}

export function getTrackKey(track) {
  const source = VALID_SOURCES.includes(track?.source) ? track.source : 'youtube';
  const identity = track?.id || track?.url || track?.title || 'unknown';
  return `${source}:${identity}`;
}

export function isFavorite(store, track) {
  const key = getTrackKey(track);
  return store.favorites.some((favorite) => getTrackKey(favorite) === key);
}

export function toggleFavorite(store, track) {
  const key = getTrackKey(track);
  const existingIndex = store.favorites.findIndex((favorite) => getTrackKey(favorite) === key);

  if (existingIndex >= 0) {
    store.favorites.splice(existingIndex, 1);
    return false;
  }

  const favorite = normalizeTrack({
    ...track,
    savedAt: new Date().toISOString()
  }, 'savedAt');

  if (favorite) {
    store.favorites.unshift(favorite);
    store.favorites = dedupeTracks(store.favorites, 'savedAt', MAX_FAVORITES);
  }

  return true;
}

export function addRecent(store, track) {
  const recent = normalizeTrack({
    ...track,
    playedAt: new Date().toISOString()
  }, 'playedAt');

  if (!recent) return;

  store.recents.unshift(recent);
  store.recents = dedupeTracks(store.recents, 'playedAt', MAX_RECENTS);
}
