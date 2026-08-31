#!/usr/bin/env node

import readline from 'node:readline';
import { readFileSync } from 'node:fs';
import chalk from 'chalk';

import { search, SOURCES, parseSourceUrl, resolveUrl } from '../lib/search.js';
import { Player } from '../lib/player.js';
import { UI } from '../lib/ui.js';
import {
  CHANNELS, ACTIVITIES,
  getSuggestedChannel, getSuggestedActivity,
  pickActivityQuery, resolveChannel
} from '../lib/channels.js';
import {
  addRecent,
  getStorePaths,
  getTrackKey,
  isFavorite,
  loadStore,
  saveStore,
  toggleFavorite,
  updateConfig
} from '../lib/store.js';
import {
  buildDoctorReport,
  formatDependencyHelp,
  getMissingDependencies,
  openExternal,
  printHelp
} from '../lib/system.js';

const packageJson = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
);
const version = packageJson.version;
const args = process.argv.slice(2);
const doctorMode = args.includes('--doctor') || (args.length === 1 && args[0] === 'doctor');

if (args.includes('--help') || args.includes('-h')) {
  printHelp(version);
  process.exit(0);
}

if (args.includes('--version') || args.includes('-v')) {
  console.log(version);
  process.exit(0);
}

const store = loadStore();
saveStore(store);

if (doctorMode) {
  console.log(buildDoctorReport({ version, store, storePaths: getStorePaths() }));
  process.exit(0);
}

const ui = new UI();
const player = new Player();

let results = [];
let currentTrack = null;
let currentQuery = '';
let state = 'idle'; // idle | picker | searching | results | playing | search_input
let source = store.config.defaultSource;
let queue = [];
let history = [];
let resultsMeta = {
  title: 'search results',
  subtitle: '',
  kind: 'search'
};

ui.vizMode = store.config.vizMode;
ui.setTheme(store.config.theme);
ui.colorMode = store.config.colorMode;
player.volume = store.config.volume;

if (args.includes('--sc') || args.includes('--soundcloud')) {
  source = 'soundcloud';
}
if (args.includes('--mc') || args.includes('--mixcloud')) {
  source = 'mixcloud';
}

const LINK_TRACK_LIMIT = 100;

let pickerTab = 'vibes';
let vibesCursor = 0;
let activityCursor = 0;
let resultsCursor = 0;

const queryArgs = args
  .filter((arg) => !arg.startsWith('--'))
  .filter((arg) => arg !== 'doctor')
  .join(' ')
  .trim();

function cleanup(exitCode = 0) {
  ui.cleanup();
  // Kill mpv synchronously to prevent orphaned audio
  if (player.proc) {
    try { player.proc.kill('SIGKILL'); } catch {}
  }
  player.stop().then(() => process.exit(exitCode)).catch(() => process.exit(exitCode));
}

process.on('SIGINT', () => cleanup(0));
process.on('SIGTERM', () => cleanup(0));
process.on('exit', () => {
  // Last-resort: if mpv is still around, force kill
  if (player.proc) {
    try { player.proc.kill('SIGKILL'); } catch {}
  }
});

function saveAppState() {
  saveStore(store);
}

function persistConfig(partial) {
  updateConfig(store, partial);
  saveAppState();
}

function hydrateTrack(track) {
  return {
    ...track,
    favorite: isFavorite(store, track)
  };
}

function hydrateTracks(tracks) {
  return tracks.map(hydrateTrack);
}

function syncTrackFavoriteState(track, favorite) {
  const targetKey = getTrackKey(track);
  const apply = (item) => getTrackKey(item) === targetKey
    ? { ...item, favorite }
    : item;

  results = results.map(apply);
  queue = queue.map(apply);
  history = history.map(apply);

  if (currentTrack && getTrackKey(currentTrack) === targetKey) {
    currentTrack = { ...currentTrack, favorite };
  }
}

function toggleFavoriteForTrack(track) {
  const favorite = toggleFavorite(store, track);
  saveAppState();
  syncTrackFavoriteState(track, favorite);
  return favorite;
}

function setSequenceFromList(list, index) {
  history = hydrateTracks(list.slice(0, index));
  queue = hydrateTracks(list.slice(index + 1));
}

