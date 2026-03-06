import chalk from 'chalk';
import { formatDuration } from './search.js';

// ─── Constants ───────────────────────────────────────────────────────────────

const BARS_COUNT = 48;
const BAR_HEIGHT = 8; // rows above center line
const MIRROR_HEIGHT = 4; // rows below center line (reflection)
// Full block and fractional blocks for vertical resolution
const FULL_BLOCK = '\u2588';
const UPPER_BLOCKS = [' ', '\u2581', '\u2582', '\u2583', '\u2584', '\u2585', '\u2586', '\u2587', '\u2588'];
const LOWER_BLOCKS = [' ', '\u2594', '\u2594', '\u2580', '\u2580', '\u2580', '\u2580', '\u2580', '\u2588'];

// Physics
const SPRING = 0.18;
const DAMPING = 0.72;
const OVERSHOOT = 1.15;

// ─── Rainbow Color Palette ───────────────────────────────────────────────────

const RAINBOW = [
  '#FF0040', // hot pink-red
  '#FF2020', // red
  '#FF6600', // orange
  '#FFAA00', // amber
  '#FFD500', // yellow
  '#AAFF00', // lime
  '#44FF00', // green
  '#00FF88', // mint
  '#00DDFF', // cyan
  '#0088FF', // sky blue
  '#4400FF', // indigo
  '#8800FF', // violet
  '#CC00FF', // magenta
  '#FF00AA', // pink
];

// Bar gradient: green (bottom) -> yellow (middle) -> red/magenta (top)
const BAR_GRADIENT = [
  chalk.hex('#22CC44'), // green (bottom)
  chalk.hex('#44DD33'),
  chalk.hex('#88EE22'),
  chalk.hex('#BBEE11'),
  chalk.hex('#DDDD00'), // yellow (middle)
  chalk.hex('#EEAA00'),
  chalk.hex('#FF6600'), // orange
  chalk.hex('#FF2200'), // red (top)
];

// Mirror gradient: dimmed reflection
const MIRROR_GRADIENT = [
  chalk.hex('#115522'),
  chalk.hex('#226611'),
  chalk.hex('#447711'),
  chalk.hex('#556600'),
];

// Visualization modes
const VIZ_MODES = ['bars', 'tape', 'wave', 'rain', 'flame'];

// Wave visualizer
const WAVE_HEIGHT = 13; // rows (6 above + center + 6 below)
const WAVE_CENTER = 6;

// Wave gradient: electric blue/cyan
const WAVE_GRADIENT = [
  chalk.hex('#00FFFF'), // bright cyan (core)
  chalk.hex('#00DDFF'), // cyan
  chalk.hex('#0099FF'), // blue
  chalk.hex('#0066CC'), // deeper blue
];

// Rain visualizer
const RAIN_HEIGHT = 14;
const RAIN_CHARS = [' ', '\u2591', '\u2592', '\u2593', FULL_BLOCK]; // ░ ▒ ▓ █
const RAIN_COLORS = [
  null,
  chalk.hex('#003300'), // dim
  chalk.hex('#006600'), // medium
  chalk.hex('#00AA00'), // bright
  chalk.hex('#00FF41'), // matrix green (head)
];

// Flame visualizer
const FLAME_HEIGHT = 10;
const FLAME_CHARS = [' ', '\u2591', '\u2592', '\u2593', FULL_BLOCK]; // ░ ▒ ▓ █
const FLAME_GRADIENT = [
  chalk.hex('#FFFF00'), // bright yellow (bottom/hottest)
  chalk.hex('#FFCC00'), // gold
  chalk.hex('#FF9900'), // orange
  chalk.hex('#FF6600'), // deep orange
  chalk.hex('#FF3300'), // red-orange
  chalk.hex('#FF0000'), // red
  chalk.hex('#CC0000'), // dark red
  chalk.hex('#880000'), // maroon
  chalk.hex('#550000'), // ember
  chalk.hex('#330000'), // barely visible
];

// Platform colors and branding
const PLATFORM_BRANDS = {
  youtube: { color: '#FF0000', icon: '\u25b6', label: 'YouTube' },
  soundcloud: { color: '#FF5500', icon: '\u2601', label: 'SoundCloud' },
  spotify: { color: '#1DB954', icon: '\u266b', label: 'Spotify' },
  apple: { color: '#FC3C44', icon: '\u266a', label: 'Apple Music' },
};

// Tape deck spinner characters for reel animation
const REEL_SPIN = ['\u2502', '\u2571', '\u2500', '\u2572']; // | / - \

// ─── ASCII Art Header ────────────────────────────────────────────────────────

