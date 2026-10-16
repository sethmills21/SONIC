import { spawn, spawnSync } from 'node:child_process';

const REQUIRED_DEPENDENCIES = [
  {
    name: 'yt-dlp',
    purpose: 'search YouTube and resolve playable media URLs'
  },
  {
    name: 'mpv',
    purpose: 'play audio in the terminal'
  }
];

function trimFirstLine(text) {
  if (!text) return null;
  return text.trim().split('\n')[0] || null;
}

function inspectBinary(binary) {
  const versionResult = spawnSync(binary, ['--version'], { encoding: 'utf8' });
  const pathResult = spawnSync('which', [binary], { encoding: 'utf8' });

  return {
    name: binary,
    found: !versionResult.error && versionResult.status === 0,
    version: !versionResult.error && versionResult.status === 0
      ? trimFirstLine(versionResult.stdout || versionResult.stderr)
      : null,
    path: !pathResult.error && pathResult.status === 0
      ? trimFirstLine(pathResult.stdout)
      : null
  };
}

export function getDependencyStatus() {
  return REQUIRED_DEPENDENCIES.map((dependency) => ({
    ...dependency,
    ...inspectBinary(dependency.name)
  }));
}

export function getMissingDependencies() {
  return getDependencyStatus().filter(({ found }) => !found);
}

export function formatDependencyHelp(missingDependencies) {
  const lines = [
    'Missing required dependencies:',
    ...missingDependencies.map(({ name, purpose }) => `  - ${name}: ${purpose}`),
    '',
    'Install on macOS:',
    '  brew install yt-dlp mpv',
    '',
    'Then re-run `npm start` or `sonic`.'
  ];

  return lines.join('\n');
}

export function buildDoctorReport({ version, store, storePaths }) {
  const dependencyStatus = getDependencyStatus();
  const lines = [
    `Sonic doctor v${version}`,
    '',
    `Platform: ${process.platform} ${process.arch}`,
    `Node: ${process.version}`,
    '',
    'Dependencies:'
  ];

  for (const dependency of dependencyStatus) {
    const marker = dependency.found ? 'OK' : 'MISSING';
    const versionLabel = dependency.version ? ` (${dependency.version})` : '';
    const pathLabel = dependency.path ? ` -> ${dependency.path}` : '';
    lines.push(`  - ${dependency.name}: ${marker}${versionLabel}${pathLabel}`);
  }

  lines.push('');
  lines.push('Spotify (optional):');
  const spogo = inspectBinary('spogo');
  if (!spogo.found) {
    lines.push('  - spogo: not installed (brew install steipete/tap/spogo)');
  } else {
    lines.push(`  - spogo: OK (${spogo.version})`);
    const auth = spawnSync('spogo', ['auth', 'status', '--no-input', '--no-color'], { encoding: 'utf8', timeout: 10000 });
    const authLine = trimFirstLine(auth.stdout || auth.stderr) || 'unknown';
    const connected = auth.status === 0 && !/no cookies|missing|not found/i.test(authLine);
    lines.push(connected
      ? `  - login: ${authLine}`
      : '  - login: not connected. log in at open.spotify.com in chrome, then run: spogo auth import --browser chrome');
  }

  lines.push('');
  lines.push('Config:');
  lines.push(`  - app dir: ${storePaths.appDir}`);
  lines.push(`  - store file: ${storePaths.storePath}`);
  lines.push(`  - default source: ${store.config.defaultSource}`);
  lines.push(`  - theme: ${store.config.theme}`);
  lines.push(`  - color mode: ${store.config.colorMode}`);
  lines.push(`  - visualizer: ${store.config.vizMode}`);
  lines.push(`  - volume: ${store.config.volume}`);
  lines.push(`  - search limit: ${store.config.searchLimit}`);
  lines.push(`  - favorites: ${store.favorites.length}`);
  lines.push(`  - recents: ${store.recents.length}`);

  lines.push('');
  lines.push('Tip:');
  lines.push('  - Edit the store file directly if you want to tweak defaults before a full settings UI exists.');

  return lines.join('\n');
}

export function printHelp(version) {
  console.log(`sonic v${version}

Usage:
  sonic
  sonic <query>
  sonic "<url>"
  sonic --soundcloud <query>
  sonic --mixcloud <query>
  sonic --spotify <query>
  sonic doctor

Flags:
  -h, --help         Show help
  -v, --version      Show version
  --doctor           Run setup diagnostics
  --sc, --soundcloud Use SoundCloud search
  --mc, --mixcloud   Use Mixcloud search
  --sp, --spotify    Use Spotify search (needs spogo)

Links:
  Paste a YouTube, SoundCloud, Mixcloud, or Spotify URL to play it directly.
  Quote the URL so the shell does not split it on & characters.
  A playlist link loads the whole playlist; a watch link with a dead
  list= falls back to the single linked track.

Requirements:
  - Node.js 22+
  - yt-dlp
  - mpv

Spotify (optional):
  - brew install steipete/tap/spogo
  - log in at open.spotify.com in Chrome, then: spogo auth import --browser chrome
  - keep a Spotify app open (desktop, phone, or web player); audio plays there
  - vibes and sessions open Spotify playlists; search finds tracks

Picker Controls:
  - Arrow keys / j k: move
  - Tab / h l: switch tabs
  - 1-0: quick pick a vibe
  - /: search
  - f: favorites
  - r: recents
  - m: toggle source
  - t / T: next / previous theme
  - d: toggle dark / light mode
  - q: quit

Playback Controls:
  - Enter: play selection
  - Space: pause / resume
  - n / p: next / previous (Spotify: skips in Spotify)
  - f: favorite / unfavorite current track
  - t / T: next / previous theme
  - d: toggle dark / light mode
  - [ / ]: seek 10s
  - - / +: volume
  - v: switch visualizer
  - o: open current track in browser
  - b: back to picker
  - q: quit
`);
}

export async function openExternal(rawUrl) {
  let url;

  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('invalid track URL');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error(`unsupported URL protocol: ${url.protocol}`);
  }

  const normalizedUrl = url.toString();
  const platformCommand = process.platform === 'darwin'
    ? { command: 'open', args: [normalizedUrl] }
    : process.platform === 'linux'
      ? { command: 'xdg-open', args: [normalizedUrl] }
      : null;

  if (!platformCommand) {
    throw new Error(`opening links is not supported on ${process.platform}`);
  }

  await new Promise((resolve, reject) => {
    const child = spawn(platformCommand.command, platformCommand.args, {
      stdio: 'ignore',
      detached: true
    });

    child.once('error', reject);
    child.once('spawn', () => {
      child.unref();
      resolve();
    });
  });
}
