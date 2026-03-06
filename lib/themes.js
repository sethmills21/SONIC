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
