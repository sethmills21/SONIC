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
    this.vizMode = 'bars'; // 'bars' | 'tape'
    this.tapeFrame = 0;
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
    this.vizMode = this.vizMode === 'bars' ? 'tape' : 'bars';
  }

  // ─── Header ──────────────────────────────────────────────────────────────

  header() {
    let out = '\n';
    for (const line of HEADER_LINES) {
      out += line + '\n';
    }
    const tagline = chalk.dim('  stream anything from your terminal');
    out += tagline + '\n';
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

  resultsList(results) {
    let out = '\n';
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      const num = chalk.dim(`${i + 1}`);
      const title = chalk.white(truncate(r.title, 50));
      const dur = chalk.dim(formatDuration(r.duration));
      const chan = chalk.dim.italic(truncate(r.channel, 20));
      out += `  ${num}  ${title}  ${dur}  ${chan}\n`;
    }
    out += `\n  ${chalk.dim('enter = play #1 \u00b7 1-5 = pick \u00b7 / = new search')}\n`;
    return out;
  }

  nowPlaying(title, channel, duration, source = 'youtube') {
    const t = chalk.white.bold(truncate(title, 48));
    const srcColor = source === 'soundcloud' ? chalk.hex('#FF5500') : chalk.hex('#FF0000');
    const c = chalk.dim(`${srcColor(source)} \u00b7 ${formatDuration(duration)} \u00b7 ${channel}`);
    return `  ${chalk.hex('#6BCB77')('\u266b')} ${t}\n  ${c}`;
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

  controls(paused) {
    const items = [
      paused ? 'space resume' : 'space pause',
      '/ search',
      'v viz mode',
      '[ -10s',
      '] +10s',
      'q quit'
    ];
    const modeLabel = this.vizMode === 'tape'
      ? chalk.hex('#FF9500')('[tape]')
      : chalk.hex('#00DDFF')('[bars]');
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
    for (let i = 0; i < BARS_COUNT; i++) {
      this.targets[i] = 0.3;
    }
  }

  resumeVisualizer() {
    // targets will be set by the interval
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

    return lines.join('\n');
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
