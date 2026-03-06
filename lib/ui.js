import chalk from 'chalk';
import { formatDuration } from './search.js';
import { cycleTheme, getTheme, normalizeThemeId } from './themes.js';

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

// Visualization modes
const VIZ_MODES = ['bars', 'tape', 'wave', 'rain', 'flame'];

// Wave visualizer
const WAVE_HEIGHT = 13; // rows (6 above + center + 6 below)
const WAVE_CENTER = 6;

// Rain visualizer
const RAIN_HEIGHT = 14;
const RAIN_CHARS = [' ', '\u2591', '\u2592', '\u2593', FULL_BLOCK]; // ░ ▒ ▓ █

// Flame visualizer
const FLAME_HEIGHT = 10;
const FLAME_CHARS = [' ', '\u2591', '\u2592', '\u2593', FULL_BLOCK]; // ░ ▒ ▓ █

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

const HEADER_CACHE = new Map();

function colorizeHeader(theme) {
  const maxLen = Math.max(...SONIC_ART.map(l => l.length));
  const lines = SONIC_ART.map(line => line.padEnd(maxLen));
  const colored = [];
  const gradient = theme.headerGradient;

  for (const line of lines) {
    let out = '';
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === ' ') {
        out += ' ';
      } else {
        // Map column position to rainbow
        const colorIdx = Math.floor((i / maxLen) * gradient.length);
        const color = gradient[Math.min(colorIdx, gradient.length - 1)];
        out += chalk.hex(color)(ch);
      }
    }
    colored.push(out);
  }
  return colored;
}