const SONIC_ART = [
  ' ███████╗ ██████╗ ███╗   ██╗██╗ ██████╗',
  ' ██╔════╝██╔═══██╗████╗  ██║██║██╔════╝',
  ' ███████╗██║   ██║██╔██╗ ██║██║██║     ',
  ' ╚════██║██║   ██║██║╚██╗██║██║██║     ',
  ' ███████║╚██████╔╝██║ ╚████║██║╚██████╗',
  ' ╚══════╝ ╚═════╝ ╚═╝  ╚═══╝╚═╝ ╚═════╝',
];

// Color each column of the header with a rainbow gradient
function colorizeHeader() {
  const maxLen = Math.max(...SONIC_ART.map(l => l.length));
  const lines = SONIC_ART.map(line => line.padEnd(maxLen));
  const colored = [];

  for (const line of lines) {
    let out = '';
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === ' ') {
        out += ' ';
      } else {
        // Map column position to rainbow
        const colorIdx = Math.floor((i / maxLen) * RAINBOW.length);
        const color = RAINBOW[Math.min(colorIdx, RAINBOW.length - 1)];
        out += chalk.hex(color)(ch);
      }
    }
    colored.push(out);
  }
  return colored;
}

const HEADER_LINES = colorizeHeader();

// ─── Tape Deck ASCII Art ─────────────────────────────────────────────────────

function buildReel(radius, spinFrame) {
  // Returns an array of strings representing a circular reel
  // radius 1-4 determines reel visual size
  const ch = REEL_SPIN[spinFrame % REEL_SPIN.length];
  const size = Math.max(1, Math.min(4, Math.round(radius)));

  if (size <= 1) {
    return [
      `(${ch})`,
    ];
  }
  if (size === 2) {
    return [
      ` .${ch}. `,
      `( ${ch} )`,
      ` '${ch}' `,
    ];
  }
  if (size === 3) {
    return [
      `  ._${ch}_.  `,
      ` / ${ch}${ch}${ch} \\ `,
      `|  ${ch}${ch}${ch}  |`,
      ` \\ ${ch}${ch}${ch} / `,
      `  '-${ch}-'  `,
    ];
  }
  // size 4
  return [
    `   ._${ch}${ch}_.   `,
    `  / ${ch}${ch}${ch}${ch} \\  `,
    ` | ${ch}${ch}${ch}${ch}${ch}${ch} | `,
    ` | ${ch}${ch}${ch}${ch}${ch}${ch} | `,
    `  \\ ${ch}${ch}${ch}${ch} /  `,
    `   '-${ch}${ch}-'   `,
  ];
}

// ─── UI Class ────────────────────────────────────────────────────────────────

export class UI {
  constructor() {
    this.bars = new Array(BARS_COUNT).fill(0);
    this.targets = new Array(BARS_COUNT).fill(0);
    this.velocities = new Array(BARS_COUNT).fill(0);
    this.frameTimer = null;
    this.targetTimer = null;
    this.renderCallback = null;
    this.animating = false;
    this.vizPaused = false;
    this.vizMode = 'bars';
    this.tapeFrame = 0;
    // Rain state: 2D grid of intensities (0=empty, 1-4=intensity)
    this.rainGrid = Array.from({ length: RAIN_HEIGHT }, () => new Array(BARS_COUNT).fill(0));
    // Flame state: heat map
    this.flameGrid = Array.from({ length: FLAME_HEIGHT }, () => new Array(BARS_COUNT).fill(0));
  }

  clear() {
    process.stdout.write('\x1b[2J\x1b[H');
  }

  hideCursor() {
    process.stdout.write('\x1b[?25l');
  }

  showCursor() {
    process.stdout.write('\x1b[?25h');
  }

  moveTo(row, col) {
    process.stdout.write(`\x1b[${row};${col}H`);
  }

  toggleVizMode() {
    const idx = VIZ_MODES.indexOf(this.vizMode);
    this.vizMode = VIZ_MODES[(idx + 1) % VIZ_MODES.length];
  }

  // ─── Header ──────────────────────────────────────────────────────────────

  header(source) {
    let out = '\n';
    for (const line of HEADER_LINES) {
      out += line + '\n';
    }
    const brand = source ? PLATFORM_BRANDS[source] : null;
    if (brand) {
      out += '  ' + chalk.hex(brand.color).bold(`${brand.icon} ${brand.label}`) + chalk.dim(' \u00b7 stream anything from your terminal') + '\n';
    } else {
      out += chalk.dim('  stream anything from your terminal') + '\n';
    }
    return out;
  }

  // ─── Channel Picker UI ──────────────────────────────────────────────────

