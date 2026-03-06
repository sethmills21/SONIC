# Sonic

Sonic is a YouTube-first terminal music player with a loud TUI, fast keyboard controls, and zero browser-tab overhead.

Today it is a small Node CLI powered by `yt-dlp` for search/URL resolution and `mpv` for playback. The near-term goal is to turn it into a polished GitHub project that is easy to install, safe to hack on, and fun enough that people actually keep it installed.

## Current Scope

- Search YouTube from the terminal
- Play long-form mixes and playlists in `mpv`
- Browse curated vibe and activity pickers
- Save favorites and revisit recent plays
- Carry a real next-track queue through a result list
- Run `sonic doctor` to verify local setup
- Switch between curated themes and persist your favorite one
- Switch between multiple ASCII visualizers during playback
- Open the current track in the browser
- Experimental SoundCloud search via `--soundcloud`

## Product Direction

Sonic should stay opinionated:

- Start with YouTube because discovery is fast and the CLI UX is already working.
- Optimize for focus sessions, coding, writing, reading, workouts, and other long-form listening modes.
- Keep setup dead simple: Node, `yt-dlp`, `mpv`, done.
- Avoid becoming a generic downloader or a messy multi-service kitchen sink.

## Requirements

- Node.js 20+
- `yt-dlp`
- `mpv`
- A real TTY terminal
- Currently tested on macOS. Linux should be workable for the core flow; Windows is not supported yet.

### macOS setup

```bash
brew install yt-dlp mpv
npm install
npm start
```

### Linux setup

Install `yt-dlp` and `mpv` with your package manager, then:

```bash
npm install
npm start
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

If you eventually publish this package to npm, the intended UX is:

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
- `f`: open favorites in picker, favorite/unfavorite in results/playback
- `r`: open recents
- `m`: switch search source
- `t` / `T`: next or previous theme
- `b`: go back to picker
- `Space`: pause or resume
- `n` / `p`: next or previous in the current queue
- `[` / `]`: seek backward or forward 10 seconds
- `-` / `+`: volume
- `v`: cycle visualizer mode
- `o`: open current track in the browser
- `q`: quit

## Local State

Sonic persists local state in:

```text
~/.config/sonic/store.json
```

That store currently holds:

- default source
- theme
- default visualizer
- volume
- search limit
- favorites
- recents

## Themes

Sonic currently ships with four themes:

- `Neon Night`: the original rainbow/night-session default
- `Sunset Cassette`: warm retro tape-deck energy
- `Ice Glass`: cool chrome and plasma blues
- `Ember Void`: molten orange, red, and magenta

Use `t` for the next theme and `T` for the previous one from the picker, results, or playback screens.

For now, editing the file directly is the easiest way to tweak defaults beyond the live keyboard controls.

## Project Layout

```text
bin/sonic.js      CLI entrypoint and keyboard state machine
lib/search.js     yt-dlp-backed search
lib/player.js     mpv process + IPC socket controller
lib/channels.js   curated vibe and activity presets
lib/ui.js         terminal rendering and visualizers
lib/system.js     dependency checks, help output, safe URL opening
lib/store.js      persistent local config, favorites, and recents
lib/themes.js     curated theme registry and theme cycling helpers
```

## API And Service Strategy

A bigger Sonic can support more services, but each one has a different legal and technical shape.

| Service | Official surface | What it means for Sonic |
| --- | --- | --- |
| YouTube | [YouTube Data API](https://developers.google.com/youtube/v3) and [IFrame Player API](https://developers.google.com/youtube/iframe_api_reference) | Good for discovery and metadata. Official playback is embed/player based, not raw audio streaming. |
| Spotify | [Web API](https://developer.spotify.com/documentation/web-api) and [Web Playback SDK](https://developer.spotify.com/documentation/web-playback-sdk) | Good for metadata and controlling a user's playback session, but not a simple headless CLI streaming story. |
| Apple Music | [Apple Music API](https://developer.apple.com/documentation/applemusicapi/) and MusicKit | Strong catalog access, but playback depends on Apple Music auth/subscription flows. |
| SoundCloud | [SoundCloud API](https://developers.soundcloud.com/docs/api/guide) | Possible catalog/search integration, but access patterns are narrower than the current `yt-dlp` workflow. |

Recommendation: keep the shipped product YouTube-first until there is a clean, documented adapter boundary and a service-specific auth/legal story for anything else.

## Roadmap

### Near term

- Add richer config editing inside the CLI instead of manual JSON edits
- Add playlist save/load flows on top of favorites and recents
- Expand CI beyond syntax checks and add smoke tests
- Improve the queue UX with reordering and explicit queue views

### Medium term

- Add playlists, saved stations, and richer search filters
- Add album-art aware terminal layouts where it makes sense
- Improve Linux support and explicitly decide whether Windows is supported
- Add release automation for GitHub and npm

### Session integration

There is a strong fit for `sesh`-style workflow integration:

- detect the active work session
- pick a soundtrack based on session type or tags
- log what played during the session
- restore the last soundtrack when a session resumes

If the local sibling repo is `/Users/MillsMac/code/seth.space`, Sonic can likely integrate through that repo's `sesh` CLI instead of coupling directly to its database. Keep the contract thin: shell out, read structured output, and do not hard-wire internal tables into Sonic.

## Security And Legal Notes

- Sonic shells out to external binaries (`yt-dlp`, `mpv`). Treat all shell execution as security-sensitive.
- Browser opening is intentionally limited to `http` and `https` URLs.
- Before a public release, review the legal boundary of every playback path you support, especially if it is not built on an official service SDK.
- Keep dependencies small. This project does not need a heavy framework stack.

## Contributor Workflow

```bash
npm install
npm run check
npm start
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the development workflow and [SECURITY.md](./SECURITY.md) for reporting/security expectations.

## License

No license has been added yet. Choose one before making the repository public for contributions.
