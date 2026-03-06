#!/usr/bin/env node

import { search } from '../lib/search.js';
import { Player } from '../lib/player.js';
import { UI } from '../lib/ui.js';
import {
  CHANNELS, ACTIVITIES,
  getSuggestedChannel, getSuggestedActivity,
  pickActivityQuery, resolveChannel
} from '../lib/channels.js';
import readline from 'node:readline';
import { exec } from 'node:child_process';

const ui = new UI();
const player = new Player();
let results = [];
let currentTrack = null;
let state = 'idle'; // idle | picker | searching | results | playing | search_input
let source = 'youtube';

// Picker state
let pickerTab = 'vibes'; // 'vibes' | 'activities'
let vibesCursor = 0;
let activityCursor = 0;
let resultsCursor = 0;

// Parse args
const args = process.argv.slice(2);
if (args.includes('--sc') || args.includes('--soundcloud')) {
  source = 'soundcloud';
}
const queryArgs = args.filter(a => !a.startsWith('--')).join(' ').trim();

function cleanup() {
  ui.cleanup();
  player.stop().then(() => process.exit(0)).catch(() => process.exit(0));
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// --- Keyboard ---

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

process.stdin.on('data', async (key) => {
  if (key === '\x03') { cleanup(); return; }

  if (state === 'picker') {
    // Tab or left/right arrows switch between vibes and activities
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
    // Number keys as shortcuts
    const match = items.find(c => c.key === key);
    if (match) {
      const query = pickerTab === 'vibes' ? match.query : pickActivityQuery(match);
      await doSearch(query);
      return;
    }
    if (key === '/') { promptSearch(); return; }
    if (key === 'q') { cleanup(); return; }
  }

  if (state === 'results') {
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
      await playTrack(results[resultsCursor]);
      return;
    }
    const num = parseInt(key);
    if (num >= 1 && num <= results.length) {
      await playTrack(results[num - 1]);
      return;
    }
    if (key === '/' || key === 's') { promptSearch(); return; }
    if (key === 'b') { showPicker(); return; }
    if (key === 'q') { cleanup(); return; }
  }

  if (state === 'playing') {
    if (key === ' ') {
      await player.togglePause();
      if (player.paused) ui.pauseVisualizer();
      else ui.resumeVisualizer();
    }
    if (key === '/') {
      ui.stopVisualizer();
      await player.stop();
      promptSearch();
    }
    if (key === 'b') {
      ui.stopVisualizer();
      await player.stop();
      showPicker();
    }
    if (key === '[') await player.seekRelative(-10);
    if (key === ']') await player.seekRelative(10);
    if (key === 'v') ui.toggleVizMode();
    if (key === 'o' && currentTrack) {
      exec(`open "${currentTrack.url}"`);
    }
    if (key === '-') await player.setVolume(player.volume - 10);
    if (key === '=' || key === '+') await player.setVolume(player.volume + 10);
    if (key === 'q') cleanup();
  }
});

// --- Render ---

