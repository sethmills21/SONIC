#!/usr/bin/env node

import { search } from '../lib/search.js';
import { Player } from '../lib/player.js';
import { UI } from '../lib/ui.js';
import { CHANNELS, getSuggestedChannel, resolveChannel } from '../lib/channels.js';
import readline from 'node:readline';

const ui = new UI();
const player = new Player();
let results = [];
let currentTrack = null;
let state = 'idle'; // idle | channel_pick | searching | results | playing | search_input
let source = 'youtube';

// Selection cursors
let channelCursor = 0;
let resultsCursor = 0;

// Parse args: sonic [--sc] [channel|query]
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

// --- Keyboard (raw mode, single listener) ---

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

// Arrow keys come as escape sequences: \x1b[A (up), \x1b[B (down)
function isUpArrow(key) { return key === '\x1b[A' || key === 'k'; }
function isDownArrow(key) { return key === '\x1b[B' || key === 'j'; }

process.stdin.on('data', async (key) => {
  if (key === '\x03') { cleanup(); return; }

  if (state === 'channel_pick') {
    if (isUpArrow(key)) {
      channelCursor = (channelCursor - 1 + CHANNELS.length) % CHANNELS.length;
      renderChannelPicker();
      return;
    }
    if (isDownArrow(key)) {
      channelCursor = (channelCursor + 1) % CHANNELS.length;
      renderChannelPicker();
      return;
    }
    if (key === '\r' || key === '\n') {
      await doSearch(CHANNELS[channelCursor].query);
      return;
    }
    // Number keys still work as shortcuts
    const ch = CHANNELS.find(c => c.key === key);
    if (ch) {
      await doSearch(ch.query);
      return;
    }
    if (key === '/') {
      promptSearch();
      return;
    }
    if (key === 'q') { cleanup(); return; }
  }

  if (state === 'results') {
    if (isUpArrow(key)) {
      resultsCursor = (resultsCursor - 1 + results.length) % results.length;
      renderResultsList();
      return;
    }
    if (isDownArrow(key)) {
      resultsCursor = (resultsCursor + 1) % results.length;
      renderResultsList();
      return;
    }
    if (key === '\r' || key === '\n') {
      await playTrack(results[resultsCursor]);
      return;
    }
    // Number keys still work
    const num = parseInt(key);
    if (num >= 1 && num <= results.length) {
      await playTrack(results[num - 1]);
      return;
    }
    if (key === '/' || key === 's') {
      promptSearch();
      return;
    }
    if (key === 'b') {
      showChannelPicker();
      return;
    }
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
      showChannelPicker();
    }
    if (key === '[') await player.seekRelative(-10);
    if (key === ']') await player.seekRelative(10);
    if (key === 'v') ui.toggleVizMode();
    if (key === '-') await player.setVolume(player.volume - 10);
    if (key === '=' || key === '+') await player.setVolume(player.volume + 10);
    if (key === 'q') cleanup();
  }
});

// --- Render ---

function renderPlaying() {
  let out = '\x1b[2J\x1b[H';
  out += ui.header();
  out += '\n';
  if (currentTrack) {
    const src = currentTrack.source === 'soundcloud' ? 'soundcloud' : 'youtube';
    out += ui.nowPlaying(currentTrack.title, currentTrack.channel, player.duration || currentTrack.duration, src);
  }
  out += '\n\n';
  const dur = player.duration || currentTrack?.duration;
  if (ui.vizMode === 'tape') {
    out += ui.renderTape(player.position, dur);
  } else {
    out += ui.renderBars();
  }
  out += '\n\n';
  out += ui.progressBar(player.position, dur);
  out += '\n\n';
  out += ui.controls(player.paused);
  process.stdout.write(out);
}

function renderChannelPicker() {
  ui.clear();
  process.stdout.write(ui.header());
  process.stdout.write(ui.channelPicker(CHANNELS, channelCursor));
}

function renderResultsList() {
  ui.clear();
  process.stdout.write(ui.header());
  process.stdout.write(ui.resultsList(results, resultsCursor));
}

// --- Channel picker ---

function showChannelPicker() {
  state = 'channel_pick';
  channelCursor = getSuggestedChannel();
  ui.hideCursor();
  enableRawKeys();
  renderChannelPicker();
}

// --- Search ---

async function doSearch(query) {
  state = 'searching';
  ui.hideCursor();
  enableRawKeys();
  ui.clear();
  process.stdout.write(ui.header());

  const label = source === 'soundcloud' ? 'soundcloud' : 'youtube';
  let frame = 0;
  const spin = setInterval(() => {
    ui.moveTo(4, 1);
    process.stdout.write('\x1b[2K' + ui.spinner(frame++, `searching ${label}...`));
  }, 80);

  try {
    results = await search(query, { source });
    clearInterval(spin);

    if (results.length === 0) {
      ui.clear();
      process.stdout.write(ui.header());
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
    ui.clear();
    process.stdout.write(ui.header());
    process.stdout.write(`\n  \x1b[31msearch failed:\x1b[0m ${err.message}\n`);
    promptSearch();
  }
}

async function playTrack(track) {
  currentTrack = track;
  state = 'playing';
  ui.hideCursor();
  enableRawKeys();

  ui.clear();
  process.stdout.write(ui.header());

  let frame = 0;
  const spin = setInterval(() => {
    ui.moveTo(4, 1);
    process.stdout.write('\x1b[2K' + ui.spinner(frame++, 'loading...'));
  }, 80);

  try {
    await player.play(track.url);
    clearInterval(spin);
    ui.startVisualizer(() => renderPlaying());
  } catch (err) {
    clearInterval(spin);
    ui.clear();
    process.stdout.write(ui.header());
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
  process.stdout.write(ui.header() + '\n');

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
    showChannelPicker();
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
    showChannelPicker();
  }
}

main().catch((err) => {
  ui.cleanup();
  console.error(err);
  process.exit(1);
});
