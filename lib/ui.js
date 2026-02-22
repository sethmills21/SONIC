import chalk from 'chalk';
import { formatDuration } from './search.js';

const BARS_COUNT = 40;
const BAR_CHARS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
const MAX_HEIGHT = BAR_CHARS.length;

// Color gradient for bars: cyan -> blue -> magenta -> red
const BAR_COLORS = [
  chalk.cyan,
  chalk.cyan,
  chalk.blue,
  chalk.blueBright,
  chalk.magenta,
  chalk.magentaBright,
  chalk.redBright,
  chalk.red,
];

export class UI {
  constructor() {
    this.bars = new Array(BARS_COUNT).fill(0);
    this.targets = new Array(BARS_COUNT).fill(0);
    this.frameTimer = null;
    this.targetTimer = null;
    this.renderCallback = null;
    this.animating = false;
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

  header() {
    const colors = [chalk.hex('#FF6B6B'), chalk.hex('#FFA07A'), chalk.hex('#FFD93D'), chalk.hex('#6BCB77'), chalk.hex('#4D96FF'), chalk.hex('#9B59B6')];
    const letters = 'SONIC'.split('');
    const colored = letters.map((l, i) => colors[i % colors.length](l)).join(' ');
    return `\n  ${chalk.dim('♫')}  ${colored}  ${chalk.dim('♫')}\n`;
  }

  searchPrompt() {
    return `  ${chalk.dim('what do you want to hear?')}\n  ${chalk.white('▸')} `;
  }

  spinner(frame, msg) {
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
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
    out += `\n  ${chalk.dim('enter = play #1 · 1-5 = pick · / = new search')}\n`;
    return out;
  }

  nowPlaying(title, channel, duration, source = 'youtube') {
    const t = chalk.white.bold(truncate(title, 48));
    const srcColor = source === 'soundcloud' ? chalk.hex('#FF5500') : chalk.hex('#FF0000');
    const c = chalk.dim(`${srcColor(source)} · ${formatDuration(duration)} · ${channel}`);
    return `  ${chalk.hex('#6BCB77')('♫')} ${t}\n  ${c}`;
  }

  progressBar(position, duration, width = 40) {
    if (!duration) return '';
    const pct = Math.min(position / duration, 1);
    const filled = Math.round(pct * width);
    const empty = width - filled;
    const bar = chalk.hex('#4D96FF')('━'.repeat(filled)) + chalk.dim('─'.repeat(empty));
    const time = `${formatDuration(position)} ${chalk.dim('/')} ${formatDuration(duration)}`;
    return `  ${bar}  ${chalk.dim(time)}`;
  }

  controls(paused) {
    const items = [
      paused ? 'space resume' : 'space pause',
      '/ search',
      '[ -10s',
      '] +10s',
      'q quit'
    ];
    return `  ${chalk.dim(items.join(' · '))}`;
  }

  // Visualizer animation
  startVisualizer(onFrame) {
    this.animating = true;
    this.renderCallback = onFrame;

    // Update targets randomly
    this.targetTimer = setInterval(() => {
      if (!this.animating) return;
      for (let i = 0; i < BARS_COUNT; i++) {
        // Bell curve bias: bars near center are taller
        const center = BARS_COUNT / 2;
        const dist = Math.abs(i - center) / center;
        const maxH = MAX_HEIGHT * (1 - dist * 0.4);
        this.targets[i] = Math.random() * maxH;
      }
    }, 150);

    // Render frames at ~24fps
    this.frameTimer = setInterval(() => {
      if (!this.animating) return;
      for (let i = 0; i < BARS_COUNT; i++) {
        this.bars[i] += (this.targets[i] - this.bars[i]) * 0.25;
      }
      if (this.renderCallback) this.renderCallback();
    }, 42);
  }

  pauseVisualizer() {
    for (let i = 0; i < BARS_COUNT; i++) {
      this.targets[i] = 0.5;
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

  renderBars() {
    let out = '  ';
    for (let i = 0; i < BARS_COUNT; i++) {
      const h = Math.max(0, Math.min(MAX_HEIGHT - 1, Math.floor(this.bars[i])));
      const colorFn = BAR_COLORS[h] || BAR_COLORS[0];
      out += colorFn(BAR_CHARS[h]);
    }
    return out;
  }

  cleanup() {
    this.stopVisualizer();
    this.showCursor();
    process.stdout.write('\x1b[0m\n');
  }
}

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}