function renderPlaying() {
  let out = '\x1b[2J\x1b[H';
  const src = currentTrack?.source === 'soundcloud' ? 'soundcloud' : 'youtube';
  out += ui.header(src);
  out += '\n';
  if (currentTrack) {
    out += ui.nowPlaying(currentTrack.title, currentTrack.channel, player.duration || currentTrack.duration, src);
  }
  out += '\n\n';
  const dur = player.duration || currentTrack?.duration;
  if (ui.vizMode === 'tape') {
    out += ui.renderTape(player.position, dur);
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
  out += ui.progressBar(player.position, dur);
  out += '\n\n';
  out += ui.controls(player.paused);
  process.stdout.write(out);
}

function renderPicker() {
  ui.clear();
  process.stdout.write(ui.header(source));
  const cursor = pickerTab === 'vibes' ? vibesCursor : activityCursor;
  const items = pickerTab === 'vibes' ? CHANNELS : ACTIVITIES;
  process.stdout.write(ui.picker(items, cursor, pickerTab));
}

function renderResultsList() {
  ui.clear();
  process.stdout.write(ui.header(source));
  process.stdout.write(ui.resultsList(results, resultsCursor));
}

// --- Picker ---

function showPicker() {
  state = 'picker';
  vibesCursor = getSuggestedChannel();
  activityCursor = getSuggestedActivity();
  ui.hideCursor();
  enableRawKeys();
  renderPicker();
}

// --- Search with loading animation ---

async function doSearch(query) {
  state = 'searching';
  ui.hideCursor();
  enableRawKeys();
  ui.clear();
  process.stdout.write(ui.header(source));

  const label = source === 'soundcloud' ? 'soundcloud' : 'youtube';

  // Animated loading with tips
  const tips = [
    'searching ' + label + '...',
    'finding the best mixes...',
    'curating your vibe...',
    'almost there...',
  ];
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
    results = await search(query, { source });
    clearInterval(spin);
    clearInterval(tipSwap);

    if (results.length === 0) {
      ui.clear();
      process.stdout.write(ui.header(source));
      process.stdout.write(`\n  \x1b[31mno results found\x1b[0m\n`);
      promptSearch();
      return;
    }

    state = 'results';
    resultsCursor = 0;
    renderResultsList();
    enableRawKeys();
  } catch (err) {
    clearInterval(spin);
    clearInterval(tipSwap);
    ui.clear();
    process.stdout.write(ui.header(source));
    process.stdout.write(`\n  \x1b[31msearch failed:\x1b[0m ${err.message}\n`);
    promptSearch();
  }
}

async function playTrack(track) {
  currentTrack = track;
  state = 'playing';
  ui.hideCursor();
  enableRawKeys();

  // Loading animation with stage tracking
  let frame = 0;
  let loadingStage = 'connecting';
  const loadingAnim = setInterval(() => {
    process.stdout.write('\x1b[2J\x1b[H');
    process.stdout.write(ui.loadingScreen(frame++, track, source, loadingStage));
  }, 60);

  try {
    // Stage 1: connect to mpv socket
    await player.play(track.url);
    loadingStage = 'buffering';

    // Stage 2: wait for actual audio playback (position > 0 means audio is flowing)
    await new Promise((resolve, reject) => {
      let checks = 0;
      const poll = setInterval(() => {
        if (player.position > 0.5 || player.duration > 0) {
          clearInterval(poll);
          loadingStage = 'ready';
          // Brief pause to show "ready" state before transitioning
          setTimeout(resolve, 400);
        }
        if (++checks > 300) { // 30 second timeout
          clearInterval(poll);
          resolve(); // proceed anyway, might just be a slow stream
        }
      }, 100);
    });

    clearInterval(loadingAnim);
    ui.startVisualizer(() => renderPlaying());
  } catch (err) {
    clearInterval(loadingAnim);
    ui.clear();
    process.stdout.write(ui.header(source));
    process.stdout.write(`\n  \x1b[31mplayback error:\x1b[0m ${err.message}\n`);
    setTimeout(() => promptSearch(), 2000);
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

  rl.question('  \x1b[90mwhat do you want to hear?\x1b[0m\n  \x1b[97m\u25b8\x1b[0m ', (answer) => {
    rl.close();
    const q = answer.trim();
    if (!q) { promptSearch(); return; }
    doSearch(q);
  });
}

// --- Player events ---

player.on('ended', () => {
  if (state === 'playing') {
    ui.stopVisualizer();
    showPicker();
  }
});

// --- Main ---

async function main() {
  ui.hideCursor();

  if (queryArgs) {
    const channel = resolveChannel(queryArgs);
    if (channel) {
      enableRawKeys();
      await doSearch(channel.query);
    } else {
      enableRawKeys();
      await doSearch(queryArgs);
    }
  } else {
    showPicker();
  }
}

main().catch((err) => {
  ui.cleanup();
  console.error(err);
  process.exit(1);
});
