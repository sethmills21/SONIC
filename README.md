# Sonic

<p align="center">
  <a href="https://github.com/sethmills21/sonic/releases/latest"><img src="https://img.shields.io/github/v/release/sethmills21/sonic?style=for-the-badge&color=blue" alt="Release"></a>
  <a href="https://github.com/sethmills21/sonic/stargazers"><img src="https://img.shields.io/github/stars/sethmills21/sonic?style=for-the-badge" alt="Stars"></a>
  <img src="https://img.shields.io/badge/node-%3E%3D20-green?style=for-the-badge&logo=node.js" alt="Node">
  <img src="https://img.shields.io/badge/license-MIT-yellow?style=for-the-badge" alt="License">
  <img src="https://img.shields.io/badge/sources-3-purple?style=for-the-badge" alt="Sources">
</p>

<p align="center">
  <img src="./assets/demo.gif" alt="Sonic — terminal music player" width="800">
</p>

A terminal music player with a theatrical TUI, fast keyboard controls, and persistent local state.
Search YouTube, SoundCloud, and Mixcloud from your terminal. Zero browser tabs. One dependency.

## Table of Contents

- [Quick Start](#quick-start)
- [Commands](#commands)
- [Controls](#controls)
- [Sources](#sources)
- [Themes](#themes)
- [Visualizers](#visualizers)
- [Local State](#local-state)
- [Project Layout](#project-layout)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

## Quick Start

### Install

```bash
# macOS
brew install yt-dlp mpv
git clone https://github.com/sethmills21/sonic.git
cd sonic && npm install

# Linux (Debian/Ubuntu)
sudo apt install yt-dlp mpv
git clone https://github.com/sethmills21/sonic.git
cd sonic && npm install
```

### Verify

```bash
npm run doctor
```

### First command

```bash
npm start                        # open the picker
npm start -- "lofi"              # search and play immediately
```

Once published to npm:

```bash
npx sonic-cli "lofi"
# or
npm install -g sonic-cli && sonic "lofi"
```

## Commands

```bash
sonic                            # open the picker
sonic "deep house"               # search YouTube
sonic --soundcloud "liquid dnb"  # search SoundCloud
sonic --mixcloud "techno mix"    # search Mixcloud
sonic doctor                     # check setup
sonic --help                     # full help
```

## Controls

### Picker

| Key | Action |
| --- | --- |
| `Arrow keys` / `j` `k` | Move through lists |
| `Tab` / `Left` / `Right` | Switch picker tabs |
| `Enter` | Play selected |
| `/` | Search |
| `f` | Open favorites |
| `r` | Open recents |
| `m` | Cycle source (YouTube / SoundCloud / Mixcloud) |
| `t` / `T` | Next / previous theme |
| `d` | Toggle dark / light mode |
| `q` | Quit |

### Playback

| Key | Action |
| --- | --- |
| `Space` | Pause / resume |
| `n` / `p` | Next / previous track in queue |
| `f` | Favorite / unfavorite current track |
| `[` / `]` | Seek backward / forward 10 seconds |
| `-` / `+` | Volume down / up |
| `v` | Cycle visualizer mode |
| `t` / `T` | Next / previous theme |
| `d` | Toggle dark / light mode |
| `o` | Open current track in browser |
| `/` | Search (stops playback) |
| `b` | Back to picker |
| `q` | Quit |

macOS media keys (play/pause, next) work via Control Center.

## Sources

| Source | Search | Playback | Auth |
| --- | --- | --- | --- |
| YouTube | `yt-dlp` search | `mpv` via `yt-dlp` | None |
| SoundCloud | `yt-dlp` search | `mpv` via `yt-dlp` | None |
| Mixcloud | Mixcloud public API | `mpv` via `yt-dlp` | None |

Press `m` to cycle between sources. Use `--soundcloud` or `--mixcloud` flags to start in a specific source.

## Themes

Six built-in themes, each with dark and light mode variants:

| Theme | Vibe |
| --- | --- |
| **Neon Night** | Rainbow night-session glow |
| **Sunset Cassette** | Warm retro tape-deck energy |
| **Ice Glass** | Cold chrome and plasma blues |
| **Ember Void** | Molten orange, red, and magenta |
| **Midnight Tokyo** | Cyberpunk neon through rain-soaked glass |
| **Terminal Green** | Phosphor glow on a CRT at 2am |

Press `t` / `T` to cycle themes, `d` to toggle dark/light mode. Both persist across runs.

## Visualizers

Five modes, all driven by simulated audio energy:

| Mode | Style |
| --- | --- |
| **Bars** | Spectrum analyzer with mirror reflection |
| **Tape** | Cassette deck with spinning reels and progress |
| **Wave** | Oscilloscope waveform |
| **Rain** | Matrix-style falling characters |
| **Flame** | Fire simulation |

Press `v` during playback to cycle through modes.

## Local State

Sonic stores data at `~/.config/sonic/store.json`:

- Default source, theme, color mode, visualizer, volume
- Search result limit
- Favorites (up to 100)
- Recents (up to 25)

## Project Layout

```text
bin/sonic.js      CLI entrypoint and keyboard state machine
lib/search.js     YouTube/SoundCloud (yt-dlp) and Mixcloud search adapters
lib/player.js     mpv process and IPC socket controller
lib/channels.js   curated vibe and activity presets
lib/ui.js         terminal rendering, layout, and visualizers
lib/system.js     dependency checks, help output, safe URL opening
lib/store.js      persistent local config, favorites, and recents
lib/themes.js     theme registry, palettes, and color mode detection
```

## Roadmap

### Near term

- Richer in-app config editing
- Playlist save and load flows
- CI with real smoke coverage
- Queue UX with reordering

### Medium term

- Saved stations and richer search filters
- Album-art-aware terminal layouts
- Linux polish and Windows support decision
- npm publish and release automation
- Session-aware workflows

## Requirements

- **Node.js** 20+
- **yt-dlp** — search and URL resolution
- **mpv** — audio playback
- A real TTY terminal (macOS or Linux)

## Security

- Sonic shells out to `yt-dlp` and `mpv`. All shell execution is treated as security-sensitive.
- Browser opening is limited to `http` and `https` URLs.
- Mixcloud search uses their public API over HTTPS. No credentials stored.

See [SECURITY.md](./SECURITY.md) for reporting.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT. See [LICENSE](./LICENSE).

---

<p align="center">
  Made by <a href="https://github.com/sethmills21">Seth Mills</a>
</p>
