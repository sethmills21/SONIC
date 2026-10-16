export const DEFAULT_THEME = 'neon-night';

export const THEMES = [
  {
    id: 'neon-night',
    name: 'Neon Night',
    tagline: 'the original after-hours sonic glow',
    headerGradient: ['#FF0040', '#FF2020', '#FF6600', '#FFAA00', '#FFD500', '#AAFF00', '#44FF00', '#00FF88', '#00DDFF', '#0088FF', '#4400FF', '#8800FF', '#CC00FF', '#FF00AA'],
    accent: '#6BCB77',
    spinner: '#FF4FD8',
    favorite: '#FF5D8F',
    text: '#F8FAFF',
    muted: '#8F96B0',
    light: { text: '#12122A', muted: '#3D4260', accent: '#1A7A2E' },
    bars: ['#22CC44', '#44DD33', '#88EE22', '#BBEE11', '#DDDD00', '#EEAA00', '#FF6600', '#FF2200'],
    mirror: ['#115522', '#226611', '#447711', '#556600'],
    wave: ['#00FFFF', '#00DDFF', '#0099FF', '#0066CC'],
    rain: [null, '#003300', '#006600', '#00AA00', '#00FF41'],
    flame: ['#FFFF00', '#FFCC00', '#FF9900', '#FF6600', '#FF3300', '#FF0000', '#CC0000', '#880000', '#550000', '#330000'],
    modeColors: {
      bars: '#00DDFF',
      tape: '#FF9500',
      wave: '#00FFFF',
      rain: '#00FF41',
      flame: '#FF6600'
    },
    tape: {
      frame: '#8B7E74',
      badgeLeft: '#FFD500',
      badgeRight: '#FF6600',
      label: '#FFFFFF',
      reelLeft: '#00DDFF',
      reelRight: '#FF9500',
      bridgeBright: '#AA8855',
      bridgeMid: '#887744',
      bridgeDark: '#665533',
      progressDot: '#FF2020'
    }
  },
  {
    id: 'sunset-cassette',
    name: 'Sunset Cassette',
    tagline: 'warm tape hiss and rooftop drive energy',
    headerGradient: ['#FF6B6B', '#FF7A59', '#FF8C42', '#FFA552', '#FFC857', '#FFE66D', '#FFED8A', '#A0E8AF', '#4ECDC4', '#32C5FF', '#4D96FF', '#845EC2', '#D65DB1', '#FF6F91'],
    accent: '#FFD166',
    spinner: '#FF7A59',
    favorite: '#FF4D8D',
    text: '#FFF7EF',
    muted: '#C9A58B',
    light: { text: '#2A1810', muted: '#5E3D28', accent: '#9A7008' },
    bars: ['#3DDC97', '#57E3B1', '#8CE99A', '#C4F169', '#FFD166', '#FFB347', '#FF8C42', '#FF5E5B'],
    mirror: ['#1A5444', '#2A6B58', '#447A5C', '#6B7D59'],
    wave: ['#FFF0A8', '#FFD166', '#FF9F68', '#FF6B6B'],
    rain: [null, '#3A1E0E', '#6B2D14', '#B65A1C', '#FFD166'],
    flame: ['#FFF3B0', '#FFD166', '#FFB347', '#FF9F1C', '#FF7A59', '#FF5E5B', '#D1495B', '#8C2F39', '#5C1D26', '#2E1116'],
    modeColors: {
      bars: '#FFD166',
      tape: '#FF8C42',
      wave: '#FFB347',
      rain: '#4ECDC4',
      flame: '#FF5E5B'
    },
    tape: {
      frame: '#9C6B52',
      badgeLeft: '#FFE66D',
      badgeRight: '#FF7A59',
      label: '#FFF7EF',
      reelLeft: '#4ECDC4',
      reelRight: '#FFB347',
      bridgeBright: '#C98A4A',
      bridgeMid: '#A46A3C',
      bridgeDark: '#6F4528',
      progressDot: '#FF5E5B'
    }
  },
  {
    id: 'ice-glass',
    name: 'Ice Glass',
    tagline: 'clean chrome, cold air, blue plasma',
    headerGradient: ['#F8FBFF', '#DAF1FF', '#C1E8FF', '#A5DDFF', '#7FD1FF', '#5BC0FF', '#3AA8FF', '#2C91FF', '#3478F6', '#4A63E7', '#614ED8', '#7A3FD0', '#9B3BDA', '#C24AE6'],
    accent: '#8BE9FD',
    spinner: '#79AFFF',
    favorite: '#FF86C8',
    text: '#F7FBFF',
    muted: '#8BA7C7',
    light: { text: '#0E1E38', muted: '#2E4D6B', accent: '#006090' },
    bars: ['#E6F7FF', '#BFE8FF', '#8BD8FF', '#59C9FF', '#3AB5FF', '#4292FF', '#556DFF', '#7B61FF'],
    mirror: ['#10314A', '#184660', '#255B73', '#2F6F84'],
    wave: ['#F7FBFF', '#BFE8FF', '#7FD1FF', '#3478F6'],
    rain: [null, '#102437', '#153A57', '#1F5F84', '#8BE9FD'],
    flame: ['#F7FBFF', '#D8F3FF', '#A5DDFF', '#7FD1FF', '#5BC0FF', '#4292FF', '#3478F6', '#4A63E7', '#614ED8', '#392B72'],
    modeColors: {
      bars: '#8BE9FD',
      tape: '#5BC0FF',
      wave: '#F7FBFF',
      rain: '#7FD1FF',
      flame: '#556DFF'
    },
    tape: {
      frame: '#7F94AA',
      badgeLeft: '#BFE8FF',
      badgeRight: '#5BC0FF',
      label: '#F7FBFF',
      reelLeft: '#F7FBFF',
      reelRight: '#7FD1FF',
      bridgeBright: '#8FA8C7',
      bridgeMid: '#6F89A8',
      bridgeDark: '#4B6280',
      progressDot: '#8BE9FD'
    }
  },
  {
    id: 'ember-void',
    name: 'Ember Void',
    tagline: 'volcanic, molten, and a little dangerous',
    headerGradient: ['#FFF2D8', '#FFD8A8', '#FFB86B', '#FF9B42', '#FF7A32', '#FF5A2A', '#FF3D2E', '#F72545', '#D81E5B', '#A11D6F', '#6F1D77', '#4F1271', '#2E0F5C', '#120A2F'],
    accent: '#FFB703',
    spinner: '#FF5A2A',
    favorite: '#FF7B9C',
    text: '#FFF4EA',
    muted: '#B98A7A',
    light: { text: '#2E1508', muted: '#5E3220', accent: '#8A5A00' },
    bars: ['#FFF2D8', '#FFD166', '#FFB703', '#FB8500', '#FF7A32', '#FF5A2A', '#F72545', '#B5179E'],
    mirror: ['#3A140A', '#5A1E0D', '#7A2B12', '#8F3B19'],
    wave: ['#FFF2D8', '#FFD166', '#FB8500', '#F72545'],
    rain: [null, '#2A1207', '#5A1E0D', '#A53A18', '#FFB703'],
    flame: ['#FFF2D8', '#FFD166', '#FFB703', '#FB8500', '#FF7A32', '#FF5A2A', '#F72545', '#A11D6F', '#6F1D77', '#2E0F5C'],
    modeColors: {
      bars: '#FFB703',
      tape: '#FB8500',
      wave: '#FFD166',
      rain: '#FF7A32',
      flame: '#F72545'
    },
    tape: {
      frame: '#8E5A44',
      badgeLeft: '#FFD166',
      badgeRight: '#FF5A2A',
      label: '#FFF4EA',
      reelLeft: '#FFB703',
      reelRight: '#F72545',
      bridgeBright: '#B06A3C',
      bridgeMid: '#8B4B27',
      bridgeDark: '#5A2B18',
      progressDot: '#FFB703'
    }
  },
  {
    id: 'midnight-tokyo',
    name: 'Midnight Tokyo',
    tagline: 'neon signs through rain-soaked glass',
    headerGradient: ['#FF003C', '#FF0066', '#FF0099', '#FF00CC', '#DD00FF', '#AA00FF', '#7700FF', '#5500FF', '#2200FF', '#0044FF', '#0088FF', '#00BBFF', '#00EEFF', '#00FFDD'],
    accent: '#FF00CC',
    spinner: '#AA00FF',
    favorite: '#FF3399',
    text: '#F0E6FF',
    muted: '#8B7DA8',
    light: { text: '#1A0B2E', muted: '#3D2858', accent: '#990080' },
    bars: ['#00FFDD', '#00EEFF', '#0088FF', '#2200FF', '#5500FF', '#AA00FF', '#DD00FF', '#FF00CC'],
    mirror: ['#0A0520', '#150A35', '#20104A', '#2B1560'],
    wave: ['#FF00CC', '#AA00FF', '#5500FF', '#00EEFF'],
    rain: [null, '#0A0520', '#150A40', '#5500FF', '#AA00FF'],
    flame: ['#FF00CC', '#DD00FF', '#AA00FF', '#7700FF', '#5500FF', '#2200FF', '#0044FF', '#002299', '#001166', '#000833'],
    modeColors: {
      bars: '#AA00FF',
      tape: '#FF00CC',
      wave: '#00EEFF',
      rain: '#5500FF',
      flame: '#DD00FF'
    },
    tape: {
      frame: '#5A4A7A',
      badgeLeft: '#FF00CC',
      badgeRight: '#00EEFF',
      label: '#F0E6FF',
      reelLeft: '#00EEFF',
      reelRight: '#FF00CC',
      bridgeBright: '#8866BB',
      bridgeMid: '#664499',
      bridgeDark: '#442277',
      progressDot: '#FF00CC'
    }
  },
  {
    id: 'terminal-green',
    name: 'Terminal Green',
    tagline: 'phosphor glow on a CRT at 2am',
    headerGradient: ['#00FF41', '#00EE3C', '#00DD37', '#00CC32', '#00BB2D', '#00AA28', '#009923', '#00881E', '#007719', '#006614', '#007719', '#009923', '#00BB2D', '#00FF41'],
    accent: '#00FF41',
    spinner: '#00DD37',
    favorite: '#00FF88',
    text: '#CCFFCC',
    muted: '#4A8A4A',
    light: { text: '#003300', muted: '#184818', accent: '#006618' },
    bars: ['#003300', '#004D00', '#006600', '#008000', '#009900', '#00BB00', '#00DD00', '#00FF41'],
    mirror: ['#001A00', '#002200', '#002D00', '#003800'],
    wave: ['#00FF41', '#00BB2D', '#007719', '#003D0A'],
    rain: [null, '#001A00', '#003300', '#006600', '#00FF41'],
    flame: ['#00FF41', '#00DD37', '#00BB2D', '#009923', '#007719', '#005510', '#003D0A', '#002D07', '#001A04', '#000D02'],
    modeColors: {
      bars: '#00FF41',
      tape: '#00DD37',
      wave: '#00FF41',
      rain: '#00FF41',
      flame: '#00BB2D'
    },
    tape: {
      frame: '#336633',
      badgeLeft: '#00FF41',
      badgeRight: '#00DD37',
      label: '#CCFFCC',
      reelLeft: '#00FF41',
      reelRight: '#00BB2D',
      bridgeBright: '#558855',
      bridgeMid: '#336633',
      bridgeDark: '#224422',
      progressDot: '#00FF41'
    }
  }
];

