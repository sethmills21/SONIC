# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

Sonic is a terminal music player with a theatrical TUI. It is currently YouTube-first and uses:

- `yt-dlp` for search and URL resolution
- `mpv` for audio playback
- plain Node.js ESM for the CLI runtime
- `chalk` for color and terminal styling
- a persisted local store for favorites, recents, theme, and playback defaults

SoundCloud search exists, but treat it as experimental. The main product direction is a polished, publishable GitHub project with a strong setup story and a clear line between fun UX and risky service creep.

## Product Priorities

1. Keep YouTube discovery and playback sharp
2. Make setup obvious and reliable
3. Keep favorites, recents, queue, and local config feeling polished
4. Preserve the bold terminal personality
5. Improve safety around shelling out to system tools
6. Add session-aware workflows before chasing many streaming services

## Commands

```bash
npm install
npm start
npm start -- "lofi"
npm run check
npm run doctor
node ./bin/sonic.js --help
```

Runtime dependencies:

```bash
brew install yt-dlp mpv
```

## Project Structure

```text
bin/sonic.js      CLI entrypoint, keyboard handling, top-level state machine
lib/search.js     yt-dlp search adapter
lib/player.js     mpv process lifecycle and IPC socket
lib/channels.js   curated channels and activities
lib/ui.js         terminal UI, header, lists, visualizers
lib/system.js     dependency checks, help text, safe external opening
lib/store.js      persistent local config, favorites, recents
lib/themes.js     curated theme system and palette registry
```

## Working Rules

- Do not interpolate untrusted data into shell commands
- Keep dependencies minimal unless there is a strong reason otherwise
- Prefer small, obvious modules over framework-style abstractions
- Preserve keyboard-first flows when changing the UI
- Keep themes cohesive across header, lists, playback, and visualizers
- If you change playback behavior, manually smoke-test the interactive flow
- If you add a new service, document the auth, setup, and legal constraints in `README.md`
- Keep project-level `CLAUDE.md` and `AGENTS.md` checked into git. Ignore machine-local agent config elsewhere, not the repo contract files.

## Inspiration

Use these as product and DX references, not templates to copy blindly:

- [`googleworkspace/cli`](https://github.com/googleworkspace/cli): strong install story, clear prerequisites, dynamic command surface, and explicit human + agent positioning.
- [`cli/cli`](https://github.com/cli/cli): benchmark for command naming, help quality, and “official-feeling” terminal UX.
- [`alexknowshtml/api2cli`](https://github.com/alexknowshtml/api2cli): good model for dual-mode output and agent-friendly command design.
- [`asc`](https://asccli.sh/): strong example of lightweight install UX and a narrow, high-value workflow focus.
- [`Polymarket/polymarket-cli`](https://github.com/Polymarket/polymarket-cli): good example of calling out risk early, offering Homebrew install, and serving both humans and scripts.
- [`google-gemini/gemini-cli`](https://github.com/google-gemini/gemini-cli) and [`superagent-ai/grok-cli`](https://github.com/superagent-ai/grok-cli): useful references for agent-oriented terminal branding and docs structure.
- [`rothgar/awesome-tuis`](https://github.com/rothgar/awesome-tuis): broad pattern library for TUI interaction ideas.
- [Karpathy tweet](https://x.com/karpathy/status/2026360908398862478): reminder that terminal-native AI/dev tools can feel faster and more direct than browser-heavy workflows.

Borrow these ideas for Sonic:

- install should be one-screen simple
- help text should be excellent
- the CLI should work for humans first, but not block agent/script usage later
- repo docs should make the product feel real, not experimental by accident
- narrow scope beats shallow support for many services

## Service Strategy

If a user asks to expand beyond YouTube:

- Prefer official APIs first
- Separate discovery/auth concerns from playback concerns
- Do not present unofficial playback paths as if they were official SDK integrations
- Keep adapters isolated so the core TUI is not tied to one service's auth model

## Release Readiness

Before calling this project ready for public GitHub/npm release, make sure the repo has:

- a strong `README.md`
- `CONTRIBUTING.md`
- `SECURITY.md`
- clear install instructions
- a chosen open-source license
- at least one automated check in CI

## Testing Expectations

There are no automated tests yet. Minimum validation for behavior changes:

1. run `npm run check`
2. run the CLI in a real terminal
3. verify picker, search, playback, pause/resume, browser open, and quit