function cycleSource() {
  const idx = SOURCES.indexOf(source);
  source = SOURCES[(idx + 1) % SOURCES.length];
  persistConfig({ defaultSource: source });
}

function toggleColorMode() {
  const current = ui.effectiveColorMode;
  ui.colorMode = current === 'dark' ? 'light' : 'dark';
  persistConfig({ colorMode: ui.colorMode });
}

function cycleThemeInApp(direction = 1) {
  ui.cycleTheme(direction);
  persistConfig({ theme: ui.themeName });

  if (state === 'picker') {
    renderPicker();
    return;
  }

  if (state === 'results') {
    renderResultsList();
    return;
  }

  if (state === 'playing') {
    renderPlaying();
    return;
  }

  if (state === 'search_input') {
    promptSearch();
  }
}

function enableRawKeys() {
  if (process.stdin.isTTY && !process.stdin.isRaw) {
    process.stdin.setRawMode(true);
  }
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
}

function disableRawKeys() {
  if (process.stdin.isTTY && process.stdin.isRaw) {
    process.stdin.setRawMode(false);
  }
}

function isUp(key) { return key === '\x1b[A' || key === 'k'; }
function isDown(key) { return key === '\x1b[B' || key === 'j'; }
function isLeft(key) { return key === '\x1b[D' || key === 'h'; }
function isRight(key) { return key === '\x1b[C' || key === 'l'; }

function renderPlaying() {
  const src = currentTrack?.source || 'youtube';
  let out = '';
  out += ui.header(src);
  out += '\n';

  if (currentTrack) {
    out += ui.nowPlaying(
      currentTrack.title,
      currentTrack.channel,
      player.duration || currentTrack.duration,
      src,
      {
        favorite: currentTrack.favorite,
        queueLength: queue.length,
        historyLength: history.length
      }
    );
  }

  out += '\n\n';
  const duration = player.duration || currentTrack?.duration;

  if (ui.vizMode === 'tape') {
    out += ui.renderTape(player.position, duration);
  } else if (ui.vizMode === 'wave') {
    out += ui.renderWaveform();
  } else if (ui.vizMode === 'rain') {
    out += ui.renderRain();
  } else if (ui.vizMode === 'flame') {
    out += ui.renderFlame();
  } else {
    out += ui.renderBars();
  }

  out += '\n\n';
  out += ui.progressBar(player.position, duration);
  out += '\n\n';
  out += ui.controls(player.paused, {
    queueLength: queue.length,
    canGoBack: history.length > 0,
    isFavorite: currentTrack?.favorite
  });

  // Flicker-free render: cursor home, clear each line's trailing chars, clear below
  process.stdout.write('\x1b[H' + out.replace(/\n/g, '\x1b[K\n') + '\x1b[J');
}

function renderPicker() {
  ui.clear();
  process.stdout.write(ui.header(source));
  const cursor = pickerTab === 'vibes' ? vibesCursor : activityCursor;
  const items = pickerTab === 'vibes' ? CHANNELS : ACTIVITIES;
  process.stdout.write(ui.picker(items, cursor, pickerTab, {
    source,
    favoritesCount: store.favorites.length,
    recentsCount: store.recents.length
  }));
}

function renderResultsList() {
  ui.clear();
  process.stdout.write(ui.header(source));
  process.stdout.write(ui.resultsList(results, resultsCursor, resultsMeta));
}

function showPicker() {
  state = 'picker';
  vibesCursor = getSuggestedChannel();
  activityCursor = getSuggestedActivity();
  ui.hideCursor();
  enableRawKeys();
  renderPicker();
}

function setResultsView(items, meta) {
  results = hydrateTracks(items);
  resultsMeta = meta;
  state = 'results';
  resultsCursor = 0;
  ui.hideCursor();
  enableRawKeys();
  renderResultsList();
}

function showFavorites() {
  setResultsView(store.favorites, {
    title: 'favorites',
    subtitle: `${store.favorites.length} saved track${store.favorites.length === 1 ? '' : 's'}`,
    kind: 'favorites',
    emptyMessage: 'no favorites yet. press f while browsing or playing to save one.',
    footer: 'enter play · f unfavorite · / search · b back · m source · t theme · d mode · q quit'
  });
}