  picker(items, cursorIdx, activeTab, options = {}) {
    // Tab bar
    const vibesTab = activeTab === 'vibes'
      ? chalk.white.bold.underline('vibes')
      : chalk.dim('vibes');
    const activitiesTab = activeTab === 'activities'
      ? chalk.white.bold.underline('sessions')
      : chalk.dim('sessions');
    let out = '\n  ' + vibesTab + '  ' + chalk.dim('|') + '  ' + activitiesTab + '\n\n';

    for (let i = 0; i < items.length; i++) {
      const c = items[i];
      const selected = i === cursorIdx;
      const pointer = selected ? chalk.hex('#6BCB77')('\u25b8') : ' ';
      const name = selected
        ? chalk.white.bold(c.name)
        : chalk.dim(c.name);
      const desc = selected
        ? chalk.white(c.desc)
        : chalk.dim(c.desc);
      out += `  ${pointer} ${c.icon}  ${name}${' '.repeat(Math.max(1, 16 - c.name.length))}${desc}\n`;
    }
    const sourceLabel = options.source === 'soundcloud' ? 'soundcloud' : 'youtube';
    const libraryLabel = `f favorites (${options.favoritesCount || 0}) \u00b7 r recents (${options.recentsCount || 0})`;
    out += `\n  ${chalk.dim(`source: ${sourceLabel} \u00b7 ${libraryLabel}`)}\n`;
    out += `  ${chalk.dim('\u2191\u2193 navigate \u00b7 \u2190\u2192 or tab switch \u00b7 enter play \u00b7 / search \u00b7 m source \u00b7 q quit')}\n`;
    return out;
  }

  // ─── Search / Results UI ─────────────────────────────────────────────────

  searchPrompt() {
    return `  ${chalk.dim('what do you want to hear?')}\n  ${chalk.white('\u25b8')} `;
  }

  spinner(frame, msg) {
    const frames = ['\u280b', '\u2819', '\u2839', '\u2838', '\u283c', '\u2834', '\u2826', '\u2827', '\u2807', '\u280f'];
    return `  ${chalk.magenta(frames[frame % frames.length])} ${chalk.dim(msg)}`;
  }

  // Full-screen loading state with animated waveform
  // stage: 'connecting' | 'buffering' | 'ready'
  loadingScreen(frame, track, source, stage = 'connecting') {
    let out = '';
    out += this.header(source);
    out += '\n';

    // Track info with platform branding
    if (track) {
      const brand = source ? PLATFORM_BRANDS[source] : null;
      out += `  ${chalk.hex('#6BCB77')('\u266b')} ${chalk.white.bold(truncate(track.title, 48))}\n`;
      const meta = [];
      if (brand) meta.push(chalk.hex(brand.color)(`${brand.icon} ${brand.label}`));
      if (track.channel) meta.push(chalk.dim(truncate(track.channel, 30)));
      if (track.duration) meta.push(chalk.dim(formatDuration(track.duration)));
      out += `  ${meta.join(chalk.dim(' \u00b7 '))}\n`;
    }
    out += '\n';

    // Full-width animated waveform (fills the viz area)
    const width = BARS_COUNT;
    const waveRows = 6;

    for (let row = 0; row < waveRows; row++) {
      let line = '  ';
      for (let i = 0; i < width; i++) {
        // Multi-wave interference pattern
        const v1 = Math.sin((i * 0.2) + (frame * 0.12)) * 0.4;
        const v2 = Math.sin((i * 0.35) + (frame * 0.08) + 1.5) * 0.3;
        const v3 = Math.sin((i * 0.12) + (frame * 0.18) + 3.0) * 0.3;
        const combined = (v1 + v2 + v3 + 1) * 0.5; // normalize to 0-1

        // Map to row threshold
        const threshold = (waveRows - row) / waveRows;
        if (combined >= threshold) {
          const colorIdx = Math.floor((i / width) * RAINBOW.length);
          // Intensity based on how much above threshold
          const intensity = combined - threshold;
          if (intensity > 0.15) {
            line += chalk.hex(RAINBOW[colorIdx])(FULL_BLOCK);
          } else {
            line += chalk.hex(RAINBOW[colorIdx])('\u2584');
          }
        } else {
          line += ' ';
        }
      }
      out += line + '\n';
    }
    out += '\n';

    // Stage indicator with spinner
    const spinFrames = ['\u280b', '\u2819', '\u2839', '\u2838', '\u283c', '\u2834', '\u2826', '\u2827', '\u2807', '\u280f'];
    const spin = chalk.magenta(spinFrames[frame % spinFrames.length]);
    const dots = '.'.repeat((frame % 4) + 1);

    const stageMessages = {
      connecting: `connecting to stream${dots}`,
      buffering: `buffering audio${dots}`,
      ready: `starting playback${dots}`,
    };
    const msg = stageMessages[stage] || stageMessages.connecting;

    // Progress dots: show which stages are done
    const stageDots = [];
    const stageOrder = ['connecting', 'buffering', 'ready'];
    const currentIdx = stageOrder.indexOf(stage);
    for (let i = 0; i < stageOrder.length; i++) {
      if (i < currentIdx) {
        stageDots.push(chalk.hex('#6BCB77')('\u25cf')); // filled green
      } else if (i === currentIdx) {
        stageDots.push(chalk.magenta('\u25cf')); // active magenta
      } else {
        stageDots.push(chalk.dim('\u25cb')); // empty
      }
    }

    out += `  ${spin} ${chalk.dim(msg)}  ${stageDots.join(' ')}\n`;

    return out;
  }

