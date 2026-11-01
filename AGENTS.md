# Sonic

Guidance for coding agents working in this repository.

## Current Scope

- YouTube-first CLI music player
- `yt-dlp` search and media resolution
- `mpv` audio playback
- curated vibes and activity presets
- expressive terminal UI and visualizers
- switchable curated themes with a persisted default
- SoundCloud and Mixcloud search
- direct YouTube, SoundCloud, Mixcloud, and Spotify link playback
- optional Spotify remote control through `spogo` (audio plays in a Spotify app, not mpv)

## Commands

```bash
npm install
npm start
npm start -- "lofi"
npm run check
npm run doctor
node ./bin/sonic.js --help
```

System dependencies:

```bash
brew install yt-dlp mpv
brew install steipete/tap/spogo   # optional, for Spotify
```

## File Map

```text
bin/sonic.js      CLI state machine
lib/search.js     search adapter
lib/player.js     mpv controller
lib/spotify.js    Spotify search and remote control via spogo
lib/channels.js   content presets
lib/ui.js         TUI rendering
lib/system.js     system checks and safe URL opening
lib/store.js      local store for config, favorites, recents
lib/themes.js     theme registry and palette helpers
```

## Guardrails

- never build shell commands by concatenating untrusted input
- keep the dependency footprint small
- do not break the interactive TTY flow
- keep docs in sync with real behavior
- prefer YouTube-first improvements over speculative multi-service work
- if you add another service, explain the API/auth/legal model in `README.md`
- if you touch theme work, keep the identity strong across the full TUI, not just the header

## Validation

For meaningful changes:

1. run `npm run check`
2. smoke-test the CLI manually
3. verify the terminal is restored correctly on quit
