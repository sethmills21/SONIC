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
    name: 'dubstep',
    icon: '\u{1F525}',
    desc: 'heavy, hard, filthy',
    query: 'heavy dubstep mix filthy drops 1 hour',
  },
  {
    key: '6',
    name: 'cinema',
    icon: '\u{1F3AC}',
    desc: 'film scores, epic',
    query: 'hans zimmer epic focus mix 2 hours',
  },
  {
    key: '7',
    name: 'classical',
    icon: '\u{1F3BB}',
    desc: 'piano + orchestral',
    query: 'classical piano focus study playlist 2 hours',
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
    name: 'amapiano',
    icon: '\u{1FA98}',
    desc: 'rhythmic, groovy',
    query: 'amapiano instrumental mix 2 hours',
  },
];

// ─── Activity Definitions ────────────────────────────────────────────────────
// Maps what you're DOING to a curated set of queries.
// Each activity picks randomly from its queries for variety.

export const ACTIVITIES = [
  {
    key: '1',
    name: 'coding',
    icon: '\u{1F4BB}',
    desc: 'deep focus, no lyrics',
    queries: [
      'deep house focus mix instrumental 2 hours',
      'chillstep mix programming focus 2 hours',
      'ambient electronic coding music 2 hours',
      'liquid drum and bass focus mix 2 hours',
    ],
  },
  {
    key: '2',
    name: 'writing',
    icon: '\u{270F}\u{FE0F}',
    desc: 'calm, minimal, flowing',
    queries: [
      'ambient piano writing music 2 hours',
      'lofi jazz writing focus 2 hours',
      'classical music for writing concentration 2 hours',
      'minimal ambient writing soundtrack 2 hours',
    ],
  },
  {
    key: '3',
    name: 'reading',
    icon: '\u{1F4DA}',
    desc: 'quiet, atmospheric',
    queries: [
      'ambient reading music 2 hours calm',
      'soft classical music for reading 2 hours',
      'rain sounds lofi reading mix 2 hours',
      'quiet jazz for reading 2 hours',
    ],
  },
  {
    key: '4',
    name: 'working out',
    icon: '\u{1F525}',
    desc: 'high energy, heavy',
    queries: [
      'heavy dubstep mix filthy drops 1 hour',
      'hard dubstep workout mix',
      'drum and bass gym mix high energy 1 hour',
      'techno workout mix hard',
    ],
  },
  {
    key: '5',
    name: 'chilling',
    icon: '\u{1F319}',
    desc: 'vibe, no pressure',
    queries: [
      'chillstep relaxing mix 2 hours',
      'lofi hip hop beats chill 2 hours',
      'deep house chill sunset mix 2 hours',
      'ambient chill electronic 2 hours',
    ],
  },
  {
    key: '6',
    name: 'cooking',
    icon: '\u{1F373}',
    desc: 'groovy, upbeat, fun',
    queries: [
      'amapiano mix upbeat groovy',
      'disco house mix feel good 1 hour',
      'funk soul groovy cooking mix 2 hours',
      'afrobeats mix upbeat vibes',
    ],
  },
  {
    key: '7',
    name: 'creating',
    icon: '\u{1F3A8}',
    desc: 'inspiring, cinematic',
    queries: [
      'hans zimmer epic inspiring mix 2 hours',
      'synthwave retrowave creative mix 2 hours',
      'cinematic orchestral inspiring music 2 hours',
      'post rock instrumental creative mix 1 hour',
    ],
  },
  {
    key: '8',
    name: 'cleaning',
    icon: '\u{1F9F9}',
    desc: 'upbeat, keep moving',
    queries: [
      'upbeat house cleaning mix 1 hour',
      'pop dance mix energy',
      'disco funk cleaning playlist 1 hour',
      'afrobeats dance mix',
    ],
  },
];

// ─── Time-aware suggestion ───────────────────────────────────────────────────

export function getSuggestedChannel() {
  const hour = new Date().getHours();

  if (hour >= 6 && hour < 9) return 2;    // ambient — waking up
  if (hour >= 9 && hour < 12) return 1;   // lofi — morning flow
  if (hour >= 12 && hour < 15) return 0;  // deep house — peak focus
  if (hour >= 15 && hour < 18) return 3;  // liquid dnb — afternoon push
  if (hour >= 18 && hour < 22) return 7;  // synthwave — night coding
  if (hour >= 22 || hour < 2) return 3;   // winding down (activity) / liquid dnb
  return 2;                                // ambient — very late / early
}

export function getSuggestedActivity() {
  const hour = new Date().getHours();

  if (hour >= 6 && hour < 9) return 2;    // reading — quiet morning
  if (hour >= 9 && hour < 18) return 0;   // coding — work hours
  if (hour >= 18 && hour < 21) return 6;  // creating — evening
  if (hour >= 21 || hour < 6) return 4;   // chilling — night
  return 0;
}

// Pick a random query from an activity's list
export function pickActivityQuery(activity) {
  const idx = Math.floor(Math.random() * activity.queries.length);
  return activity.queries[idx];
}

// ─── Resolve channel from CLI arg ────────────────────────────────────────────

export function resolveChannel(name) {
  if (!name) return null;
  const lower = name.toLowerCase();

  const aliases = {
    'work': 0,
    'focus': 0,
    'study': 1,
    'chill': 2,
    'rain': 2,
    'dnb': 3,
    'bass': 4,
    'heavy': 4,
    'epic': 5,
    'movie': 5,
    'piano': 6,
    'retro': 7,
    'neon': 7,
    'soul': 8,
  };

  if (aliases[lower] !== undefined) return CHANNELS[aliases[lower]];

  const match = CHANNELS.find(c => c.name.includes(lower));
  return match || null;
}