  resultsList(results, cursorIdx = 0, options = {}) {
    let out = '\n';
    if (options.title) {
      out += `  ${chalk.white.bold(options.title)}`;
      if (options.subtitle) {
        out += `  ${chalk.dim('\u00b7')} ${chalk.dim(truncate(options.subtitle, 54))}`;
      }
      out += '\n\n';
    }

    if (results.length === 0) {
      out += `  ${chalk.dim(options.emptyMessage || 'nothing here yet.')}\n`;
      out += `\n  ${chalk.dim(options.footer || '/ search \u00b7 b back \u00b7 q quit')}\n`;
      return out;
    }

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      const selected = i === cursorIdx;
      const pointer = selected ? chalk.hex('#6BCB77')('\u25b8') : ' ';
      const num = chalk.dim(`${i + 1}`);
      const favorite = r.favorite ? chalk.hex('#FF5D8F')('\u2665') : chalk.dim('\u00b7');
      const title = selected
        ? chalk.white.bold(truncate(r.title, 50))
        : chalk.dim(truncate(r.title, 50));
      const dur = selected
        ? chalk.white(formatDuration(r.duration))
        : chalk.dim(formatDuration(r.duration));
      const chan = chalk.dim.italic(truncate(r.channel, 20));
      out += `  ${pointer} ${num} ${favorite} ${title}  ${dur}  ${chan}\n`;
    }
    out += `\n  ${chalk.dim(options.footer || '\u2191\u2193 navigate \u00b7 enter play \u00b7 f favorite \u00b7 / search \u00b7 b back \u00b7 q quit')}\n`;
    return out;
  }

  nowPlaying(title, channel, duration, source = 'youtube', options = {}) {
    const t = chalk.white.bold(truncate(title, 48));
    const brand = PLATFORM_BRANDS[source] || PLATFORM_BRANDS.youtube;
    const srcLabel = chalk.hex(brand.color).bold(`${brand.icon} ${brand.label}`);
    const meta = chalk.dim(`${formatDuration(duration)} \u00b7 ${channel}`);
    const status = [];
    if (options.favorite) status.push(chalk.hex('#FF5D8F')('\u2665 favorite'));
    if (options.queueLength > 0) status.push(chalk.dim(`next ${options.queueLength}`));
    if (options.historyLength > 0) status.push(chalk.dim(`prev ${options.historyLength}`));
    const statusLine = status.length ? `\n  ${status.join(chalk.dim(' \u00b7 '))}` : '';
    return `  ${chalk.hex('#6BCB77')('\u266b')} ${t}\n  ${srcLabel} ${chalk.dim('\u00b7')} ${meta}${statusLine}`;
  }

  progressBar(position, duration, width = 40) {
    if (!duration) return '';
    const pct = Math.min(position / duration, 1);
    const filled = Math.round(pct * width);
    const empty = width - filled;

    // Gradient the filled portion
    let bar = '';
    for (let i = 0; i < filled; i++) {
      const colorIdx = Math.floor((i / width) * RAINBOW.length);
      const color = RAINBOW[Math.min(colorIdx, RAINBOW.length - 1)];
      bar += chalk.hex(color)('\u2501');
    }
    bar += chalk.dim('\u2500'.repeat(empty));

    const knob = filled < width ? chalk.white('\u25cf') : '';
    const time = `${formatDuration(position)} ${chalk.dim('/')} ${formatDuration(duration)}`;
    return `  ${bar}${knob}  ${chalk.dim(time)}`;
  }

  controls(paused, options = {}) {
    const items = [
      paused ? 'space resume' : 'space pause',
      options.canGoBack ? 'p prev' : null,
      options.queueLength > 0 ? `n next(${options.queueLength})` : 'n next',
      options.isFavorite ? 'f unfavorite' : 'f favorite',
      '/ search',
      'o open',
      'v viz',
      '- + volume',
      '[ ]  seek',
      'q quit'
    ].filter(Boolean);
    const modeColors = {
      bars: '#00DDFF',
      tape: '#FF9500',
      wave: '#00FFFF',
      rain: '#00FF41',
      flame: '#FF6600',
    };
    const color = modeColors[this.vizMode] || '#FFFFFF';
    const modeLabel = chalk.hex(color)(`[${this.vizMode}]`);
    return `  ${chalk.dim(items.join(' \u00b7 '))}  ${modeLabel}`;
  }

  // ─── Visualizer Engine ───────────────────────────────────────────────────

  startVisualizer(onFrame) {
    this.animating = true;
    this.renderCallback = onFrame;
    this.tapeFrame = 0;

    // Update targets randomly at ~6-7 Hz
    this.targetTimer = setInterval(() => {
      if (!this.animating) return;
      for (let i = 0; i < BARS_COUNT; i++) {
        // Bell curve bias: bars near center are taller
        const center = BARS_COUNT / 2;
        const dist = Math.abs(i - center) / center;
        const maxH = BAR_HEIGHT * (1 - dist * 0.35);
        // Add some random energy bursts
        const burst = Math.random() > 0.85 ? 1.3 : 1.0;
        this.targets[i] = Math.random() * maxH * burst * OVERSHOOT;
      }
    }, 140);

    // Render frames at ~30fps for smoother animation
    this.frameTimer = setInterval(() => {
      if (!this.animating) return;
      for (let i = 0; i < BARS_COUNT; i++) {
        // Spring physics with damping
        const force = (this.targets[i] - this.bars[i]) * SPRING;
        this.velocities[i] = (this.velocities[i] + force) * DAMPING;
        this.bars[i] += this.velocities[i];
        // Clamp
        if (this.bars[i] < 0) {
          this.bars[i] = 0;
          this.velocities[i] = 0;
        }
      }
      this.tapeFrame++;
      if (this.renderCallback) this.renderCallback();
    }, 33);
  }

  pauseVisualizer() {
    this.vizPaused = true;
    // Stop random target generation
    if (this.targetTimer) clearInterval(this.targetTimer);
    this.targetTimer = null;
    // Set targets to 0 so bars settle down gracefully
    for (let i = 0; i < BARS_COUNT; i++) {
      this.targets[i] = 0;
    }
    // Frame timer keeps running to animate the settle + show PAUSED state
  }

  resumeVisualizer() {
    this.vizPaused = false;
    // Restart target generation
    if (!this.targetTimer) {
      this.targetTimer = setInterval(() => {
        if (!this.animating || this.vizPaused) return;
        for (let i = 0; i < BARS_COUNT; i++) {
          const center = BARS_COUNT / 2;
          const dist = Math.abs(i - center) / center;
          const maxH = BAR_HEIGHT * (1 - dist * 0.35);
          const burst = Math.random() > 0.85 ? 1.3 : 1.0;
          this.targets[i] = Math.random() * maxH * burst * OVERSHOOT;
        }
      }, 140);
    }
  }

  stopVisualizer() {
    this.animating = false;
    if (this.frameTimer) clearInterval(this.frameTimer);
    if (this.targetTimer) clearInterval(this.targetTimer);
    this.frameTimer = null;
    this.targetTimer = null;
  }

  // ─── Bars Visualizer (Multi-line with mirror) ────────────────────────────

  renderBars() {
    const lines = [];

    // ── Upper bars (row 0 = top, row BAR_HEIGHT-1 = bottom of upper half) ──
    for (let row = 0; row < BAR_HEIGHT; row++) {
      const threshold = BAR_HEIGHT - row; // what bar height fills this row
      let line = '  ';
      for (let i = 0; i < BARS_COUNT; i++) {
        const h = this.bars[i];
        if (h >= threshold) {
          // Full block in this row
          const colorIdx = Math.min(BAR_HEIGHT - 1 - row, BAR_GRADIENT.length - 1);
          line += BAR_GRADIENT[colorIdx](FULL_BLOCK);
        } else if (h >= threshold - 1 && h > threshold - 1) {
          // Partial block (fractional row)
          const frac = h - (threshold - 1);
          const blockIdx = Math.max(0, Math.min(8, Math.round(frac * 8)));
          const colorIdx = Math.min(BAR_HEIGHT - 1 - row, BAR_GRADIENT.length - 1);
          line += BAR_GRADIENT[colorIdx](UPPER_BLOCKS[blockIdx]);
        } else {
          line += ' ';
        }
      }
      lines.push(line);
    }

    // ── Center line ──
    let center = '  ';
    for (let i = 0; i < BARS_COUNT; i++) {
      const h = this.bars[i];
      if (h > 0.1) {
        // Use a rainbow color at the center for flair
        const colorIdx = Math.floor((i / BARS_COUNT) * RAINBOW.length);
        center += chalk.hex(RAINBOW[colorIdx % RAINBOW.length])('\u2500');
      } else {
        center += chalk.dim('\u2504');
      }
    }
    lines.push(center);

    // ── Mirror (reflection below center, dimmed and shorter) ──
    for (let row = 0; row < MIRROR_HEIGHT; row++) {
      const threshold = row + 1; // mirror row 0 = just below center
      let line = '  ';
      for (let i = 0; i < BARS_COUNT; i++) {
        // Mirror height is scaled down
        const mirrorH = this.bars[i] * (MIRROR_HEIGHT / BAR_HEIGHT) * 0.6;
        if (mirrorH >= threshold) {
          const colorIdx = Math.min(row, MIRROR_GRADIENT.length - 1);
          line += MIRROR_GRADIENT[colorIdx](FULL_BLOCK);
        } else if (mirrorH >= threshold - 1 && mirrorH > threshold - 1) {
          const frac = mirrorH - (threshold - 1);
          const blockIdx = Math.max(0, Math.min(8, Math.round(frac * 8)));
          const colorIdx = Math.min(row, MIRROR_GRADIENT.length - 1);
          line += MIRROR_GRADIENT[colorIdx](LOWER_BLOCKS[blockIdx]);
        } else {
          line += ' ';
        }
      }
      lines.push(line);
    }

    const result = this.renderPausedOverlay(lines);
    return result.join('\n');
  }

  // ─── Paused overlay ────────────────────────────────────────────────────

  renderPausedOverlay(lines) {
    if (!this.vizPaused) return lines;
    // Check if bars have settled (all near 0)
    const settled = this.bars.every(b => b < 0.15);
    if (!settled) return lines;
    // Overlay PAUSED text in the center of the visualization
    const midRow = Math.floor(lines.length / 2);
    const pauseText = '  \u2759\u2759  PAUSED';
    const colored = chalk.dim(pauseText);
    const result = [...lines];
    if (midRow >= 0 && midRow < result.length) {
      const padded = ' '.repeat(Math.max(0, Math.floor((BARS_COUNT - pauseText.length) / 2) + 2));
      result[midRow] = padded + colored;
    }
    return result;
  }

  // ─── Waveform Visualizer (oscilloscope) ──────────────────────────────────

  renderWaveform() {
    // Build a grid
    const grid = Array.from({ length: WAVE_HEIGHT }, () => new Array(BARS_COUNT).fill(0));

    // Calculate wave positions
    for (let i = 0; i < BARS_COUNT; i++) {
      // Oscilloscope: sine wave modulated by bar amplitude
      const amp = this.bars[i] / BAR_HEIGHT;
      const wave = Math.sin(i * 0.2 + this.tapeFrame * 0.06) * amp * WAVE_CENTER;
      const row = Math.round(WAVE_CENTER - wave);
      if (row >= 0 && row < WAVE_HEIGHT) {
        grid[row][i] = 4; // main line
        // Glow above and below
        if (row > 0) grid[row - 1][i] = Math.max(grid[row - 1][i], 2);
        if (row < WAVE_HEIGHT - 1) grid[row + 1][i] = Math.max(grid[row + 1][i], 2);
        if (row > 1) grid[row - 2][i] = Math.max(grid[row - 2][i], 1);
        if (row < WAVE_HEIGHT - 2) grid[row + 2][i] = Math.max(grid[row + 2][i], 1);
      }
    }

    // Render
    const lines = [];
    for (let row = 0; row < WAVE_HEIGHT; row++) {
      let line = '  ';
      if (row === WAVE_CENTER) {
        // Center baseline
        for (let i = 0; i < BARS_COUNT; i++) {
          const v = grid[row][i];
          if (v >= 4) {
            line += WAVE_GRADIENT[0](FULL_BLOCK);
          } else if (v >= 2) {
            line += WAVE_GRADIENT[1]('\u2593');
          } else if (v >= 1) {
            line += WAVE_GRADIENT[2]('\u2591');
          } else {
            line += chalk.dim('\u2504');
          }
        }
      } else {
        for (let i = 0; i < BARS_COUNT; i++) {
          const v = grid[row][i];
          if (v >= 4) {
            line += WAVE_GRADIENT[0](FULL_BLOCK);
          } else if (v >= 2) {
            line += WAVE_GRADIENT[1]('\u2593');
          } else if (v >= 1) {
            line += WAVE_GRADIENT[3]('\u2591');
          } else {
            line += ' ';
          }
        }
      }
      lines.push(line);
    }

    const result = this.renderPausedOverlay(lines);
    return result.join('\n');
  }

  // ─── Rain Visualizer (matrix rain) ─────────────────────────────────────

  renderRain() {
    // Update rain grid every 3 frames for smooth but visible fall speed
    if (this.tapeFrame % 3 === 0) {
      // Shift everything down
      for (let row = RAIN_HEIGHT - 1; row > 0; row--) {
        for (let col = 0; col < BARS_COUNT; col++) {
          this.rainGrid[row][col] = this.rainGrid[row - 1][col];
        }
      }
      // Spawn new drops at top based on bar intensity
      for (let col = 0; col < BARS_COUNT; col++) {
        const h = this.bars[col];
        if (h > 0.8 && Math.random() < (h / BAR_HEIGHT) * 0.7) {
          this.rainGrid[0][col] = Math.min(4, Math.ceil(h / 2));
        } else {
          this.rainGrid[0][col] = 0;
        }
      }
    }

    // Render the grid
    const lines = [];
    for (let row = 0; row < RAIN_HEIGHT; row++) {
      let line = '  ';
      for (let col = 0; col < BARS_COUNT; col++) {
        const v = this.rainGrid[row][col];
        if (v > 0 && v <= 4) {
          // Fade intensity based on row (further down = dimmer)
          const fadeLevel = Math.max(1, v - Math.floor(row / 4));
          line += RAIN_COLORS[fadeLevel](RAIN_CHARS[fadeLevel]);
        } else {
          line += ' ';
        }
      }
      lines.push(line);
    }

    const result = this.renderPausedOverlay(lines);
    return result.join('\n');
  }

  // ─── Flame Visualizer (fire effect) ────────────────────────────────────

  renderFlame() {
    // Update flame heat map
    // Bottom row = bar values (heat source)
    for (let col = 0; col < BARS_COUNT; col++) {
      this.flameGrid[FLAME_HEIGHT - 1][col] = this.bars[col] / BAR_HEIGHT;
    }

    // Propagate heat upward with decay, spread, and randomness
    for (let row = 0; row < FLAME_HEIGHT - 1; row++) {
      for (let col = 0; col < BARS_COUNT; col++) {
        // Heat comes from below: average of below-left, below, below-right
        const below = this.flameGrid[row + 1][col];
        const belowL = col > 0 ? this.flameGrid[row + 1][col - 1] : 0;
        const belowR = col < BARS_COUNT - 1 ? this.flameGrid[row + 1][col + 1] : 0;
        // Weighted average with decay
        let heat = (below * 0.55 + belowL * 0.15 + belowR * 0.15);
        // Add flicker randomness
        heat += (Math.random() - 0.5) * 0.15;
        // Decay as we go up (row 0 = top = coolest)
        const decay = 1 - (FLAME_HEIGHT - 1 - row) / (FLAME_HEIGHT + 2);
        heat *= decay;
        this.flameGrid[row][col] = Math.max(0, Math.min(1, heat));
      }
    }

    // Render
    const lines = [];
    for (let row = 0; row < FLAME_HEIGHT; row++) {
      let line = '  ';
      for (let col = 0; col < BARS_COUNT; col++) {
        const heat = this.flameGrid[row][col];
        if (heat < 0.05) {
          line += ' ';
        } else {
          // Map heat to character density
          const charIdx = Math.min(4, Math.ceil(heat * 4));
          // Map row to color (bottom = yellow, top = dark red)
          const colorIdx = Math.min(FLAME_GRADIENT.length - 1, row);
          line += FLAME_GRADIENT[colorIdx](FLAME_CHARS[charIdx]);
        }
      }
      lines.push(line);
    }

    const result = this.renderPausedOverlay(lines);
    return result.join('\n');
  }

  // ─── Tape Deck Visualizer ────────────────────────────────────────────────

  renderTape(position, duration) {
    const pct = duration > 0 ? Math.min(position / duration, 1) : 0;

    // Reel sizes: left shrinks as playback progresses, right grows
    const leftRadius = Math.max(1, Math.round(4 - pct * 3));
    const rightRadius = Math.max(1, Math.round(1 + pct * 3));

    const spinFrame = this.tapeFrame;
    const leftReel = buildReel(leftRadius, spinFrame);
    const rightReel = buildReel(rightRadius, spinFrame + 2); // offset for visual variety

    // Build the tape deck display
    const lines = [];
    const deckWidth = 52;

    // ── Top border ──
    lines.push(
      chalk.hex('#8B7E74')('  \u256d' + '\u2500'.repeat(deckWidth) + '\u256e')
    );

    // ── Label area ──
    lines.push(
      chalk.hex('#8B7E74')('  \u2502') +
      chalk.hex('#FFD500')(' \u266b ') +
      chalk.hex('#FFFFFF').bold('SONIC PLAYER') +
      ' '.repeat(deckWidth - 16) +
      chalk.hex('#FF6600')(' \u266b') +
      chalk.hex('#8B7E74')(' \u2502')
    );

    // ── Thin separator ──
    lines.push(
      chalk.hex('#8B7E74')('  \u251c') +
      chalk.dim('\u2500'.repeat(deckWidth)) +
      chalk.hex('#8B7E74')('\u2524')
    );

    // ── Reels area ──
    // Pad reels to same height
    const maxReelH = Math.max(leftReel.length, rightReel.length);
    const leftPadded = padReelVertical(leftReel, maxReelH);
    const rightPadded = padReelVertical(rightReel, maxReelH);

    const leftReelWidth = leftPadded[0].length;
    const rightReelWidth = rightPadded[0].length;
    const gapWidth = deckWidth - leftReelWidth - rightReelWidth - 4;

    for (let r = 0; r < maxReelH; r++) {
      const leftStr = chalk.hex('#00DDFF')(leftPadded[r]);
      const rightStr = chalk.hex('#FF9500')(rightPadded[r]);

      let mid;
      if (r === Math.floor(maxReelH / 2)) {
        // Tape path across the middle
        const tapePath = buildTapePath(gapWidth, spinFrame);
        mid = tapePath;
      } else {
        mid = ' '.repeat(gapWidth);
      }

      lines.push(
        chalk.hex('#8B7E74')('  \u2502') +
        '  ' + leftStr + mid + rightStr + '  ' +
        chalk.hex('#8B7E74')('\u2502')
      );
    }

    // ── Tape path bottom (connecting under reels) ──
    const tapeBottomL = Math.floor((deckWidth - 20) / 2);
    const tapeBottomR = deckWidth - 20 - tapeBottomL;
    lines.push(
      chalk.hex('#8B7E74')('  \u2502') +
      ' '.repeat(tapeBottomL) +
      chalk.hex('#AA8855')('\u2570' + '\u2500'.repeat(18) + '\u256f') +
      ' '.repeat(tapeBottomR) +
      chalk.hex('#8B7E74')('\u2502')
    );

    // ── Track info area ──
    lines.push(
      chalk.hex('#8B7E74')('  \u251c') +
      chalk.dim('\u2500'.repeat(deckWidth)) +
      chalk.hex('#8B7E74')('\u2524')
    );

    // Progress indicator inside tape deck
    const barWidth = deckWidth - 6;
    const filled = Math.round(pct * barWidth);
    const empty = barWidth - filled;
    let progBar = '';
    for (let i = 0; i < filled; i++) {
      const cIdx = Math.floor((i / barWidth) * RAINBOW.length);
      progBar += chalk.hex(RAINBOW[Math.min(cIdx, RAINBOW.length - 1)])('\u2588');
    }
    progBar += chalk.dim('\u2591'.repeat(empty));

    const timeStr = duration > 0
      ? `${formatDuration(position)}/${formatDuration(duration)}`
      : '--:--/--:--';

    lines.push(
      chalk.hex('#8B7E74')('  \u2502') +
      '  ' + chalk.hex('#FF2020')('\u25cf') + ' ' + progBar + '  ' +
      chalk.hex('#8B7E74')('\u2502')
    );

    lines.push(
      chalk.hex('#8B7E74')('  \u2502') +
      centerText(chalk.dim(timeStr), deckWidth) +
      chalk.hex('#8B7E74')('\u2502')
    );

    // ── Bottom border ──
    lines.push(
      chalk.hex('#8B7E74')('  \u2570' + '\u2500'.repeat(deckWidth) + '\u256f')
    );

    return lines.join('\n');
  }

  // ─── Cleanup ─────────────────────────────────────────────────────────────

  cleanup() {
    this.stopVisualizer();
    this.showCursor();
    process.stdout.write('\x1b[0m\n');
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max - 1) + '\u2026' : str;
}

