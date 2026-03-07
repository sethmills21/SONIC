import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);

export const SOURCES = ['youtube', 'soundcloud', 'mixcloud'];

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
