import { spawn } from 'node:child_process';
import { createConnection } from 'node:net';
import { unlinkSync, existsSync } from 'node:fs';
import { EventEmitter } from 'node:events';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export class Player extends EventEmitter {
  constructor() {
    super();
    this.proc = null;
    this.socket = null;
    this.reqId = 0;
    this.pending = new Map();
    this.observers = new Map();
    this.position = 0;
    this.duration = 0;
    this.paused = false;
    this.playing = false;
    this.volume = 100;
    this._buffer = '';
    this.socketPath = join(tmpdir(), `sonic-mpv-${process.pid}.sock`);
    this._stopping = false;
    this._endedEmitted = false;
  }

  async play(url) {
    await this.stop();
    this._stopping = false;
    this._endedEmitted = false;

    this._cleanupSocketFile();

    this.proc = spawn('mpv', [
      '--no-video',
      '--really-quiet',
      '--no-terminal',
      `--input-ipc-server=${this.socketPath}`,
      '--ytdl-format=bestaudio',
      '--media-controls=yes',
      url
    ], { stdio: 'ignore', detached: false });

    this.proc.on('exit', () => {
      this.playing = false;
      this.proc = null;
      this._cleanupSocketFile();
      if (!this._stopping && !this._endedEmitted) {
        this._endedEmitted = true;
        this.emit('ended');
      }
    });

    this.proc.on('error', (err) => {
      this.emit('error', err);
    });

    await this._waitForSocket();
    await this._connect();

    this.playing = true;
    this.paused = false;
    this.position = 0;
    this.duration = 0;

    if (this.volume !== 100) {
      await this._command(['set_property', 'volume', this.volume]);
    }

    await this._observe('playback-time', (v) => { this.position = v || 0; });
    await this._observe('duration', (v) => { this.duration = v || 0; });
    await this._observe('pause', (v) => {
      const wasPaused = this.paused;
      this.paused = !!v;
      if (this.paused !== wasPaused) this.emit('pause', this.paused);
    });
  }

  async togglePause() {
    if (!this.socket) return;
    await this._command(['cycle', 'pause']);
  }

  async seekRelative(seconds) {
    if (!this.socket) return;
    await this._command(['seek', seconds, 'relative']);
  }

  async setVolume(vol) {
    if (!this.socket) return;
    this.volume = Math.max(0, Math.min(150, vol));
    await this._command(['set_property', 'volume', this.volume]);
  }

  async stop() {
    this._stopping = true;
    if (this.socket) {
      try { this.socket.destroy(); } catch {}
      this.socket = null;
    }
    if (this.proc) {
      const proc = this.proc;
      this.proc = null;
      try { proc.kill('SIGTERM'); } catch {}
      // Give mpv a moment to exit, then force kill
      setTimeout(() => {
        try { proc.kill('SIGKILL'); } catch {}
      }, 500);
    }
    this.playing = false;
    this.paused = false;
    this.position = 0;
    this.duration = 0;
    this.pending.clear();
    this.observers.clear();
    this._buffer = '';
    this._cleanupSocketFile();
  }

  _waitForSocket() {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const check = () => {
        if (existsSync(this.socketPath)) return resolve();
        if (++attempts > 50) return reject(new Error('mpv socket timeout'));
        setTimeout(check, 100);
      };
      check();
    });
  }

  _connect() {
    return new Promise((resolve, reject) => {
      this.socket = createConnection(this.socketPath);

      this.socket.on('connect', () => resolve());
      this.socket.on('error', (err) => reject(err));

      this.socket.on('data', (data) => {
        this._buffer += data.toString();
        const lines = this._buffer.split('\n');
        this._buffer = lines.pop();

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const msg = JSON.parse(line);
            if (msg.request_id !== undefined && this.pending.has(msg.request_id)) {
              const { resolve } = this.pending.get(msg.request_id);
              this.pending.delete(msg.request_id);
              resolve(msg);
            }
            if (msg.event === 'property-change' && this.observers.has(msg.id)) {
              this.observers.get(msg.id)(msg.data);
            }
            if (msg.event === 'end-file' && !this._endedEmitted) {
              this._endedEmitted = true;
              this.emit('ended');
            }
          } catch {}
        }
      });

      this.socket.on('close', () => {
        this.socket = null;
      });
    });
  }

  _command(args) {
    return new Promise((resolve, reject) => {
      if (!this.socket) return reject(new Error('not connected'));
      const id = ++this.reqId;
      const msg = JSON.stringify({ command: args, request_id: id }) + '\n';
      this.pending.set(id, { resolve, reject });
      this.socket.write(msg);
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          resolve(null);
        }
      }, 5000);
    });
  }

  async _observe(prop, callback) {
    const id = ++this.reqId;
    this.observers.set(id, callback);
    const msg = JSON.stringify({ command: ['observe_property', id, prop], request_id: id }) + '\n';
    if (this.socket) this.socket.write(msg);
  }

  _cleanupSocketFile() {
    if (existsSync(this.socketPath)) {
      try { unlinkSync(this.socketPath); } catch {}
    }
  }
}