function padReelVertical(reel, targetHeight) {
  const padTop = Math.floor((targetHeight - reel.length) / 2);
  const padBot = targetHeight - reel.length - padTop;
  const width = reel[0].length;
  const blank = ' '.repeat(width);
  return [
    ...Array(padTop).fill(blank),
    ...reel,
    ...Array(padBot).fill(blank),
  ];
}

function buildTapePath(width, frame) {
  // Animated tape path between reels
  if (width <= 0) return '';
  let path = '';
  for (let i = 0; i < width; i++) {
    // Subtle wave animation
    const wave = Math.sin((i + frame * 0.5) * 0.4);
    if (wave > 0.6) {
      path += chalk.hex('#AA8855')('\u2550');
    } else if (wave > 0.0) {
      path += chalk.hex('#887744')('\u2500');
    } else if (wave > -0.6) {
      path += chalk.hex('#665533')('\u2500');
    } else {
      path += chalk.hex('#887744')('\u2550');
    }
  }
  return path;
}

function centerText(text, width) {
  // Strip ANSI for length calculation
  const stripped = text.replace(/\x1b\[[0-9;]*m/g, '');
  const pad = Math.max(0, Math.floor((width - stripped.length) / 2));
  const rightPad = Math.max(0, width - stripped.length - pad);
  return ' '.repeat(pad) + text + ' '.repeat(rightPad);
}
