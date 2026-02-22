import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);

export async function search(query, { source = 'youtube', limit = 5 } = {}) {
  const prefix = source === 'soundcloud' ? 'scsearch' : 'ytsearch';

  const { stdout } = await exec('yt-dlp', [
    '--flat-playlist',
    '--dump-json',
    '--no-warnings',
    `${prefix}${limit}:${query}`
  ], { timeout: 30000 });

  return stdout.trim().split('\n').map(line => {
    const data = JSON.parse(line);
    return {
      title: data.title,
      url: data.url || data.webpage_url || `https://youtube.com/watch?v=${data.id}`,
      duration: data.duration,
      channel: data.channel || data.uploader || '',
      id: data.id,
      source
    };
  });
}

export function formatDuration(seconds) {
  if (!seconds) return '??:??';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}