function getHeaderLines(theme) {
  if (!HEADER_CACHE.has(theme.id)) {
    HEADER_CACHE.set(theme.id, colorizeHeader(theme));
  }

  return HEADER_CACHE.get(theme.id);
}

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
    this.themeName = 'neon-night';
    this.tapeFrame = 0;
    // Rain state: 2D grid of intensities (0=empty, 1-4=intensity)
    this.rainGrid = Array.from({ length: RAIN_HEIGHT }, () => new Array(BARS_COUNT).fill(0));
    // Flame state: heat map
    this.flameGrid = Array.from({ length: FLAME_HEIGHT }, () => new Array(BARS_COUNT).fill(0));
  }

  get theme() {
    return getTheme(this.themeName);
  }

  setTheme(themeName) {
    this.themeName = normalizeThemeId(themeName);
    return this.themeName;
  }

  cycleTheme(direction = 1) {
    this.themeName = cycleTheme(this.themeName, direction);
    return this.themeName;
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
    const theme = this.theme;
    let out = '\n';
    for (const line of getHeaderLines(theme)) {
      out += line + '\n';
    }
    const brand = source ? PLATFORM_BRANDS[source] : null;
    if (brand) {
      out += '  '
        + chalk.hex(brand.color).bold(`${brand.icon} ${brand.label}`)
        + chalk.hex(theme.muted)(` \u00b7 ${theme.name}`)
        + chalk.dim(' \u00b7 stream anything from your terminal')
        + '\n';
    } else {
      out += chalk.hex(theme.muted)(`  ${theme.name}`) + chalk.dim(' \u00b7 stream anything from your terminal') + '\n';
    }
    return out;
  }

  // ─── Channel Picker UI ──────────────────────────────────────────────────

  picker(items, cursorIdx, activeTab, options = {}) {
    const theme = this.theme;
    // Tab bar
    const vibesTab = activeTab === 'vibes'
      ? chalk.hex(theme.text).bold.underline('vibes')
      : chalk.hex(theme.muted)('vibes');
    const activitiesTab = activeTab === 'activities'
      ? chalk.hex(theme.text).bold.underline('sessions')
      : chalk.hex(theme.muted)('sessions');
    let out = '\n  ' + vibesTab + '  ' + chalk.hex(theme.muted)('|') + '  ' + activitiesTab + '\n\n';

    for (let i = 0; i < items.length; i++) {
      const c = items[i];
      const selected = i === cursorIdx;
      const pointer = selected ? chalk.hex(theme.accent)('\u25b8') : ' ';
      const name = selected
        ? chalk.hex(theme.text).bold(c.name)
        : chalk.hex(theme.muted)(c.name);
      const desc = selected
        ? chalk.hex(theme.text)(c.desc)
        : chalk.hex(theme.muted)(c.desc);
      out += `  ${pointer} ${c.icon}  ${name}${' '.repeat(Math.max(1, 16 - c.name.length))}${desc}\n`;
    }
    const sourceLabel = options.source === 'soundcloud' ? 'soundcloud' : 'youtube';
    const libraryLabel = `f favorites (${options.favoritesCount || 0}) \u00b7 r recents (${options.recentsCount || 0})`;
    out += `\n  ${chalk.hex(theme.muted)(`theme: ${theme.name} \u00b7 source: ${sourceLabel} \u00b7 ${libraryLabel}`)}\n`;
    out += `  ${chalk.hex(theme.muted)('\u2191\u2193 navigate \u00b7 \u2190\u2192 or tab switch \u00b7 enter play \u00b7 / search \u00b7 m source \u00b7 t theme \u00b7 q quit')}\n`;
    return out;
  }

  // ─── Search / Results UI ─────────────────────────────────────────────────

  searchPrompt() {
    return `  ${chalk.hex(this.theme.muted)('what do you want to hear?')}\n  ${chalk.hex(this.theme.text)('\u25b8')} `;
  }

  spinner(frame, msg) {
    const frames = ['\u280b', '\u2819', '\u2839', '\u2838', '\u283c', '\u2834', '\u2826', '\u2827', '\u2807', '\u280f'];
    return `  ${chalk.hex(this.theme.spinner)(frames[frame % frames.length])} ${chalk.hex(this.theme.muted)(msg)}`;
  }

  // Full-screen loading state with animated waveform
  // stage: 'connecting' | 'buffering' | 'ready'
  loadingScreen(frame, track, source, stage = 'connecting') {
    const theme = this.theme;
    let out = '';
    out += this.header(source);
    out += '\n';

    // Track info with platform branding
    if (track) {
      const brand = source ? PLATFORM_BRANDS[source] : null;
      out += `  ${chalk.hex(theme.accent)('\u266b')} ${chalk.hex(theme.text).bold(truncate(track.title, 48))}\n`;
      const meta = [];
      if (brand) meta.push(chalk.hex(brand.color)(`${brand.icon} ${brand.label}`));
      if (track.channel) meta.push(chalk.hex(theme.muted)(truncate(track.channel, 30)));
      if (track.duration) meta.push(chalk.hex(theme.muted)(formatDuration(track.duration)));
      out += `  ${meta.join(chalk.hex(theme.muted)(' \u00b7 '))}\n`;
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
          const colorIdx = Math.floor((i / width) * theme.headerGradient.length);
          // Intensity based on how much above threshold
          const intensity = combined - threshold;
          if (intensity > 0.15) {
            line += chalk.hex(theme.headerGradient[colorIdx])(FULL_BLOCK);
          } else {
            line += chalk.hex(theme.headerGradient[colorIdx])('\u2584');
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
    const spin = chalk.hex(theme.spinner)(spinFrames[frame % spinFrames.length]);
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
        stageDots.push(chalk.hex(theme.accent)('\u25cf')); // filled green
      } else if (i === currentIdx) {
        stageDots.push(chalk.hex(theme.spinner)('\u25cf')); // active
      } else {
        stageDots.push(chalk.hex(theme.muted)('\u25cb')); // empty
      }
    }

    out += `  ${spin} ${chalk.hex(theme.muted)(msg)}  ${stageDots.join(' ')}\n`;

    return out;
  }

  resultsList(results, cursorIdx = 0, options = {}) {
    const theme = this.theme;
    let out = '\n';
    if (options.title) {
      out += `  ${chalk.hex(theme.text).bold(options.title)}`;
      if (options.subtitle) {
        out += `  ${chalk.hex(theme.muted)('\u00b7')} ${chalk.hex(theme.muted)(truncate(options.subtitle, 54))}`;
      }
      out += '\n\n';
    }

    if (results.length === 0) {
      out += `  ${chalk.hex(theme.muted)(options.emptyMessage || 'nothing here yet.')}\n`;
      out += `\n  ${chalk.hex(theme.muted)(options.footer || '/ search \u00b7 b back \u00b7 q quit')}\n`;
      return out;
    }

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      const selected = i === cursorIdx;
      const pointer = selected ? chalk.hex(theme.accent)('\u25b8') : ' ';
      const num = chalk.hex(theme.muted)(`${i + 1}`);
      const favorite = r.favorite ? chalk.hex(theme.favorite)('\u2665') : chalk.hex(theme.muted)('\u00b7');
      const title = selected
        ? chalk.hex(theme.text).bold(truncate(r.title, 50))
        : chalk.hex(theme.muted)(truncate(r.title, 50));
      const dur = selected
        ? chalk.hex(theme.text)(formatDuration(r.duration))
        : chalk.hex(theme.muted)(formatDuration(r.duration));
      const chan = chalk.hex(theme.muted).italic(truncate(r.channel, 20));
      out += `  ${pointer} ${num} ${favorite} ${title}  ${dur}  ${chan}\n`;
    }
    out += `\n  ${chalk.hex(theme.muted)(options.footer || '\u2191\u2193 navigate \u00b7 enter play \u00b7 f favorite \u00b7 / search \u00b7 b back \u00b7 q quit')}\n`;
    return out;
  }

  nowPlaying(title, channel, duration, source = 'youtube', options = {}) {
    const theme = this.theme;
    const t = chalk.hex(theme.text).bold(truncate(title, 48));
    const brand = PLATFORM_BRANDS[source] || PLATFORM_BRANDS.youtube;
    const srcLabel = chalk.hex(brand.color).bold(`${brand.icon} ${brand.label}`);
    const meta = chalk.hex(theme.muted)(`${formatDuration(duration)} \u00b7 ${channel}`);
    const status = [];
    if (options.favorite) status.push(chalk.hex(theme.favorite)('\u2665 favorite'));
    if (options.queueLength > 0) status.push(chalk.hex(theme.muted)(`next ${options.queueLength}`));
    if (options.historyLength > 0) status.push(chalk.hex(theme.muted)(`prev ${options.historyLength}`));
    const statusLine = status.length ? `\n  ${status.join(chalk.hex(theme.muted)(' \u00b7 '))}` : '';
    return `  ${chalk.hex(theme.accent)('\u266b')} ${t}\n  ${srcLabel} ${chalk.hex(theme.muted)('\u00b7')} ${meta}${statusLine}`;
  }

  progressBar(position, duration, width = 40) {
    const theme = this.theme;
    if (!duration) return '';
    const pct = Math.min(position / duration, 1);
    const filled = Math.round(pct * width);
    const empty = width - filled;

    // Gradient the filled portion
    let bar = '';
    for (let i = 0; i < filled; i++) {
      const colorIdx = Math.floor((i / width) * theme.headerGradient.length);
      const color = theme.headerGradient[Math.min(colorIdx, theme.headerGradient.length - 1)];
      bar += chalk.hex(color)('\u2501');
    }
    bar += chalk.hex(theme.muted)('\u2500'.repeat(empty));

    const knob = filled < width ? chalk.hex(theme.text)('\u25cf') : '';
    const time = `${formatDuration(position)} ${chalk.hex(theme.muted)('/')} ${formatDuration(duration)}`;
    return `  ${bar}${knob}  ${chalk.hex(theme.muted)(time)}`;
  }

  controls(paused, options = {}) {
    const theme = this.theme;
    const items = [
      paused ? 'space resume' : 'space pause',
      options.canGoBack ? 'p prev' : null,
      options.queueLength > 0 ? `n next(${options.queueLength})` : 'n next',
      options.isFavorite ? 'f unfavorite' : 'f favorite',
      '/ search',
      'o open',
      'v viz',
      't theme',
      '- + volume',
      '[ ]  seek',
      'q quit'
    ].filter(Boolean);
    const color = theme.modeColors[this.vizMode] || theme.text;
    const modeLabel = chalk.hex(color)(`[${this.vizMode}]`);
    return `  ${chalk.hex(theme.muted)(items.join(' \u00b7 '))}  ${modeLabel}  ${chalk.hex(theme.muted)(`[${theme.name}]`)}`;
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
    const theme = this.theme;
    const barGradient = theme.bars.map((color) => chalk.hex(color));
    const mirrorGradient = theme.mirror.map((color) => chalk.hex(color));
    const lines = [];

    // ── Upper bars (row 0 = top, row BAR_HEIGHT-1 = bottom of upper half) ──
    for (let row = 0; row < BAR_HEIGHT; row++) {
      const threshold = BAR_HEIGHT - row; // what bar height fills this row
      let line = '  ';
      for (let i = 0; i < BARS_COUNT; i++) {
        const h = this.bars[i];
        if (h >= threshold) {
          // Full block in this row
          const colorIdx = Math.min(BAR_HEIGHT - 1 - row, barGradient.length - 1);
          line += barGradient[colorIdx](FULL_BLOCK);
        } else if (h >= threshold - 1 && h > threshold - 1) {
          // Partial block (fractional row)
          const frac = h - (threshold - 1);
          const blockIdx = Math.max(0, Math.min(8, Math.round(frac * 8)));
          const colorIdx = Math.min(BAR_HEIGHT - 1 - row, barGradient.length - 1);
          line += barGradient[colorIdx](UPPER_BLOCKS[blockIdx]);
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
        const colorIdx = Math.floor((i / BARS_COUNT) * theme.headerGradient.length);
        center += chalk.hex(theme.headerGradient[colorIdx % theme.headerGradient.length])('\u2500');
      } else {
        center += chalk.hex(theme.muted)('\u2504');
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
          const colorIdx = Math.min(row, mirrorGradient.length - 1);
          line += mirrorGradient[colorIdx](FULL_BLOCK);
        } else if (mirrorH >= threshold - 1 && mirrorH > threshold - 1) {
          const frac = mirrorH - (threshold - 1);
          const blockIdx = Math.max(0, Math.min(8, Math.round(frac * 8)));
          const colorIdx = Math.min(row, mirrorGradient.length - 1);
          line += mirrorGradient[colorIdx](LOWER_BLOCKS[blockIdx]);
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
    const theme = this.theme;
    // Check if bars have settled (all near 0)
    const settled = this.bars.every(b => b < 0.15);
    if (!settled) return lines;
    // Overlay PAUSED text in the center of the visualization
    const midRow = Math.floor(lines.length / 2);
    const pauseText = '  \u2759\u2759  PAUSED';
    const colored = chalk.hex(theme.muted)(pauseText);
    const result = [...lines];
    if (midRow >= 0 && midRow < result.length) {
      const padded = ' '.repeat(Math.max(0, Math.floor((BARS_COUNT - pauseText.length) / 2) + 2));
      result[midRow] = padded + colored;
    }
    return result;
  }

  // ─── Waveform Visualizer (oscilloscope) ──────────────────────────────────

  renderWaveform() {
    const theme = this.theme;
    const waveGradient = theme.wave.map((color) => chalk.hex(color));
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
            line += waveGradient[0](FULL_BLOCK);
          } else if (v >= 2) {
            line += waveGradient[1]('\u2593');
          } else if (v >= 1) {
            line += waveGradient[2]('\u2591');
          } else {
            line += chalk.hex(theme.muted)('\u2504');
          }
        }
      } else {
        for (let i = 0; i < BARS_COUNT; i++) {
          const v = grid[row][i];
          if (v >= 4) {
            line += waveGradient[0](FULL_BLOCK);
          } else if (v >= 2) {
            line += waveGradient[1]('\u2593');
          } else if (v >= 1) {
            line += waveGradient[3]('\u2591');
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
    const theme = this.theme;
    const rainColors = theme.rain.map((color) => color ? chalk.hex(color) : null);
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
          line += rainColors[fadeLevel](RAIN_CHARS[fadeLevel]);
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
    const theme = this.theme;
    const flameGradient = theme.flame.map((color) => chalk.hex(color));
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
          const colorIdx = Math.min(flameGradient.length - 1, row);
          line += flameGradient[colorIdx](FLAME_CHARS[charIdx]);
        }
      }
      lines.push(line);
    }

    const result = this.renderPausedOverlay(lines);
    return result.join('\n');
  }

  // ─── Tape Deck Visualizer ────────────────────────────────────────────────

  renderTape(position, duration) {
    const theme = this.theme;
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
    const tape = theme.tape;

    // ── Top border ──
    lines.push(
      chalk.hex(tape.frame)('  \u256d' + '\u2500'.repeat(deckWidth) + '\u256e')
    );

    // ── Label area ──
    lines.push(
      chalk.hex(tape.frame)('  \u2502') +
      chalk.hex(tape.badgeLeft)(' \u266b ') +
      chalk.hex(tape.label).bold('SONIC PLAYER') +
      ' '.repeat(deckWidth - 16) +
      chalk.hex(tape.badgeRight)(' \u266b') +
      chalk.hex(tape.frame)(' \u2502')
    );

    // ── Thin separator ──
    lines.push(
      chalk.hex(tape.frame)('  \u251c') +
      chalk.hex(theme.muted)('\u2500'.repeat(deckWidth)) +
      chalk.hex(tape.frame)('\u2524')
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
      const leftStr = chalk.hex(tape.reelLeft)(leftPadded[r]);
      const rightStr = chalk.hex(tape.reelRight)(rightPadded[r]);

      let mid;
      if (r === Math.floor(maxReelH / 2)) {
        // Tape path across the middle
        const tapePath = buildTapePath(gapWidth, spinFrame, tape);
        mid = tapePath;
      } else {
        mid = ' '.repeat(gapWidth);
      }

      lines.push(
        chalk.hex(tape.frame)('  \u2502') +
        '  ' + leftStr + mid + rightStr + '  ' +
        chalk.hex(tape.frame)('\u2502')
      );
    }

    // ── Tape path bottom (connecting under reels) ──
    const tapeBottomL = Math.floor((deckWidth - 20) / 2);
    const tapeBottomR = deckWidth - 20 - tapeBottomL;
    lines.push(
      chalk.hex(tape.frame)('  \u2502') +
      ' '.repeat(tapeBottomL) +
      chalk.hex(tape.bridgeBright)('\u2570' + '\u2500'.repeat(18) + '\u256f') +
      ' '.repeat(tapeBottomR) +
      chalk.hex(tape.frame)('\u2502')
    );

    // ── Track info area ──
    lines.push(
      chalk.hex(tape.frame)('  \u251c') +
      chalk.hex(theme.muted)('\u2500'.repeat(deckWidth)) +
      chalk.hex(tape.frame)('\u2524')
    );

    // Progress indicator inside tape deck
    const barWidth = deckWidth - 6;
    const filled = Math.round(pct * barWidth);
    const empty = barWidth - filled;
    let progBar = '';
    for (let i = 0; i < filled; i++) {
      const cIdx = Math.floor((i / barWidth) * theme.headerGradient.length);
      progBar += chalk.hex(theme.headerGradient[Math.min(cIdx, theme.headerGradient.length - 1)])('\u2588');
    }
    progBar += chalk.hex(theme.muted)('\u2591'.repeat(empty));

    const timeStr = duration > 0
      ? `${formatDuration(position)}/${formatDuration(duration)}`
      : '--:--/--:--';

    lines.push(
      chalk.hex(tape.frame)('  \u2502') +
      '  ' + chalk.hex(tape.progressDot)('\u25cf') + ' ' + progBar + '  ' +
      chalk.hex(tape.frame)('\u2502')
    );

    lines.push(
      chalk.hex(tape.frame)('  \u2502') +
      centerText(chalk.hex(theme.muted)(timeStr), deckWidth) +
      chalk.hex(tape.frame)('\u2502')
    );

    // ── Bottom border ──
    lines.push(
      chalk.hex(tape.frame)('  \u2570' + '\u2500'.repeat(deckWidth) + '\u256f')
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

function buildTapePath(width, frame, tape) {
  // Animated tape path between reels
  if (width <= 0) return '';
  let path = '';
  for (let i = 0; i < width; i++) {
    // Subtle wave animation
    const wave = Math.sin((i + frame * 0.5) * 0.4);
    if (wave > 0.6) {
      path += chalk.hex(tape.bridgeBright)('\u2550');
    } else if (wave > 0.0) {
      path += chalk.hex(tape.bridgeMid)('\u2500');
    } else if (wave > -0.6) {
      path += chalk.hex(tape.bridgeDark)('\u2500');
    } else {
      path += chalk.hex(tape.bridgeMid)('\u2550');
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
