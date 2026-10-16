#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';

import { search, SOURCES, parseSourceUrl, resolveUrl } from '../lib/search.js';
import { Player } from '../lib/player.js';
import {
  SpotifyPlayer,
  SpotifySetupError,
  detectBrowsers,
  hasHomebrew,
  hasSpogo,
  importLogin,
  isSpotifyConnected,
  listDevices,
  verifyLogin
} from '../lib/spotify.js';
import { UI } from '../lib/ui.js';
import { queryTerminalBackground } from '../lib/themes.js';
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
const connectMode = args.length === 1 && args[0] === 'connect';

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
const spotifyPlayer = new SpotifyPlayer();

let results = [];
let currentTrack = null;
let currentQuery = '';
let currentSearchOptions = {};
let state = 'idle'; // idle | picker | searching | results | playing | connect
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
if (args.includes('--sp') || args.includes('--spotify')) {
  source = 'spotify';
}

function spotifyReady() {
  return hasSpogo() && isSpotifyConnected();
}

function isSpotifyTrack() {
  return currentTrack?.source === 'spotify';
}

function activePlayer() {
  return isSpotifyTrack() ? spotifyPlayer : player;
}

const LINK_TRACK_LIMIT = 100;

let pickerTab = 'describe';
let vibesCursor = 0;
let activityCursor = 0;
let resultsCursor = 0;

const queryArgs = args
  .filter((arg) => !arg.startsWith('--'))
  .filter((arg) => arg !== 'doctor' && !(connectMode && arg === 'connect'))
  .join(' ')
  .trim();

function cleanup(exitCode = 0) {
  ui.cleanup();
  // Kill mpv synchronously to prevent orphaned audio
  if (player.proc) {
    try { player.proc.kill('SIGKILL'); } catch {}
  }
  Promise.all([
    player.stop().catch(() => {}),
    spotifyPlayer.stop().catch(() => {})
  ]).then(() => process.exit(exitCode));
}

// A crash must still stop the music and give the terminal back.
function crash(err) {
  try { ui.cleanup(); } catch {}
  if (player.proc) {
    try { player.proc.kill('SIGKILL'); } catch {}
  }
  if (process.stdin.isTTY && process.stdin.isRaw) process.stdin.setRawMode(false);
  console.error(`\nsonic hit a bug and stopped: ${err?.message || err}`);
  console.error('please report it: https://github.com/sethmills21/sonic/issues');
  if (process.env.SONIC_DEBUG) console.error(err?.stack);
  process.exit(1);
}

process.on('uncaughtException', crash);
process.on('unhandledRejection', crash);
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
  const p = activePlayer();
  const remote = src === 'spotify';
  const live = Boolean(currentTrack?.live);
  const duration = live ? 0 : (p.duration || currentTrack?.duration);
  const gap = ui.rows < 30 ? '\n' : '\n\n';

  let top = ui.header(src) + '\n';
  if (currentTrack) {
    top += ui.nowPlaying(currentTrack, { device: remote ? spotifyPlayer.device : null });
  }
  top += gap;

  let viz;
  if (ui.vizMode === 'tape') {
    viz = ui.renderTape(p.position, duration);
  } else if (ui.vizMode === 'wave') {
    viz = ui.renderWaveform();
  } else if (ui.vizMode === 'rain') {
    viz = ui.renderRain();
  } else if (ui.vizMode === 'flame') {
    viz = ui.renderFlame();
  } else {
    viz = ui.renderBars();
  }

  const bottom = gap
    + ui.progressBar(p.position, duration, { live }) + '\n'
    + ui.statusLine({
      volume: typeof p.volume === 'number' ? p.volume : null,
      upNext: !remote && queue.length ? queue[0].title : null
    })
    + gap
    + ui.controls(p.paused, {
      queueLength: remote ? 0 : queue.length,
      canGoBack: remote || history.length > 0,
      isFavorite: currentTrack?.favorite,
      canSeek: !live,
      canOpen: Boolean(currentTrack?.url)
    });

  // The visualizer gives up rows first so the header and controls stay on screen.
  const fixedRows = top.split('\n').length + bottom.split('\n').length - 1;
  const out = top + ui.fitRows(viz, ui.rows - fixedRows) + bottom;

  // Flicker-free render: cursor home, clear each line's trailing chars, clear below
  process.stdout.write('\x1b[H' + out.replace(/\n/g, '\x1b[K\n') + '\x1b[J');
}