function showRecents() {
  setResultsView(store.recents, {
    title: 'recently played',
    subtitle: `${store.recents.length} recent track${store.recents.length === 1 ? '' : 's'}`,
    kind: 'recents',
    emptyMessage: 'no recents yet. play something and it will show up here.',
    footer: 'enter play · f favorite · / search · b back · m source · t theme · d mode · q quit'
  });
}

// Runs an async task behind the animated loader. Never throws: the caller
// decides how to present success and failure.
async function runWithLoader(tips, task) {
  ui.hideCursor();
  enableRawKeys();
  ui.clear();
  process.stdout.write(ui.header(source));

  let frame = 0;
  let tipIdx = 0;
  const tipSwap = setInterval(() => {
    tipIdx = Math.min(tipIdx + 1, tips.length - 1);
  }, 3000);

  const spin = setInterval(() => {
    ui.moveTo(4, 1);
    process.stdout.write('\x1b[2K' + ui.spinner(frame++, tips[tipIdx]));
  }, 80);

  try {
    const value = await task();
    return { ok: true, value };
  } catch (err) {
    return { ok: false, error: err };
  } finally {
    clearInterval(spin);
    clearInterval(tipSwap);
  }
}

function showLoadFailure(label, err) {
  ui.clear();
  process.stdout.write(ui.header(source));
  process.stdout.write(`\n  ${chalk.red(label)} ${err.message}\n`);
  promptSearch();
}

async function doSearch(query) {
  const link = parseSourceUrl(query);
  if (link) {
    await doOpenLink(query, link);
    return;
  }

  currentQuery = query;
  state = 'searching';

  const outcome = await runWithLoader([
    `searching ${source}...`,
    'finding the best mixes...',
    'curating your vibe...',
    'almost there...'
  ], () => search(query, { source, limit: store.config.searchLimit }));

  if (!outcome.ok) {
    showLoadFailure('search failed:', outcome.error);
    return;
  }

  setResultsView(outcome.value, {
    title: 'search results',
    subtitle: `${source} · ${query}`,
    kind: 'search',
    emptyMessage: `no ${source} results for “${query}”.`,
    footer: 'enter play · f favorite · / search · b back · m source · t theme · d mode · q quit'
  });
}

async function doOpenLink(rawUrl, link) {
  currentQuery = null;
  state = 'searching';
  source = link.source;

  const outcome = await runWithLoader([
    `opening ${link.source} link...`,
    'resolving track info...',
    'almost there...'
  ], () => resolveUrl(rawUrl, { limit: LINK_TRACK_LIMIT }));

  if (!outcome.ok) {
    showLoadFailure('link failed:', outcome.error);
    return;
  }

  const { tracks, kind, note } = outcome.value;
  const heading = kind === 'playlist' ? 'playlist' : 'linked track';

  let subtitle = `${link.source} · ${tracks.length} track${tracks.length === 1 ? '' : 's'}`;
  if (note) {
    subtitle = `${subtitle} · ${note}`;
  }

  setResultsView(tracks, {
    title: heading,
    subtitle,
    kind: 'link',
    emptyMessage: 'that link resolved to no playable tracks.',
    footer: 'enter play · f favorite · / search · b back · m source · t theme · d mode · q quit'
  });
}

async function playTrack(track) {
  const hydrated = hydrateTrack(track);
  currentTrack = hydrated;
  addRecent(store, hydrated);
  saveAppState();

  state = 'playing';
  ui.hideCursor();
  enableRawKeys();

  let frame = 0;
  let loadingStage = 'connecting';
  const loadingAnim = setInterval(() => {
    const content = ui.loadingScreen(frame++, hydrated, source, loadingStage);
    process.stdout.write('\x1b[H' + content.replace(/\n/g, '\x1b[K\n') + '\x1b[J');
  }, 60);

  try {
    await player.play(hydrated.url);
    loadingStage = 'buffering';

    await new Promise((resolve) => {
      let checks = 0;
      const poll = setInterval(() => {
        if (player.position > 0.5 || player.duration > 0) {
          clearInterval(poll);
          loadingStage = 'ready';
          setTimeout(resolve, 400);
        }
        if (++checks > 300) {
          clearInterval(poll);
          resolve();
        }
      }, 100);
    });

    clearInterval(loadingAnim);
    ui.startVisualizer(() => renderPlaying());
  } catch (err) {
    clearInterval(loadingAnim);
    ui.clear();
    process.stdout.write(ui.header(source));
    process.stdout.write(`\n  ${chalk.red('playback error:')} ${err.message}\n`);
    setTimeout(() => promptSearch(), 2000);
  }
}

