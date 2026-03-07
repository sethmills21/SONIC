# Sonic

Sonic is a YouTube-first terminal music player with a loud TUI, fast keyboard controls, persistent local state, and zero browser-tab overhead.

It uses `yt-dlp` for search and media resolution, `mpv` for playback, and plain Node.js for the CLI runtime. The goal is not to become a generic downloader or a weak all-services shell. The goal is to be a terminal-native music player that feels sharp enough to keep installed.

## What Sonic Does Well

- Search YouTube from the terminal and start playback fast
- Play long-form mixes, playlists, and ambient sessions in `mpv`
- Browse curated vibe and activity pickers
- Save favorites and revisit recents
- Carry a real next-track queue through search results
- Run `sonic doctor` to verify your local setup
- Switch between curated themes and persist your default
- Swap between ASCII visualizer modes during playback
- Open the current track in a browser when needed
- Experiment with SoundCloud search via `--soundcloud`

## Product Direction

Sonic stays opinionated on purpose:

- Start with YouTube because discovery is fast and the CLI flow already works
- Optimize for coding, writing, reading, workouts, focus sessions, and long-form listening
- Keep setup simple: Node, `yt-dlp`, `mpv`, done
- Avoid becoming a kitchen-sink media client before the core UX is excellent

## Requirements

- Node.js 20+
- `yt-dlp`
- `mpv`
- A real TTY terminal
- Currently tested on macOS. Linux should work for the core flow. Windows is not supported yet.

## Install

Sonic is currently intended to be run from source.

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

- `Arrow keys` / `j` `k`: move through lists
- `Tab` / `Left` / `Right`: switch picker tabs
- `Enter`: play selected result
- `/`: search
- `f`: open favorites in picker, favorite or unfavorite in results and playback
- `r`: open recents
- `m`: switch search source
- `t` / `T`: next or previous theme
- `b`: go back to the picker
- `Space`: pause or resume
- `n` / `p`: next or previous track in the current queue
- `[` / `]`: seek backward or forward 10 seconds
- `-` / `+`: volume down or up
- `v`: cycle visualizer mode
- `o`: open the current track in the browser
- `q`: quit

## Themes

Sonic ships with four built-in themes:

- `Neon Night`: the original rainbow night-session default
- `Sunset Cassette`: warm retro tape-deck energy
- `Ice Glass`: cold chrome and plasma blues
- `Ember Void`: molten orange, red, and magenta

Use `t` for the next theme and `T` for the previous one from the picker, results, or playback screens. Your selected theme persists across runs.

## Local State

Sonic stores local data at:

```text
~/.config/sonic/store.json
```

The store currently tracks:

- default search source
- selected theme
- default visualizer
- volume
- search limit
- favorites
- recents

## Project Layout

```text
bin/sonic.js      CLI entrypoint and keyboard state machine
lib/search.js     yt-dlp-backed search
lib/player.js     mpv process and IPC socket controller
lib/channels.js   curated vibe and activity presets
lib/ui.js         terminal rendering, layout, and visualizers
lib/system.js     dependency checks, help output, safe URL opening
lib/store.js      persistent local config, favorites, and recents
lib/themes.js     theme registry and palette helpers
```

## Service Strategy

A bigger Sonic can support more services, but each one has a different legal and technical shape.

| Service | Official surface | What it means for Sonic |
| --- | --- | --- |
| YouTube | [YouTube Data API](https://developers.google.com/youtube/v3) and [IFrame Player API](https://developers.google.com/youtube/iframe_api_reference) | Good for discovery and metadata. Official playback is player/embed based, not raw audio streaming. |
| Spotify | [Web API](https://developer.spotify.com/documentation/web-api) and [Web Playback SDK](https://developer.spotify.com/documentation/web-playback-sdk) | Good for metadata and remote playback control, but not a simple headless CLI streaming path. |
| Apple Music | [Apple Music API](https://developer.apple.com/documentation/applemusicapi/) and MusicKit | Strong catalog access, but playback depends on Apple Music auth and subscription flows. |
| SoundCloud | [SoundCloud API](https://developers.soundcloud.com/docs/api/guide) | Possible catalog/search integration, but the access model is narrower than the current `yt-dlp` workflow. |

Recommendation: keep the shipped product YouTube-first until there is a clean adapter boundary and a documented auth/legal story for any additional service.

## Roadmap

### Near term

- Add richer in-app config editing instead of manual JSON edits
- Add playlist save and load flows on top of favorites and recents
- Expand CI beyond syntax checks and add real smoke coverage
- Improve queue UX with reordering and explicit queue views

### Medium term

- Add playlists, saved stations, and richer search filters
- Explore album-art-aware terminal layouts where they actually improve the experience
- Improve Linux support and decide explicitly whether Windows will be supported
- Add release automation for GitHub and npm

### Session integration

There is a strong fit for `sesh`-style workflow integration:

- detect the active work session
- pick a soundtrack based on session type or tags
- log what played during the session
- restore the last soundtrack when a session resumes

If the sibling repo is `/Users/MillsMac/code/seth.space`, Sonic should integrate through that repo's `sesh` CLI instead of coupling directly to another codebase or database. Keep the contract thin: shell out, read structured output, and avoid hard-wiring internal tables into Sonic.

## Security Notes

- Sonic shells out to external binaries (`yt-dlp`, `mpv`). Treat all shell execution as security-sensitive.
- Browser opening is intentionally limited to `http` and `https` URLs.
- Before a broader release, review the legal boundary of every playback path you support.
- Keep dependencies small. This project does not need a heavy framework stack.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the development workflow and [SECURITY.md](./SECURITY.md) for reporting expectations.

## License

MIT. See [LICENSE](./LICENSE).
