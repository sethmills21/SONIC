# Sonic

A terminal music player with a theatrical TUI, fast keyboard controls, and persistent local state. Search YouTube, SoundCloud, and Mixcloud from the terminal and start playing with zero browser-tab overhead.

Uses `yt-dlp` for search and URL resolution, `mpv` for audio playback, and plain Node.js for the CLI runtime. One dependency (`chalk`). No frameworks.

## What It Does

- Search YouTube, SoundCloud, and Mixcloud from the terminal
- Play long-form mixes, playlists, and ambient sessions via `mpv`
- Browse curated vibe and activity pickers
- Save favorites and revisit recents across all sources
- Carry a next-track queue through search results
- Switch between 6 themes with dark and light mode support
- Swap between 5 visualizer modes during playback (bars, tape, wave, rain, flame)
- macOS media key support (play/pause/next via Control Center)
- Open the current track in a browser when needed
- Run `sonic doctor` to verify setup

## Requirements

- Node.js 20+
- `yt-dlp`
- `mpv`
- A real TTY terminal
- macOS or Linux (Windows not yet supported)

## Install

### macOS

```bash
brew install yt-dlp mpv
git clone https://github.com/sethmills21/sonic.git
cd sonic
npm install
npm start
```

### Linux

Install `yt-dlp` and `mpv` with your package manager, then:

```bash
git clone https://github.com/sethmills21/sonic.git
cd sonic
npm install
npm start
```

### Verify your setup

```bash
npm run doctor
```

## Usage

```bash
npm start
npm start -- "lofi"
node ./bin/sonic.js "deep house"
node ./bin/sonic.js --soundcloud "liquid dnb"
node ./bin/sonic.js --mixcloud "techno mix"
node ./bin/sonic.js doctor
node ./bin/sonic.js --help
```

Planned publish UX once the package is released:

```bash
npx sonic-cli "lofi"
# or
npm install -g sonic-cli
sonic "lofi"
```

## Controls

### Picker

- `Arrow keys` / `j` `k`: move through lists
- `Tab` / `Left` / `Right`: switch picker tabs
- `Enter`: play selected
- `/`: search
- `f`: open favorites
- `r`: open recents
- `m`: cycle source (YouTube / SoundCloud / Mixcloud)
- `t` / `T`: next / previous theme
- `d`: toggle dark / light mode
- `q`: quit

### Playback

- `Space`: pause / resume
- `n` / `p`: next / previous track in queue
- `f`: favorite / unfavorite current track
- `[` / `]`: seek backward / forward 10 seconds
- `-` / `+`: volume down / up
- `v`: cycle visualizer mode
- `t` / `T`: next / previous theme
- `d`: toggle dark / light mode
- `o`: open current track in browser
- `/`: search (stops playback)
- `b`: back to picker
- `q`: quit

macOS media keys (play/pause, next) work via Control Center when `mpv` is running.

## Sources

| Source | Search | Playback | Auth |
| --- | --- | --- | --- |
| YouTube | `yt-dlp` search | `mpv` via `yt-dlp` | None |
| SoundCloud | `yt-dlp` search | `mpv` via `yt-dlp` | None |
| Mixcloud | Mixcloud public API | `mpv` via `yt-dlp` | None |

Press `m` to cycle between sources. Use `--soundcloud` or `--mixcloud` flags to start in a specific source.

## Themes

Sonic ships with 6 built-in themes, each with dark and light mode variants:

- **Neon Night** — the original rainbow night-session glow
- **Sunset Cassette** — warm retro tape-deck energy
- **Ice Glass** — cold chrome and plasma blues
- **Ember Void** — molten orange, red, and magenta
- **Midnight Tokyo** — cyberpunk neon through rain-soaked glass
- **Terminal Green** — phosphor glow on a CRT at 2am

Press `t` / `T` to cycle themes, `d` to toggle dark/light mode. Both persist across runs.

## Visualizers

- **Bars** — spectrum analyzer with mirror reflection
- **Tape** — cassette deck with spinning reels and progress
- **Wave** — oscilloscope waveform
- **Rain** — matrix-style falling characters
- **Flame** — fire simulation driven by audio energy

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

- Richer in-app config editing instead of manual JSON edits
- Playlist save and load flows on top of favorites and recents
- CI beyond syntax checks with real smoke coverage
- Queue UX with reordering and explicit queue views

### Medium term

- Saved stations and richer search filters
- Album-art-aware terminal layouts where they improve the experience
- Linux polish and explicit Windows support decision
- Release automation for GitHub and npm
- Session-aware workflows (detect active work session, pick soundtrack, log what played)

## Security Notes

- Sonic shells out to `yt-dlp` and `mpv`. All shell execution is treated as security-sensitive.
- Browser opening is limited to `http` and `https` URLs.
- Mixcloud search uses their public API over HTTPS. No credentials stored.
- Keep dependencies minimal. This project does not need a heavy framework stack.

See [CONTRIBUTING.md](./CONTRIBUTING.md) and [SECURITY.md](./SECURITY.md).

## License

MIT. See [LICENSE](./LICENSE).