async function playSelectedResult(index) {
  if (!results.length) return;
  setSequenceFromList(results, index);
  await playTrack(results[index]);
}

async function playNextTrack() {
  if (!queue.length) return;
  if (currentTrack) history.push(hydrateTrack(currentTrack));
  const nextTrack = queue.shift();
  await playTrack(nextTrack);
}

async function playPreviousTrack() {
  if (!history.length) return;
  if (currentTrack) queue.unshift(hydrateTrack(currentTrack));
  const previousTrack = history.pop();
  await playTrack(previousTrack);
}

async function rerunCurrentQueryWithNextSource() {
  cycleSource();

  if (resultsMeta.kind === 'search' && currentQuery) {
    await doSearch(currentQuery);
    return;
  }

  if (state === 'picker') {
    renderPicker();
    return;
  }

  if (state === 'results') {
    renderResultsList();
  }
}

function promptSearch() {
  state = 'search_input';
  ui.stopVisualizer();
  disableRawKeys();
  ui.showCursor();

  ui.clear();
  process.stdout.write(ui.header(source) + '\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question(ui.searchPrompt(), (answer) => {
    rl.close();
    const query = answer.trim();
    if (!query) {
      promptSearch();
      return;
    }
    void doSearch(query);
  });
}

process.stdin.on('data', async (key) => {
  if (key === '\x03') {
    cleanup(0);
    return;
  }

  if (state === 'picker') {
    if (key === '\t' || isLeft(key) || isRight(key)) {
      pickerTab = pickerTab === 'vibes' ? 'activities' : 'vibes';
      renderPicker();
      return;
    }

    const items = pickerTab === 'vibes' ? CHANNELS : ACTIVITIES;
    const cursor = pickerTab === 'vibes' ? vibesCursor : activityCursor;

    if (isUp(key)) {
      const next = (cursor - 1 + items.length) % items.length;
      if (pickerTab === 'vibes') vibesCursor = next;
      else activityCursor = next;
      renderPicker();
      return;
    }

    if (isDown(key)) {
      const next = (cursor + 1) % items.length;
      if (pickerTab === 'vibes') vibesCursor = next;
      else activityCursor = next;
      renderPicker();
      return;
    }

    if (key === '\r' || key === '\n') {
      const item = items[cursor];
      const query = pickerTab === 'vibes' ? item.query : pickActivityQuery(item);
      await doSearch(query);
      return;
    }

    const match = items.find((item) => item.key === key);
    if (match) {
      const query = pickerTab === 'vibes' ? match.query : pickActivityQuery(match);
      await doSearch(query);
      return;
    }

    if (key === '/') {
      promptSearch();
      return;
    }

    if (key === 'f') {
      showFavorites();
      return;
    }

    if (key === 'r') {
      showRecents();
      return;
    }

    if (key === 'm') {
      cycleSource();
      renderPicker();
      return;
    }

    if (key === 't' || key === 'T') {
      cycleThemeInApp(key === 'T' ? -1 : 1);
      return;
    }

    if (key === 'd') {
      toggleColorMode();
      renderPicker();
      return;
    }

    if (key === 'q') {
      cleanup(0);
    }
  }

  if (state === 'results') {
    if (!results.length) {
      if (key === '/' || key === 's') {
        promptSearch();
        return;
      }
      if (key === 'b') {
        showPicker();
        return;
      }
      if (key === 'm') {
        await rerunCurrentQueryWithNextSource();
        return;
      }
      if (key === 't' || key === 'T') {
        cycleThemeInApp(key === 'T' ? -1 : 1);
        return;
      }
      if (key === 'd') {
        toggleColorMode();
        renderResultsList();
        return;
      }
      if (key === 'q') {
        cleanup(0);
      }
      return;
    }

    if (isUp(key)) {
      resultsCursor = (resultsCursor - 1 + results.length) % results.length;
      renderResultsList();
      return;
    }

    if (isDown(key)) {
      resultsCursor = (resultsCursor + 1) % results.length;
      renderResultsList();
      return;
    }

    if (key === '\r' || key === '\n') {
      await playSelectedResult(resultsCursor);
      return;
    }

    const number = Number.parseInt(key, 10);
    if (number >= 1 && number <= results.length) {
      await playSelectedResult(number - 1);
      return;
    }

    if (key === 'f') {
      toggleFavoriteForTrack(results[resultsCursor]);
      renderResultsList();
      return;
    }

    if (key === '/' || key === 's') {
      promptSearch();
      return;
    }

    if (key === 'b') {
      showPicker();
      return;
    }

    if (key === 'm') {
      await rerunCurrentQueryWithNextSource();
      return;
    }

    if (key === 't' || key === 'T') {
      cycleThemeInApp(key === 'T' ? -1 : 1);
      return;
    }

    if (key === 'd') {
      toggleColorMode();
      renderResultsList();
      return;
    }

    if (key === 'q') {
      cleanup(0);
    }
  }

  if (state === 'playing') {
    if (key === ' ') {
      await player.togglePause();
      return;
    }

    if (key === '/') {
      ui.stopVisualizer();
      await player.stop();
      promptSearch();
      return;
    }

    if (key === 'b') {
      ui.stopVisualizer();
      await player.stop();
      showPicker();
      return;
    }

    if (key === '[') {
      await player.seekRelative(-10);
      return;
    }

    if (key === ']') {
      await player.seekRelative(10);
      return;
    }

    if (key === 'v') {
      ui.toggleVizMode();
      persistConfig({ vizMode: ui.vizMode });
      renderPlaying();
      return;
    }

    if (key === 't' || key === 'T') {
      cycleThemeInApp(key === 'T' ? -1 : 1);
      return;
    }

    if (key === 'd') {
      toggleColorMode();
      renderPlaying();
      return;
    }

    if (key === 'f' && currentTrack) {
      toggleFavoriteForTrack(currentTrack);
      renderPlaying();
      return;
    }

    if (key === 'n') {
      await playNextTrack();
      return;
    }

    if (key === 'p') {
      await playPreviousTrack();
      return;
    }

    if (key === 'o' && currentTrack) {
      try {
        await openExternal(currentTrack.url);
      } catch {
        renderPlaying();
      }
      return;
    }

    if (key === '-') {
      await player.setVolume(player.volume - 10);
      persistConfig({ volume: player.volume });
      renderPlaying();
      return;
    }

    if (key === '=' || key === '+') {
      await player.setVolume(player.volume + 10);
      persistConfig({ volume: player.volume });
      renderPlaying();
      return;
    }

    if (key === 'q') {
      cleanup(0);
    }
  }
});

player.on('pause', (paused) => {
  if (state !== 'playing') return;
  if (paused) ui.pauseVisualizer();
  else ui.resumeVisualizer();
});

player.on('ended', async () => {
  if (state !== 'playing') return;
  ui.stopVisualizer();

  if (queue.length > 0) {
    try {
      await playNextTrack();
      return;
    } catch {
      showPicker();
      return;
    }
  }

  showPicker();
});

async function main() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    console.error('sonic requires an interactive terminal. use `sonic doctor` for non-interactive diagnostics.');
    process.exit(1);
  }

  const missingDependencies = getMissingDependencies();
  if (missingDependencies.length > 0) {
    console.error(formatDependencyHelp(missingDependencies));
    process.exit(1);
  }

  ui.hideCursor();

  if (queryArgs) {
    const channel = resolveChannel(queryArgs);
    enableRawKeys();
    await doSearch(channel ? channel.query : queryArgs);
    return;
  }

  showPicker();
}

main().catch((err) => {
  ui.cleanup();
  console.error(err);
  process.exit(1);
});