function renderPicker() {
  const needsConnect = source === 'spotify' && !spotifyReady();
  const library = {
    source,
    favoritesCount: store.favorites.length,
    recentsCount: store.recents.length,
    sourceNote: needsConnect ? 'not connected yet · tab, then c to connect' : null,
    needsConnect
  };
  if (pickerTab === 'describe') {
    const screen = ui.header(source) + ui.describeTab({
      text: vibeText,
      examples: VIBE_EXAMPLES,
      exampleIdx,
      notice: vibeNotice,
      ...library
    });
    process.stdout.write('\x1b[H' + screen.replace(/\n/g, '\x1b[K\n') + '\x1b[J');
    return;
  }
  ui.clear();
  process.stdout.write(ui.header(source));
  const cursor = pickerTab === 'vibes' ? vibesCursor : activityCursor;
  const items = pickerTab === 'vibes' ? CHANNELS : ACTIVITIES;
  process.stdout.write(ui.picker(items, cursor, pickerTab, {
    ...library,
    sourceNote: needsConnect ? 'not connected yet · press c to connect' : null
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
    showSource: true,
    emptyMessage: 'no favorites yet. press f on any track to save it here.'
  });
}

function showRecents() {
  setResultsView(store.recents, {
    title: 'recently played',
    subtitle: `${store.recents.length} recent track${store.recents.length === 1 ? '' : 's'}`,
    kind: 'recents',
    showSource: true,
    emptyMessage: 'nothing played yet. pick a vibe and it shows up here.'
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

  // Redraw under whichever header (full or compact) is showing.
  const spin = setInterval(() => {
    const screen = ui.header(source) + '\n' + ui.spinner(frame++, tips[tipIdx]) + '\n';
    process.stdout.write('\x1b[H' + screen.replace(/\n/g, '\x1b[K\n') + '\x1b[J');
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
  if (err instanceof SpotifySetupError) {
    showConnect({ error: err.message });
    return;
  }
  promptSearch(ui.notice(label, err.message));
}

async function doSearch(query, { preset = false, label = null } = {}) {
  const link = parseSourceUrl(query);
  if (link) {
    await doOpenLink(query, link);
    return;
  }

  currentQuery = query;
  currentSearchOptions = { preset, label };

  // Without a saved login, spogo falls back to reading the browser, which can
  // raise a surprise Keychain prompt. Go to Connect instead.
  if (source === 'spotify' && !spotifyReady()) {
    showConnect({ error: 'connect spotify first, then pick again.' });
    return;
  }

  state = 'searching';

  const outcome = await runWithLoader([
    `searching ${source}...`,
    'finding the best mixes...',
    'curating your vibe...',
    'almost there...'
  ], () => search(query, { source, limit: store.config.searchLimit, preset }));

  if (!outcome.ok) {
    showLoadFailure('search failed:', outcome.error);
    return;
  }

  setResultsView(outcome.value, {
    title: preset ? 'search results' : 'your vibe',
    subtitle: `${source} · ${label || query}`,
    kind: 'search',
    emptyMessage: `no ${source} results for “${label || query}”. press m to try another source.`
  });
}

async function doOpenLink(rawUrl, link) {
  currentQuery = null;
  state = 'searching';
  source = link.source;

  // Spotify links play straight away; the status poll fills in the title.
  if (link.source === 'spotify') {
    queue = [];
    history = [];
    await playTrack(link.track);
    return;
  }

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
    emptyMessage: 'that link resolved to no playable tracks.'
  });
}

async function playTrack(track) {
  const hydrated = hydrateTrack(track);
  currentTrack = hydrated;

  state = 'playing';
  ui.hideCursor();
  enableRawKeys();

  const remote = hydrated.source === 'spotify';
  if (remote && !spotifyReady()) {
    showConnect({ error: 'connect spotify first, then pick again.' });
    return;
  }
  let frame = 0;
  let loadingStage = remote ? 'remote' : 'connecting';
  const loadingAnim = setInterval(() => {
    const content = ui.loadingScreen(frame++, hydrated, hydrated.source, loadingStage);
    process.stdout.write('\x1b[H' + content.replace(/\n/g, '\x1b[K\n') + '\x1b[J');
  }, 60);

  try {
    if (remote) {
      await player.stop();
      await spotifyPlayer.play(hydrated);
    } else {
      await spotifyPlayer.stop();
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
    }

    clearInterval(loadingAnim);
    if (state !== 'playing') return;
    // Spotify adds its own recents from the status poll, with the real title.
    if (!remote) {
      addRecent(store, hydrated);
      saveAppState();
    }
    ui.startVisualizer(() => renderPlaying());
  } catch (err) {
    clearInterval(loadingAnim);
    if (state !== 'playing') return;
    if (err instanceof SpotifySetupError) {
      showConnect({ error: err.message });
      return;
    }
    promptSearch(ui.notice(remote ? 'spotify:' : 'playback failed:', err.message));
  }
}

// ─── Spotify connect flow ───────────────────────────────────────────────────
// Walks through install → login → device, checking each step for real.

let connect = null;

function showConnect({ error = null } = {}) {
  ui.stopVisualizer();
  state = 'connect';
  connect = {
    browsers: detectBrowsers(),
    browserIdx: 0,
    busy: null,
    frame: 0,
    timer: null,
    message: null,
    error,
    verified: false,
    devices: null
  };
  ui.hideCursor();
  enableRawKeys();
  ui.clear();
  if (spotifyReady()) void runConnectTask('verify');
  renderConnect();
}

function connectBrowser() {
  return connect.browsers[connect.browserIdx];
}

function connectStepIndex() {
  if (!hasSpogo()) return 0;
  if (!isSpotifyConnected() || !connect.verified) return 1;
  if (!connect.devices?.length) return 2;
  return 3;
}

function renderConnect() {
  if (state !== 'connect') return;
  const browser = connectBrowser();
  const current = connectStepIndex();
  const busyStep = { install: 0, import: 1, verify: 1, devices: 2 }[connect.busy];
  const stepState = (i) => (busyStep === i ? 'busy' : i < current ? 'done' : i === current ? 'current' : 'todo');
  const deviceNames = connect.devices?.map((d) => d.name).join(', ');

  const steps = [
    {
      label: 'install spogo, the spotify helper sonic drives',
      detail: hasHomebrew()
        ? 'press enter to install it with homebrew.'
        : 'install go, then run: go install github.com/steipete/spogo/cmd/spogo@latest',
      doneDetail: 'installed',
      state: stepState(0)
    },
    {
      label: `connect your spotify login from ${browser.label}`,
      detail: connect.busy === 'import'
        ? `reading ${browser.label}... if macOS asks about saved logins, click "Always Allow".`
        : connect.busy === 'verify'
          ? 'checking that search works...'
          : `log in at open.spotify.com in ${browser.label} first (press o).\nthen press enter. macOS asks to share saved logins: click "Always Allow".`,
      doneDetail: 'connected, search works',
      state: stepState(1)
    },
    {
      label: 'open spotify where you want to hear it',
      detail: deviceNames
        ? `found: ${deviceNames}`
        : 'the desktop app, your phone, or the web player (press o). then press enter.',
      doneDetail: deviceNames ? `found: ${deviceNames}` : null,
      state: stepState(2)
    }
  ];

  const done = current === 3;
  const keys = done
    ? [['enter', 'start listening'], ['esc', 'back'], ['q', 'quit']]
    : [
      ['enter', ['install', 'connect', 'check devices'][current]],
      current >= 1 ? ['o', current === 1 ? `open spotify in ${browser.label}` : 'open web player'] : null,
      connect.browsers.length > 1 && current === 1 ? ['b', 'other browser'] : null,
      current === 2 ? ['s', 'skip for now'] : null,
      ['esc', 'back'],
      ['q', 'quit']
    ];

  const screen = ui.header('spotify') + ui.connectScreen({
    steps,
    browser,
    browsers: current === 1 ? connect.browsers : [],
    busyFrame: connect.frame,
    message: done ? 'spotify is connected.' : connect.message,
    error: connect.error,
    keys
  });
  process.stdout.write('\x1b[H' + screen.replace(/\n/g, '\x1b[K\n') + '\x1b[J');
}

async function runConnectTask(task) {
  if (connect.busy) return;
  connect.busy = task;
  connect.error = null;
  connect.message = null;
  connect.timer = setInterval(() => { connect.frame++; renderConnect(); }, 80);
  try {
    if (task === 'import') {
      await importLogin(connectBrowser());
      task = 'verify';
      connect.busy = 'verify';
    }
    if (task === 'verify') {
      await verifyLogin();
      connect.verified = true;
      task = 'devices';
      connect.busy = 'devices';
    }
    if (task === 'devices') {
      connect.devices = await listDevices();
      if (!connect.devices.length) {
        connect.error = 'no spotify device is open yet. open spotify somewhere, then press enter.';
      }
    }
  } catch (err) {
    connect.error = err.message;
  } finally {
    clearInterval(connect.timer);
    connect.busy = null;
    renderConnect();
  }
}

// Homebrew prints its own progress, so hand it the terminal for the install.
function installSpogo() {
  if (!hasHomebrew()) return;
  disableRawKeys();
  ui.showCursor();
  ui.clear();
  process.stdout.write('installing spogo with homebrew...\n\n');
  const result = spawnSync('brew', ['install', 'steipete/tap/spogo'], { stdio: 'inherit' });
  ui.hideCursor();
  enableRawKeys();
  ui.clear();
  if (!hasSpogo({ recheck: true })) {
    connect.error = result.status === 0
      ? 'spogo installed, but this terminal cannot find it yet. open a new terminal and run: sonic connect'
      : `homebrew could not install spogo (exit ${result.status}). run: brew install steipete/tap/spogo`;
  }
  renderConnect();
}

function openSpotifyWeb() {
  const browser = connectBrowser();
  const url = 'https://open.spotify.com';
  if (process.platform === 'darwin') {
    spawn('open', ['-a', browser.app, url], { stdio: 'ignore', detached: true }).unref();
    return;
  }
  void openExternal(url).catch(() => {});
}

function finishConnect() {
  source = 'spotify';
  persistConfig({ defaultSource: source });
  showPicker();
}

async function handleConnectKey(key) {
  if (key === 'q') {
    cleanup(0);
    return;
  }
  if (key === '\x1b') {
    showPicker();
    return;
  }
  if (connect.busy) return;

  const current = connectStepIndex();
  if (key === '\r' || key === '\n') {
    if (current === 0) installSpogo();
    else if (current === 1) await runConnectTask('import');
    else if (current === 2) await runConnectTask('devices');
    else finishConnect();
    return;
  }
  if (key === 'o' && current >= 1) {
    openSpotifyWeb();
    return;
  }
  if (key === 'b' && current === 1 && connect.browsers.length > 1) {
    connect.browserIdx = (connect.browserIdx + 1) % connect.browsers.length;
    connect.error = null;
    renderConnect();
    return;
  }
  if (key === 's' && current === 2) {
    finishConnect();
  }
}

async function playSelectedResult(index) {
  if (!results.length) return;
  setSequenceFromList(results, index);
  await playTrack(results[index]);
}

async function playNextTrack() {
  if (isSpotifyTrack()) {
    await spotifyPlayer.next();
    return;
  }
  if (!queue.length) return;
  if (currentTrack) history.push(hydrateTrack(currentTrack));
  const nextTrack = queue.shift();
  await playTrack(nextTrack);
}

async function playPreviousTrack() {
  if (isSpotifyTrack()) {
    await spotifyPlayer.previous();
    return;
  }
  if (!history.length) return;
  if (currentTrack) queue.unshift(hydrateTrack(currentTrack));
  const previousTrack = history.pop();
  await playTrack(previousTrack);
}

async function rerunCurrentQueryWithNextSource() {
  cycleSource();

  if (resultsMeta.kind === 'search' && currentQuery) {
    await doSearch(currentQuery, currentSearchOptions);
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

// Every "type something" path lands in the describe tab's text box.
function promptSearch(notice = '') {
  ui.stopVisualizer();
  vibeNotice = notice;
  pickerTab = 'describe';
  showPicker();
}

// ─── Describe tab ───────────────────────────────────────────────────────────
// A text box on the home screen. Letters type here, so shortcuts live on the
// vibes and sessions tabs.

const VIBE_EXAMPLES = [
  'james bond intro music, salsa, working',
  'rainy tokyo night drive',
  'sunday morning coffee jazz',
  'daft punk'
];

let vibeText = '';
let vibeNotice = '';
let exampleIdx = -1;

const PICKER_TABS = ['describe', 'vibes', 'activities'];

function switchPickerTab(direction = 1) {
  const idx = PICKER_TABS.indexOf(pickerTab);
  pickerTab = PICKER_TABS[(idx + direction + PICKER_TABS.length) % PICKER_TABS.length];
  renderPicker();
}

async function handleDescribeKey(key) {
  if (key === '\t') return switchPickerTab(1);
  if (key === '\x1b[Z') return switchPickerTab(-1);

  if (key === '\r' || key === '\n') {
    const query = vibeText.trim();
    if (!query) return;
    vibeNotice = '';
    await doSearch(query);
    return;
  }

  if (key === '\x7f' || key === '\b') {
    vibeText = [...vibeText].slice(0, -1).join('');
    exampleIdx = -1;
    renderPicker();
    return;
  }

  if (key === '\x1b' || key === '\x15') {
    vibeText = '';
    vibeNotice = '';
    exampleIdx = -1;
    renderPicker();
    return;
  }

  if (key === '\x1b[A' || key === '\x1b[B') {
    const step = key === '\x1b[B' ? 1 : -1;
    exampleIdx = (exampleIdx + step + VIBE_EXAMPLES.length) % VIBE_EXAMPLES.length;
    vibeText = VIBE_EXAMPLES[exampleIdx];
    renderPicker();
    return;
  }

  // Arrow left/right switch tabs only when the box is empty.
  if ((key === '\x1b[C' || key === '\x1b[D') && !vibeText) {
    return switchPickerTab(key === '\x1b[C' ? 1 : -1);
  }
  if (key.startsWith('\x1b')) return;

  // Typed keys and pasted text; newlines inside a paste submit nothing.
  const typed = key.replace(/[\x00-\x1f\x7f]/g, '');
  if (typed) {
    vibeText += typed;
    exampleIdx = -1;
    renderPicker();
  }
}

process.stdin.on('data', async (input) => {
  const key = String(input);
  // A late reply to the background-color query is not a keypress.
  if (key.startsWith('\x1b]')) return;

  if (key === '\x03') {
    cleanup(0);
    return;
  }

  if (state === 'connect') {
    await handleConnectKey(key);
    return;
  }

  if (state === 'picker' && pickerTab === 'describe') {
    await handleDescribeKey(key);
    return;
  }

  if (state === 'picker') {
    if (key === '\t' || isRight(key)) return switchPickerTab(1);
    if (key === '\x1b[Z' || isLeft(key)) return switchPickerTab(-1);

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
      await doSearch(query, { preset: true, label: item.name });
      return;
    }

    const match = items.find((item) => item.key === key);
    if (match) {
      const query = pickerTab === 'vibes' ? match.query : pickActivityQuery(match);
      await doSearch(query, { preset: true, label: match.name });
      return;
    }

    if (key === '/') {
      pickerTab = 'describe';
      renderPicker();
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

    if (key === 'c') {
      showConnect();
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
    const p = activePlayer();
    const remote = isSpotifyTrack();

    // Spotify commands go over the network; show failures instead of crashing.
    const run = async (task) => {
      try {
        await task();
      } catch (err) {
        if (remote) {
          ui.stopVisualizer();
          promptSearch(ui.notice('spotify:', err.message));
        }
      }
    };

    if (key === ' ') {
      await run(() => p.togglePause());
      return;
    }

    if (key === '/') {
      ui.stopVisualizer();
      await p.stop();
      promptSearch();
      return;
    }

    if (key === 'b') {
      ui.stopVisualizer();
      await p.stop();
      showPicker();
      return;
    }

    if ((key === '[' || key === ']') && !currentTrack?.live) {
      await run(() => p.seekRelative(key === '[' ? -10 : 10));
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
      await run(() => playNextTrack());
      return;
    }

    if (key === 'p') {
      await run(() => playPreviousTrack());
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

    if (key === '-' || key === '=' || key === '+') {
      const step = key === '-' ? -10 : 10;
      const current = typeof p.volume === 'number' ? p.volume : 50;
      await run(() => p.setVolume(current + step));
      if (!remote) persistConfig({ volume: p.volume });
      renderPlaying();
      return;
    }

    if (key === 'q') {
      cleanup(0);
    }
  }
});

function onPause(paused) {
  if (state !== 'playing') return;
  if (paused) ui.pauseVisualizer();
  else ui.resumeVisualizer();
}

player.on('pause', onPause);
spotifyPlayer.on('pause', onPause);

// Spotify moves on by itself (playlists, autoplay); follow what it plays.
spotifyPlayer.on('track', (track) => {
  if (state !== 'playing' || !isSpotifyTrack() || !track) return;
  currentTrack = hydrateTrack({ ...track, source: 'spotify' });
  addRecent(store, currentTrack);
  saveAppState();
});

process.stdout.on('resize', () => {
  if (state === 'picker') renderPicker();
  else if (state === 'results') renderResultsList();
  else if (state === 'playing') renderPlaying();
  else if (state === 'connect') renderConnect();
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

  // Learn light vs dark before the first frame, so text never lands white on white.
  if (store.config.colorMode === 'auto') await queryTerminalBackground();

  ui.hideCursor();

  if (connectMode) {
    showConnect();
    return;
  }

  if (queryArgs) {
    const channel = resolveChannel(queryArgs);
    enableRawKeys();
    await doSearch(channel ? channel.query : queryArgs, { preset: Boolean(channel), label: channel?.name });
    return;
  }

  showPicker();
}

main().catch((err) => {
  ui.cleanup();
  console.error(err);
  process.exit(1);
});
