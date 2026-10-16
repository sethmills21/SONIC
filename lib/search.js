import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);

export const SOURCES = ['youtube', 'soundcloud', 'mixcloud'];

const SOURCE_HOSTS = [
  { source: 'youtube', pattern: /^(www\.|m\.|music\.)?(youtube\.com|youtube-nocookie\.com|youtu\.be)$/ },
  { source: 'soundcloud', pattern: /^(www\.|m\.)?soundcloud\.com$/ },
  { source: 'mixcloud', pattern: /^(www\.|m\.)?mixcloud\.com$/ }
];

// Returns { url, source } for a playable link, or null for anything else
// (including plain search text, which is the common case).
export function parseSourceUrl(value) {
  const trimmed = String(value || '').trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return null;
  }

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  const host = parsed.hostname.toLowerCase();
  for (const entry of SOURCE_HOSTS) {
    if (entry.pattern.test(host)) {
      return { url: parsed, source: entry.source };
    }
  }

  return null;
}

function isPlaylistUrl(url, source) {
  if (source === 'youtube') {
    if (url.searchParams.has('list')) return true;
    return url.pathname.startsWith('/playlist');
  }
  if (source === 'soundcloud') {
    return url.pathname.includes('/sets/');
  }
  if (source === 'mixcloud') {
    return url.pathname.includes('/playlists/');
  }
  return false;
}

// A YouTube watch URL carrying a dead or private `list` can still play the
// single video it points at, so keep that fallback available.
function hasSingleTrackFallback(url, source) {
  if (source !== 'youtube') return false;
  if (url.searchParams.has('v')) return true;
  return url.hostname.toLowerCase().endsWith('youtu.be') && url.pathname.length > 1;
}

export async function resolveUrl(value, { limit = 100 } = {}) {
  const link = parseSourceUrl(value);
  if (!link) {
    throw new Error('unsupported link — sonic plays youtube, soundcloud, and mixcloud urls');
  }

  const { url, source } = link;
  const target = url.toString();

  if (isPlaylistUrl(url, source)) {
    try {
      const tracks = await dumpUrl(target, { source, playlist: true, limit });
      if (tracks.length > 1) {
        return { tracks, source, kind: 'playlist', note: null };
      }
      if (tracks.length === 1) {
        // yt-dlp silently degrades a dead or private list to the linked video.
        return { tracks, source, kind: 'track', note: null };
      }
    } catch (err) {
      if (!hasSingleTrackFallback(url, source)) throw err;
    }

    if (!hasSingleTrackFallback(url, source)) {
      throw new Error('that link resolved to no playable tracks');
    }

    const tracks = await dumpUrl(target, { source, playlist: false, limit: 1 });
    return {
      tracks,
      source,
      kind: 'track',
      note: 'playlist unavailable — playing the linked track only'
    };
  }

  const tracks = await dumpUrl(target, { source, playlist: false, limit: 1 });
  if (tracks.length === 0) {
    throw new Error('that link resolved to no playable tracks');
  }

  return { tracks, source, kind: 'track', note: null };
}

async function dumpUrl(target, { source, playlist, limit }) {
  const args = ['--flat-playlist', '--dump-json', '--no-warnings'];

  if (playlist) {
    args.push('--yes-playlist', '--playlist-end', String(limit));
  } else {
    args.push('--no-playlist');
  }

  args.push('--', target);

  let stdout;
  try {
    ({ stdout } = await exec('yt-dlp', args, {
      timeout: 60000,
      maxBuffer: 32 * 1024 * 1024
    }));
  } catch (err) {
    throw new Error(cleanYtDlpError(err));
  }

  return stdout
    .trim()
    .split('\n')
    .filter(Boolean)
    .map(line => toTrack(JSON.parse(line), source))
    .filter(Boolean);
}

// yt-dlp writes multi-line diagnostics; keep the one line worth showing.
function cleanYtDlpError(err) {
  const stderr = String(err?.stderr || '').trim();
  const firstError = stderr
    .split('\n')
    .map(line => line.trim())
    .find(line => line.startsWith('ERROR:'));

  if (firstError) {
    return firstError.replace(/^ERROR:\s*/, '').replace(/^\[[^\]]+\]\s*/, '');
  }

  return err?.message || 'yt-dlp failed';
}

function toTrack(data, source) {
  const url = data.webpage_url
    || data.url
    || (source === 'youtube' && data.id ? `https://youtube.com/watch?v=${data.id}` : null);

  if (!url) return null;

  return {
    title: data.title || 'Untitled',
    url,
    duration: data.duration,
    channel: data.channel || data.uploader || '',
    id: data.id,
    source
  };
}

export async function search(query, { source = 'youtube', limit = 5 } = {}) {
  if (source === 'mixcloud') {
    return searchMixcloud(query, limit);
  }
  return searchYtDlp(query, { source, limit });
}

async function searchYtDlp(query, { source, limit }) {
  const prefix = source === 'soundcloud' ? 'scsearch' : 'ytsearch';

  const { stdout } = await exec('yt-dlp', [
    '--flat-playlist',
    '--dump-json',
    '--no-warnings',
    `${prefix}${limit}:${query}`
  ], { timeout: 30000 });

  return stdout
    .trim()
    .split('\n')
    .filter(Boolean)
    .map(line => {
      const data = JSON.parse(line);
      const url = data.url
        || data.webpage_url
        || (source === 'youtube' && data.id ? `https://youtube.com/watch?v=${data.id}` : null);

      if (!url) return null;

      return {
        title: data.title,
        url,
        duration: data.duration,
        channel: data.channel || data.uploader || '',
        id: data.id,
        source
      };
    })
    .filter(Boolean);
}

async function searchMixcloud(query, limit) {
  const url = new URL('https://api.mixcloud.com/search/');
  url.searchParams.set('q', query);
  url.searchParams.set('type', 'cloudcast');
  url.searchParams.set('limit', String(limit));

  const res = await fetch(url.toString(), {
    signal: AbortSignal.timeout(15000)
  });

  if (!res.ok) {
    throw new Error(`mixcloud search failed (${res.status})`);
  }

  const json = await res.json();
  return (json.data || []).map(item => ({
    title: item.name || 'Untitled',
    url: item.url,
    duration: item.audio_length || null,
    channel: item.user?.name || '',
    id: item.key || null,
    source: 'mixcloud'
  })).filter(item => item.url);
}

export function formatDuration(seconds) {
  if (!seconds) return '??:??';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}
