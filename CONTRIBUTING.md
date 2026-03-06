# Contributing

## Goals

Sonic should stay fast, readable, and fun. Favor improvements that make the CLI feel sharper, easier to install, or safer to publish.

## Local Setup

1. Install Node.js 20+
2. Install `yt-dlp` and `mpv`
3. Install dependencies

```bash
brew install yt-dlp mpv
npm install
```

## Development Commands

```bash
npm start
npm start -- "lofi"
npm run check
npm run doctor
node ./bin/sonic.js --help
```

## Before Opening A PR

1. Run `npm run check`
2. Smoke-test the CLI manually in a real terminal
3. Verify the main flows you touched

Manual smoke-test checklist:

- picker renders correctly
- search returns results
- favorites persist
- recents persist
- a selected result starts playback
- queue next/previous works
- pause/resume works
- browser open still works
- quit restores the terminal cleanly

## Code Guidelines

- Keep dependencies minimal
- Prefer small modules over clever abstractions
- Do not interpolate untrusted values into shell commands
- Preserve the current low-friction startup story
- If you add a service integration, document auth, legal, and setup implications in `README.md`

## UX Guidelines

- The CLI should feel intentional, not generic
- Keyboard-first interaction is the default
- Visual flair is good if it does not make the app fragile
- If a change adds setup burden, the payoff needs to be obvious

## Issues And Feature Requests

Good issues include:

- exact commands used
- terminal/OS details
- whether `mpv` and `yt-dlp` are installed
- screenshots or terminal recordings for UI regressions

For major roadmap ideas, prefer opening an issue before building the whole thing.
