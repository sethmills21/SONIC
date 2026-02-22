// ─── Channel Definitions ─────────────────────────────────────────────────────
// Each channel has a name, icon, description, and a search query optimized
// for finding long (1-2+ hour) mixes on YouTube.

export const CHANNELS = [
  {
    key: '1',
    name: 'deep house',
    icon: '\u{1F3E0}',
    desc: 'long focus sessions',
    query: 'deep house focus mix instrumental 2 hours',
  },
  {
    key: '2',
    name: 'lofi',
    icon: '\u{1F3B9}',
    desc: 'chill study beats',
    query: 'lofi hip hop beats study mix 2 hours',
  },
  {
    key: '3',
    name: 'ambient',
    icon: '\u{1F30A}',
    desc: 'background, barely there',
    query: 'ambient electronic focus music 2 hours',
  },
  {
    key: '4',
    name: 'liquid dnb',
    icon: '\u{1F941}',
    desc: 'smooth energy',
    query: 'liquid drum and bass mix 2 hours',
  },
  {
    key: '5',
    name: 'cinema',
    icon: '\u{1F3AC}',
    desc: 'film scores, epic',
    query: 'hans zimmer epic focus mix 2 hours',
  },
  {
    key: '6',
    name: 'classical',
    icon: '\u{1F3BB}',
    desc: 'piano + orchestral',
    query: 'classical piano focus study playlist 2 hours',
  },
  {
    key: '7',
    name: 'amapiano',
    icon: '\u{1FA98}',
    desc: 'rhythmic, groovy',
    query: 'amapiano instrumental mix 2 hours',
  },
  {
    key: '8',
    name: 'synthwave',
    icon: '\u{1F303}',
    desc: 'late night retro',
    query: 'synthwave retrowave coding mix 2 hours',
  },
  {
    key: '9',
    name: 'jazz',
    icon: '\u{1F3B7}',
    desc: 'jazz hop, soul',
    query: 'jazz hop instrumental beats mix 2 hours',
  },
  {
    key: '0',
    name: 'chillstep',
    icon: '\u{1F30C}',
    desc: 'dark, atmospheric',
    query: 'chillstep mix programming focus 2 hours',
  },
];

// ─── Time-aware suggestion ───────────────────────────────────────────────────
// Returns the index of the suggested channel based on hour of day.

export function getSuggestedChannel() {
  const hour = new Date().getHours();

  if (hour >= 6 && hour < 9) return 2;    // ambient — waking up
  if (hour >= 9 && hour < 12) return 1;   // lofi — morning flow
  if (hour >= 12 && hour < 15) return 0;  // deep house — peak focus
  if (hour >= 15 && hour < 18) return 3;  // liquid dnb — afternoon push
  if (hour >= 18 && hour < 22) return 7;  // synthwave — night coding
  if (hour >= 22 || hour < 2) return 9;   // chillstep — late night
  return 2;                                // ambient — very late / early
}

// ─── Resolve channel from CLI arg ────────────────────────────────────────────
// e.g. "sonic work" → deep house, "sonic jazz" → jazz channel

export function resolveChannel(name) {
  if (!name) return null;
  const lower = name.toLowerCase();

  // Direct aliases
  const aliases = {
    'work': 0,
    'focus': 0,
    'study': 1,
    'chill': 1,
    'rain': 2,
    'dnb': 3,
    'bass': 3,
    'epic': 4,
    'movie': 4,
    'piano': 5,
    'retro': 7,
    'neon': 7,
    'soul': 8,
  };

  if (aliases[lower] !== undefined) return CHANNELS[aliases[lower]];

  // Match by channel name
  const match = CHANNELS.find(c => c.name.includes(lower));
  return match || null;
}
