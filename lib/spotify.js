import { execFile, spawnSync } from 'node:child_process';
import { promisify } from 'node:util';
import { EventEmitter } from 'node:events';

const exec = promisify(execFile);

// Spotify goes through spogo (https://github.com/steipete/spogo). Sonic is a
// remote control here: audio plays in a Spotify app (desktop, phone, or web
// player), and sonic searches, starts, and steers it.

export const SPOTIFY_SETUP = [
  'spotify needs spogo and a one-time login:',
  '  brew install steipete/tap/spogo',
  '  log in at https://open.spotify.com in chrome',
  '  spogo auth import --browser chrome',
  'keep a spotify app open (desktop, phone, or web player) so there is a device to play on.'
].join('\n');

export class SpotifySetupError extends Error {}

let spogoChecked = null;

export function hasSpogo() {
  if (spogoChecked === null) {
    const result = spawnSync('spogo', ['--version'], { encoding: 'utf8' });
    spogoChecked = !result.error && result.status === 0;
  }
  return spogoChecked;
}

async function spogo(args, { timeout = 15000 } = {}) {
  if (!hasSpogo()) throw new SpotifySetupError(SPOTIFY_SETUP);

  try {
    const { stdout } = await exec('spogo', [...args, '--no-input', '--no-color'], { timeout });
    return stdout;
  } catch (err) {
    throw toSpotifyError(err);
  }
}

async function spogoJson(args, options) {
  const stdout = await spogo([...args, '--json'], options);
  return stdout.trim() ? JSON.parse(stdout) : null;
}

function toSpotifyError(err) {
  const raw = String(err?.stderr || err?.message || 'spogo failed').trim();
  const line = raw.split('\n').map(l => l.trim()).filter(Boolean).pop() || raw;
  if (/cookie|unauthori[sz]ed|401|not logged|auth/i.test(raw)) {
    return new SpotifySetupError(`spotify is not connected (${line}).\n${SPOTIFY_SETUP}`);
  }
  if (/no active device|no device|device not found|404/i.test(raw)) {
    return new Error('no spotify device found. open spotify on this mac, your phone, or open.spotify.com, then try again.');
  }
  if (/premium/i.test(raw)) {
    return new Error('spotify says this needs premium. on macOS, open the spotify desktop app and sonic will drive it directly.');
  }
  return new Error(line.replace(/^error:\s*/i, ''));
}

function toTrack(item, kind) {
  if (!item?.id && !item?.url) return null;
  const type = item.type || kind;
  return {
    title: item.name || 'Untitled',
    url: item.url || `https://open.spotify.com/${type}/${item.id}`,
    duration: item.duration_ms ? item.duration_ms / 1000 : null,
    channel: type === 'playlist'
      ? (item.owner || 'playlist')
      : (item.artists || []).join(', '),
    id: item.id,
    kind: type,
    trackCount: item.total_items || item.total_tracks || null,
    source: 'spotify'
  };
}

// kind: 'track' for free search, 'playlist' for the long-session presets.
export async function searchSpotify(query, { limit = 5, kind = 'track' } = {}) {
  const data = await spogoJson(['search', kind, query, '--limit', String(limit)]);
  return (data?.items || []).map(item => toTrack(item, kind)).filter(Boolean);
}

const SPOTIFY_LINK = /^(?:https?:\/\/open\.spotify\.com\/(?:intl-[a-z-]+\/)?|spotify:)(track|album|playlist|artist|episode|show)[/:]([A-Za-z0-9]+)/i;

export function parseSpotifyLink(value) {
  const match = String(value || '').trim().match(SPOTIFY_LINK);
  if (!match) return null;
  const kind = match[1].toLowerCase();
  return {
    title: `spotify ${kind}`,
    url: `https://open.spotify.com/${kind}/${match[2]}`,
    id: match[2],
    kind,
    channel: '',
    duration: null,
    source: 'spotify'
  };
}

const POLL_MS = 1000;

export class SpotifyPlayer extends EventEmitter {
  constructor() {
    super();
    this.paused = false;
    this.playing = false;
    this.duration = 0;
    this.volume = null;
    this.device = null;
    this._progress = 0;
    this._syncedAt = 0;
    this._trackId = null;
    this._timer = null;
  }

  // Interpolate between polls so the progress bar moves every frame.
  get position() {
    if (!this.playing) return 0;
    const elapsed = this.paused ? 0 : (Date.now() - this._syncedAt) / 1000;
    const pos = this._progress + elapsed;
    return this.duration ? Math.min(pos, this.duration) : pos;
  }

  async play(track) {
    await spogo(['play', track.url], { timeout: 20000 });
    this.playing = true;
    this.paused = false;
    this._trackId = null;
    this._progress = 0;
    this._syncedAt = Date.now();
    await this._sync();
    this._startPolling();
  }

  async togglePause() {
    const pausing = !this.paused;
    this._setPaused(pausing);
    try {
      await spogo(pausing ? ['pause'] : ['play']);
    } catch (err) {
      this._setPaused(!pausing);
      throw err;
    }
  }

  async seekRelative(seconds) {
    const target = Math.max(0, this.position + seconds);
    this._progress = target;
    this._syncedAt = Date.now();
    await spogo(['seek', String(Math.round(target * 1000))]);
  }

  async setVolume(volume) {
    this.volume = Math.max(0, Math.min(100, Math.round(volume)));
    await spogo(['volume', String(this.volume)]);
  }

  async next() {
    await spogo(['next']);
    await this._sync();
  }

  async previous() {
    await spogo(['prev']);
    await this._sync();
  }

  async stop() {
    this._stopPolling();
    if (this.playing && !this.paused) {
      try { await spogo(['pause'], { timeout: 5000 }); } catch {}
    }
    this.playing = false;
    this.paused = false;
    this.duration = 0;
    this._trackId = null;
  }

  _setPaused(paused) {
    if (paused === this.paused) return;
    this._progress = this.position;
    this._syncedAt = Date.now();
    this.paused = paused;
    this.emit('pause', paused);
  }

  _startPolling() {
    this._stopPolling();
    this._timer = setInterval(() => { void this._sync(); }, POLL_MS);
  }

  _stopPolling() {
    if (this._timer) clearInterval(this._timer);
    this._timer = null;
  }

  async _sync() {
    let status;
    try {
      status = await spogoJson(['status'], { timeout: 5000 });
    } catch {
      return; // a missed poll is fine; the next one catches up
    }
    if (!status || !this.playing) return;

    this._progress = (status.progress_ms || 0) / 1000;
    this._syncedAt = Date.now();
    this._setPaused(!status.is_playing);
    if (typeof status.device?.volume_percent === 'number') this.volume = status.device.volume_percent;
    this.device = status.device?.name || null;

    const item = status.item;
    if (item) {
      this.duration = item.duration_ms ? item.duration_ms / 1000 : 0;
      if (item.id !== this._trackId) {
        this._trackId = item.id;
        this.emit('track', toTrack(item, 'track'));
      }
    }
  }
}