const THEME_MAP = new Map(THEMES.map((theme) => [theme.id, theme]));

export function getTheme(themeId) {
  return THEME_MAP.get(themeId) || THEME_MAP.get(DEFAULT_THEME);
}

export function getThemeIds() {
  return THEMES.map((theme) => theme.id);
}

export function normalizeThemeId(themeId) {
  return THEME_MAP.has(themeId) ? themeId : DEFAULT_THEME;
}

export function cycleTheme(themeId, direction = 1) {
  const ids = getThemeIds();
  const currentIndex = Math.max(0, ids.indexOf(normalizeThemeId(themeId)));
  const nextIndex = (currentIndex + direction + ids.length) % ids.length;
  return ids[nextIndex];
}

let _detectedMode = null;

// Ask the terminal for its background color (OSC 11). Most terminals answer
// within a few ms; Terminal.app sets no COLORFGBG, so this is the reliable path.
export function queryTerminalBackground(timeoutMs = 250) {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY || !process.stdout.isTTY) return resolve(null);
    const wasRaw = process.stdin.isRaw;
    let buffer = '';
    const finish = (mode) => {
      clearTimeout(timer);
      process.stdin.off('data', onData);
      if (!wasRaw) process.stdin.setRawMode(false);
      process.stdin.pause();
      if (mode) _detectedMode = mode;
      resolve(mode);
    };
    const onData = (chunk) => {
      buffer += chunk.toString();
      const match = buffer.match(/rgb:([0-9a-f]+)\/([0-9a-f]+)\/([0-9a-f]+)/i);
      if (!match) return;
      const [r, g, b] = match.slice(1).map((hex) => parseInt(hex, 16) / (16 ** hex.length - 1));
      const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      finish(luminance > 0.5 ? 'light' : 'dark');
    };
    const timer = setTimeout(() => finish(null), timeoutMs);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', onData);
    process.stdout.write('\x1b]11;?\x07');
  });
}

export function detectColorMode() {
  if (_detectedMode) return _detectedMode;
  const colorfgbg = process.env.COLORFGBG;
  if (colorfgbg) {
    const parts = colorfgbg.split(';');
    const bg = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(bg)) {
      _detectedMode = bg > 6 ? 'light' : 'dark';
      return _detectedMode;
    }
  }
  _detectedMode = 'dark';
  return _detectedMode;
}
