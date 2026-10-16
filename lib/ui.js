import chalk from 'chalk';
import { formatDuration } from './search.js';
import { cycleTheme, detectColorMode, getTheme, normalizeThemeId } from './themes.js';

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_BARS = 72; // visualizer width cap; actual width follows the terminal
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
  mixcloud: { color: '#5000FF', icon: '\u266c', label: 'Mixcloud' },
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
    this.bars = new Array(MAX_BARS).fill(0);
    this.targets = new Array(MAX_BARS).fill(0);
    this.velocities = new Array(MAX_BARS).fill(0);
    this.frameTimer = null;
    this.targetTimer = null;
    this.renderCallback = null;
    this.animating = false;
    this.vizPaused = false;
    this.vizMode = 'bars';
    this.themeName = 'neon-night';
    this.colorMode = 'auto';
    this.tapeFrame = 0;
    // Rain state: 2D grid of intensities (0=empty, 1-4=intensity)
    this.rainGrid = Array.from({ length: RAIN_HEIGHT }, () => new Array(MAX_BARS).fill(0));
    // Flame state: heat map
    this.flameGrid = Array.from({ length: FLAME_HEIGHT }, () => new Array(MAX_BARS).fill(0));
  }

  get cols() {
    return process.stdout.columns || 100;
  }

  get rows() {
    return process.stdout.rows || 40;
  }

  // Inner width for everything below the header, so rows line up.
  get contentWidth() {
    return Math.max(40, Math.min(this.cols - 4, 96));
  }

  get vizWidth() {
    return Math.max(24, Math.min(this.cols - 6, MAX_BARS));
  }

  // The 6-row wordmark only fits when the playing screen still has room.
  get compactHeader() {
    return this.rows < 38;
  }

  get effectiveColorMode() {
    if (this.colorMode === 'auto') return detectColorMode();
    return this.colorMode;
  }

  get theme() {
    const base = getTheme(this.themeName);
    if (this.effectiveColorMode === 'light' && base.light) {
      return {
        ...base,
        text: base.light.text,
        muted: base.light.muted,
        accent: base.light.accent || base.accent,
        tape: { ...base.tape, label: base.light.text }
      };
    }
    return base;
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
    const brand = source ? PLATFORM_BRANDS[source] : null;
    const brandLabel = brand ? chalk.hex(brand.color).bold(`${brand.icon} ${brand.label}`) : '';
    const sep = chalk.hex(theme.muted)(' · ');

    if (this.compactHeader) {
      const word = 'S O N I C';
      let mark = '';
      for (let i = 0; i < word.length; i++) {
        const color = theme.headerGradient[Math.floor((i / word.length) * theme.headerGradient.length)];
        mark += word[i] === ' ' ? ' ' : chalk.hex(color).bold(word[i]);
      }
      const parts = [mark, brandLabel, chalk.hex(theme.muted)(theme.name)].filter(Boolean);
      return `\n  ${parts.join(sep)}\n`;
    }

    let out = '\n';
    for (const line of getHeaderLines(theme)) {
      out += line + '\n';
    }
    const parts = [brandLabel, chalk.hex(theme.muted)(theme.name), chalk.hex(theme.muted)('stream anything from your terminal')]
      .filter(Boolean);
    out += `  ${parts.join(sep)}\n`;
    return out;
  }

  // Key hints: key bright, label muted, wrapped to the content width.
  hints(pairs) {
    const theme = this.theme;
    const width = this.contentWidth;
    const lines = [];
    let line = '';
    let lineWidth = 0;
    for (const pair of pairs.filter(Boolean)) {
      const [key, label] = pair;
      const chunk = `${chalk.hex(theme.text).bold(key)} ${chalk.hex(theme.muted)(label)}`;
      const chunkWidth = displayWidth(key) + 1 + displayWidth(label);
      if (lineWidth && lineWidth + 3 + chunkWidth > width) {
        lines.push(line);
        line = '';
        lineWidth = 0;
      }
      line += (lineWidth ? '   ' : '') + chunk;
      lineWidth += (lineWidth ? 3 : 0) + chunkWidth;
    }
    if (line) lines.push(line);
    return lines.map(l => `  ${l}`).join('\n');
  }

  // ─── Channel Picker UI ──────────────────────────────────────────────────

  pickerTabs(activeTab) {
    const theme = this.theme;
    const tab = (id, label) => activeTab === id
      ? chalk.hex(theme.accent).bold(`● ${label}`)
      : chalk.hex(theme.muted)(`○ ${label}`);
    return `\n  ${tab('describe', 'describe')}   ${tab('vibes', 'vibes')}   ${tab('activities', 'sessions')}\n\n`;
  }

  libraryLine(options) {
    const theme = this.theme;
    const brand = PLATFORM_BRANDS[options.source] || PLATFORM_BRANDS.youtube;
    const library = [
      `${chalk.hex(brand.color)(brand.icon)} ${chalk.hex(theme.muted)(`playing from ${brand.label}`)}`,
      chalk.hex(theme.favorite)(`♥ ${options.favoritesCount || 0}`),
      chalk.hex(theme.muted)(`↺ ${options.recentsCount || 0} recent`)
    ];
    if (options.sourceNote) library.push(chalk.hex(theme.muted)(options.sourceNote));
    return `  ${library.join(chalk.hex(theme.muted)('   '))}\n`;
  }

  // The first tab: a text box for describing what you want to hear.
  describeTab({ text, examples, exampleIdx, notice, ...options }) {
    const theme = this.theme;
    const placeholder = ' a mood, a scene, an artist, a song, or a link';
    let out = this.pickerTabs('describe');
    out += `  ${chalk.hex(theme.text).bold('describe your vibe')}\n`;

    // Long text scrolls left so the caret stays inside the box.
    const inner = Math.max(24, Math.min(this.contentWidth, 76) - 4);
    let visible = '';
    let used = 0;
    for (const ch of [...text].reverse()) {
      const w = displayWidth(ch);
      if (used + w > inner - 1) break;
      visible = ch + visible;
      used += w;
    }
    const caret = chalk.hex(theme.accent).inverse(' ');
    const body = text
      ? chalk.hex(theme.text)(visible) + caret
      : caret + chalk.hex(theme.muted)(fit(placeholder, inner - 1).trimEnd());
    const filled = text ? used + 1 : 1 + displayWidth(fit(placeholder, inner - 1).trimEnd());
    const edge = (s) => chalk.hex(theme.accent)(s);
    out += `  ${edge('╭' + '─'.repeat(inner + 2) + '╮')}\n`;
    out += `  ${edge('│')} ${body}${' '.repeat(Math.max(0, inner - filled))} ${edge('│')}\n`;
    out += `  ${edge('╰' + '─'.repeat(inner + 2) + '╯')}\n\n`;

    examples.forEach((example, i) => {
      const label = i === 0 ? chalk.hex(theme.muted)('try') : '   ';
      const line = i === exampleIdx ? chalk.hex(theme.text).bold(example) : chalk.hex(theme.muted)(example);
      out += `  ${label}  ${line}\n`;
    });
    if (notice) out += notice;
    out += `\n${this.libraryLine(options)}\n`;
    out += this.hints([
      ['enter', text ? 'play this vibe' : 'play'],
      ['↑↓', 'examples'],
      ['esc', 'clear'],
      ['tab', 'vibes & shortcuts'],
      ['ctrl-c', 'quit']
    ]) + '\n';
    return out;
  }

  picker(items, cursorIdx, activeTab, options = {}) {
    const theme = this.theme;
    let out = this.pickerTabs(activeTab);

    const nameWidth = Math.max(...items.map(c => displayWidth(c.name))) + 3;
    for (let i = 0; i < items.length; i++) {
      const c = items[i];
      const selected = i === cursorIdx;
      const pointer = selected ? chalk.hex(theme.accent).bold('▸') : ' ';
      const key = chalk.hex(selected ? theme.accent : theme.muted)(c.key || ' ');
      const name = selected
        ? chalk.hex(theme.text).bold(fit(c.name, nameWidth))
        : chalk.hex(theme.text)(fit(c.name, nameWidth));
      const desc = chalk.hex(theme.muted)(c.desc);
      // Emoji widths differ between terminals; jump to a fixed column after the icon.
      out += `  ${pointer} ${key}  ${c.icon}${col(12)}${name}${desc}\n`;
    }

    out += `\n${this.libraryLine(options)}\n`;
    out += this.hints([
      ['enter', 'play'],
      ['1-0', 'jump'],
      ['tab', activeTab === 'vibes' ? 'sessions' : 'describe'],
      ['/', 'describe'],
      ['f', 'favorites'],
      ['r', 'recents'],
      options.needsConnect ? ['c', 'connect spotify'] : null,
      ['m', 'source'],
      ['t', 'theme'],
      ['d', 'light/dark'],
      ['q', 'quit']
    ]) + '\n';
    return out;
  }

  // ─── Spotify connect ─────────────────────────────────────────────────────

  // steps: [{ label, detail, state: 'done' | 'current' | 'todo' | 'busy' }]
  connectScreen({ steps, browser, browsers, busyFrame = 0, message, error, keys }) {
    const theme = this.theme;
    const green = PLATFORM_BRANDS.spotify.color;
    const spin = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let out = `\n  ${chalk.hex(green).bold('♫ Connect Spotify')}  ${chalk.hex(theme.muted)('one time, about a minute')}\n\n`;

    steps.forEach((step, i) => {
      const mark = step.state === 'done'
        ? chalk.hex(green).bold('✓')
        : step.state === 'busy'
          ? chalk.hex(theme.spinner)(spin[busyFrame % spin.length])
          : step.state === 'current'
            ? chalk.hex(theme.accent).bold('▸')
            : chalk.hex(theme.muted)('○');
      const label = step.state === 'todo'
        ? chalk.hex(theme.muted)(step.label)
        : chalk.hex(theme.text)[step.state === 'current' || step.state === 'busy' ? 'bold' : 'reset'](step.label);
      out += `  ${mark} ${chalk.hex(theme.muted)(String(i + 1))}  ${label}\n`;
      const detail = step.state === 'done' ? step.doneDetail : step.state === 'todo' ? null : step.detail;
      if (detail) {
        for (const line of detail.split('\n')) out += `       ${chalk.hex(theme.muted)(line)}\n`;
      }
    });

    if (browsers.length > 1) {
      const list = browsers
        .map((b) => (b.id === browser.id ? chalk.hex(theme.text).bold(b.label) : chalk.hex(theme.muted)(b.label)))
        .join(chalk.hex(theme.muted)(' · '));
      out += `\n  ${chalk.hex(theme.muted)('browser')}  ${list}\n`;
    }
    if (message) out += `\n  ${chalk.hex(green)(message)}\n`;
    if (error) {
      const [first, ...rest] = error.split('\n');
      out += `\n  ${chalk.hex(theme.favorite).bold('!')} ${chalk.hex(theme.text)(first)}\n`;
      for (const line of rest) out += `    ${chalk.hex(theme.muted)(line)}\n`;
    }
    out += '\n' + this.hints(keys) + '\n';
    out += `\n  ${chalk.hex(theme.muted)('sonic never sees your password. spogo keeps your spotify login on this machine.')}\n`;
    return out;
  }

  // ─── Search / Results UI ─────────────────────────────────────────────────

  // An error that stays on screen until the next key, instead of a timed flash.
  notice(label, message) {
    const theme = this.theme;
    const lines = String(message || '').split('\n');
    let out = `\n  ${chalk.hex(theme.favorite).bold(label)} ${chalk.hex(theme.text)(lines[0])}\n`;
    for (const line of lines.slice(1)) out += `  ${chalk.hex(theme.muted)(line)}\n`;
    return out;
  }

  spinner(frame, msg) {
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
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
    const width = this.vizWidth;
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
      remote: `asking spotify to play${dots}`,
    };
    const msg = stageMessages[stage] || stageMessages.connecting;

    // Progress dots: show which stages are done
    const stageDots = [];
    const stageOrder = stage === 'remote' ? ['remote'] : ['connecting', 'buffering', 'ready'];
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
    const width = this.contentWidth;
    let out = '\n';
    if (options.title) {
      out += `  ${chalk.hex(theme.text).bold(options.title)}`;
      if (options.subtitle) {
        out += `  ${chalk.hex(theme.muted)(fit(options.subtitle, width - displayWidth(options.title) - 4).trimEnd())}`;
      }
      out += '\n\n';
    }

    if (results.length === 0) {
      out += `  ${chalk.hex(theme.muted)(options.emptyMessage || 'nothing here yet.')}\n\n`;
      out += this.hints([['/', 'new vibe'], ['b', 'back'], ['m', 'source'], ['q', 'quit']]) + '\n';
      return out;
    }

    // Long lists (playlists) scroll around the cursor.
    const room = Math.max(5, this.rows - (this.compactHeader ? 10 : 16));
    const start = Math.max(0, Math.min(cursorIdx - Math.floor(room / 2), results.length - room));
    const end = Math.min(results.length, start + room);

    const numWidth = String(results.length).length;
    const channelWidth = Math.min(22, Math.max(10, Math.floor(width * 0.22)));
    const durWidth = 8;
    const titleWidth = Math.max(16, width - numWidth - channelWidth - durWidth - 12);

    if (start > 0) out += `  ${chalk.hex(theme.muted)(`  ↑ ${start} more`)}\n`;
    for (let i = start; i < end; i++) {
      const r = results[i];
      const selected = i === cursorIdx;
      const brand = PLATFORM_BRANDS[r.source] || PLATFORM_BRANDS.youtube;
      const pointer = selected ? chalk.hex(theme.accent).bold('▸') : ' ';
      const num = chalk.hex(theme.muted)(String(i + 1).padStart(numWidth));
      const mark = r.favorite
        ? chalk.hex(theme.favorite)('♥')
        : options.showSource ? chalk.hex(brand.color)(brand.icon) : chalk.hex(theme.muted)('·');
      const titleText = fit(r.title, titleWidth);
      const title = selected ? chalk.hex(theme.text).bold(titleText) : chalk.hex(theme.text)(titleText);
      const length = trackLength(r).padStart(durWidth);
      const dur = r.live
        ? chalk.hex(theme.favorite).bold(length)
        : chalk.hex(selected ? theme.text : theme.muted)(length);
      const chan = chalk.hex(theme.muted)(fit(r.channel, channelWidth));
      const durCol = 8 + numWidth + titleWidth;
      out += `  ${pointer} ${num} ${mark} ${title}${col(durCol)} ${dur}  ${chan}\n`;
    }
    if (end < results.length) out += `  ${chalk.hex(theme.muted)(`  ↓ ${results.length - end} more`)}\n`;

    const selected = results[cursorIdx];
    out += '\n' + this.hints([
      ['enter', 'play'],
      ['↑↓', 'move'],
      ['f', selected?.favorite ? 'unfavorite' : 'favorite'],
      ['/', 'new vibe'],
      ['b', 'back'],
      options.kind === 'search' ? ['m', 'try next source'] : null,
      ['t', 'theme'],
      ['q', 'quit']
    ]) + '\n';
    return out;
  }

  nowPlaying(track, options = {}) {
    const theme = this.theme;
    const width = this.contentWidth;
    const brand = PLATFORM_BRANDS[track.source] || PLATFORM_BRANDS.youtube;
    const heart = track.favorite ? `  ${chalk.hex(theme.favorite)('♥')}` : '';
    const title = `  ${chalk.hex(theme.accent)('♫')} ${chalk.hex(theme.text).bold(fit(track.title, width - 6).trimEnd())}${heart}`;

    const meta = [chalk.hex(brand.color).bold(`${brand.icon} ${brand.label}`)];
    if (track.channel) meta.push(chalk.hex(theme.text)(fit(track.channel, 32).trimEnd()));
    if (track.live) meta.push(chalk.hex(theme.favorite).bold('● LIVE'));
    if (options.device) meta.push(chalk.hex(theme.muted)(`on ${options.device}`));
    return `${title}\n  ${meta.join(chalk.hex(theme.muted)(' · '))}`;
  }

  // One line under the progress bar: volume, visualizer, theme, and what's next.
  statusLine(options = {}) {
    const theme = this.theme;
    const parts = [];
    if (typeof options.volume === 'number') {
      const steps = 10;
      const filled = Math.round((options.volume / 100) * steps);
      const meter = chalk.hex(theme.accent)('━'.repeat(filled)) + chalk.hex(theme.muted)('─'.repeat(steps - filled));
      parts.push(`${chalk.hex(theme.muted)('vol')} ${meter} ${chalk.hex(theme.muted)(String(options.volume))}`);
    }
    const vizColor = theme.modeColors[this.vizMode] || theme.text;
    parts.push(chalk.hex(vizColor)(this.vizMode));
    if (options.upNext) {
      parts.push(`${chalk.hex(theme.muted)('next')} ${chalk.hex(theme.text)(fit(options.upNext, 34).trimEnd())}`);
    }
    return `  ${parts.join(chalk.hex(theme.muted)('   '))}`;
  }

  progressBar(position, duration, options = {}) {
    const theme = this.theme;
    const width = Math.max(20, Math.min(this.vizWidth - 18, 60));

    if (options.live || !duration) {
      const pulse = Math.floor(Date.now() / 600) % 2 === 0;
      const dot = chalk.hex(pulse ? theme.favorite : theme.muted)('●');
      const label = options.live ? chalk.hex(theme.favorite).bold('LIVE') : chalk.hex(theme.muted)('streaming');
      return `  ${dot} ${label}  ${chalk.hex(theme.muted)(`${formatDuration(position)} in`)}`;
    }

    const pct = Math.min(position / duration, 1);
    const filled = Math.round(pct * width);
    let bar = '';
    for (let i = 0; i < filled; i++) {
      const colorIdx = Math.floor((i / width) * theme.headerGradient.length);
      const color = theme.headerGradient[Math.min(colorIdx, theme.headerGradient.length - 1)];
      bar += chalk.hex(color)('━');
    }
    const knob = filled < width ? chalk.hex(theme.text)('●') : '';
    bar += knob + chalk.hex(theme.muted)('─'.repeat(Math.max(0, width - filled - (knob ? 1 : 0))));

    const time = `${chalk.hex(theme.text)(formatDuration(position))} ${chalk.hex(theme.muted)(`/ ${formatDuration(duration)}`)}`;
    return `  ${bar}  ${time}`;
  }

  controls(paused, options = {}) {
    return this.hints([
      ['space', paused ? 'resume' : 'pause'],
      ['n', options.queueLength > 0 ? `next (${options.queueLength})` : 'next'],
      options.canGoBack ? ['p', 'prev'] : null,
      ['f', options.isFavorite ? 'unfavorite' : 'favorite'],
      ['- +', 'volume'],
      options.canSeek ? ['[ ]', 'seek'] : null,
      ['v', 'visualizer'],
      ['t', 'theme'],
      ['d', 'light/dark'],
      options.canOpen ? ['o', 'open'] : null,
      ['/', 'new vibe'],
      ['b', 'back'],
      ['q', 'quit']
    ]);
  }

  // ─── Visualizer Engine ───────────────────────────────────────────────────

  startVisualizer(onFrame) {
    this.animating = true;
    this.renderCallback = onFrame;
    this.tapeFrame = 0;

    // Update targets randomly at ~6-7 Hz
    this.targetTimer = setInterval(() => {
      if (!this.animating) return;
      for (let i = 0; i < this.vizWidth; i++) {
        // Bell curve bias: bars near center are taller
        const center = this.vizWidth / 2;
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
      for (let i = 0; i < this.vizWidth; i++) {
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
    for (let i = 0; i < this.vizWidth; i++) {
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
        for (let i = 0; i < this.vizWidth; i++) {
          const center = this.vizWidth / 2;
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
      for (let i = 0; i < this.vizWidth; i++) {
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
    for (let i = 0; i < this.vizWidth; i++) {
      const h = this.bars[i];
      if (h > 0.1) {
        // Use a rainbow color at the center for flair
        const colorIdx = Math.floor((i / this.vizWidth) * theme.headerGradient.length);
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
      for (let i = 0; i < this.vizWidth; i++) {
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
      const padded = ' '.repeat(Math.max(0, Math.floor((this.vizWidth - pauseText.length) / 2) + 2));
      result[midRow] = padded + colored;
    }
    return result;
  }

  // ─── Waveform Visualizer (oscilloscope) ──────────────────────────────────

  renderWaveform() {
    const theme = this.theme;
    const waveGradient = theme.wave.map((color) => chalk.hex(color));
    // Build a grid
    const grid = Array.from({ length: WAVE_HEIGHT }, () => new Array(this.vizWidth).fill(0));

    // Calculate wave positions
    for (let i = 0; i < this.vizWidth; i++) {
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
        for (let i = 0; i < this.vizWidth; i++) {
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
        for (let i = 0; i < this.vizWidth; i++) {
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
        for (let col = 0; col < this.vizWidth; col++) {
          this.rainGrid[row][col] = this.rainGrid[row - 1][col];
        }
      }
      // Spawn new drops at top based on bar intensity
      for (let col = 0; col < this.vizWidth; col++) {
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
      for (let col = 0; col < this.vizWidth; col++) {
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
    for (let col = 0; col < this.vizWidth; col++) {
      this.flameGrid[FLAME_HEIGHT - 1][col] = this.bars[col] / BAR_HEIGHT;
    }

    // Propagate heat upward with decay, spread, and randomness
    for (let row = 0; row < FLAME_HEIGHT - 1; row++) {
      for (let col = 0; col < this.vizWidth; col++) {
        // Heat comes from below: average of below-left, below, below-right
        const below = this.flameGrid[row + 1][col];
        const belowL = col > 0 ? this.flameGrid[row + 1][col - 1] : 0;
        const belowR = col < this.vizWidth - 1 ? this.flameGrid[row + 1][col + 1] : 0;
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
      for (let col = 0; col < this.vizWidth; col++) {
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
      ' '.repeat(deckWidth - 18) +
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

  // Crop a visualizer to `maxRows`, trimming the reflection side first.
  fitRows(block, maxRows) {
    const lines = block.split('\n');
    if (lines.length <= maxRows) return block;
    if (maxRows < 3) return '';
    const drop = lines.length - maxRows;
    const fromTop = Math.floor(drop / 3);
    return lines.slice(fromTop, fromTop + maxRows).join('\n');
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
  return fit(str, max).trimEnd();
}

const ANSI = /\x1b\[[0-9;?]*[a-zA-Z]/g;
const ZERO_WIDTH = /[\u0300-\u036F\u200B-\u200F\u20D0-\u20FF\uFE00-\uFE0F]|\p{M}/u;
const WIDE = /[\u1100-\u115F\u2E80-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFF60\uFFE0-\uFFE6]|\p{Emoji_Presentation}/u;

function charWidth(ch) {
  if (ZERO_WIDTH.test(ch)) return 0;
  return WIDE.test(ch) ? 2 : 1;
}

// Terminal columns a string takes, so emoji and CJK titles line up.
export function displayWidth(str) {
  let width = 0;
  for (const ch of String(str || '').replace(ANSI, '')) width += charWidth(ch);
  return width;
}

// Truncate to `width` columns with an ellipsis, then pad to exactly `width`.
function fit(str, width) {
  const text = String(str || '').replace(/\s+/g, ' ').trim();
  if (displayWidth(text) <= width) return text + ' '.repeat(width - displayWidth(text));
  let out = '';
  let used = 0;
  for (const ch of text) {
    const w = charWidth(ch);
    if (used + w > width - 1) break;
    out += ch;
    used += w;
  }
  return out + '\u2026' + ' '.repeat(Math.max(0, width - used - 1));
}

// Move to an absolute 1-based column, so later fields line up even when a
// terminal draws an emoji narrower or wider than expected.
function col(n) {
  return `\x1b[${n}G`;
}

function trackLength(track) {
  if (track.live) return 'LIVE';
  if (track.kind && track.kind !== 'track' && track.kind !== 'episode') {
    return track.trackCount ? `${track.trackCount} trk` : track.kind;
  }
  return formatDuration(track.duration);
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
