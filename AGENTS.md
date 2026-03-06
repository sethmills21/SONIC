# AGENTS.md

Guidance for coding agents working in this repository. Keep this aligned with `CLAUDE.md`.

## Mission

Make Sonic feel like a real terminal product, not a code sketch. Favor changes that improve setup, safety, playback reliability, and the quality of the keyboard-driven UX.

## Current Scope

- YouTube-first CLI music player
- `yt-dlp` search and media resolution
- `mpv` audio playback
- curated vibes and activity presets
- expressive terminal UI and visualizers
- experimental SoundCloud search

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
```

## File Map

```text
bin/sonic.js      CLI state machine
lib/search.js     search adapter
lib/player.js     mpv controller
lib/channels.js   content presets
lib/ui.js         TUI rendering
lib/system.js     system checks and safe URL opening
lib/store.js      local store for config, favorites, recents
```

## Guardrails

- never build shell commands by concatenating untrusted input
- keep the dependency footprint small
- do not break the interactive TTY flow
- keep docs in sync with real behavior
- prefer YouTube-first improvements over speculative multi-service work
- if you add another service, explain the API/auth/legal model in `README.md`
- keep project-level `CLAUDE.md` and `AGENTS.md` versioned in git; do not hide them in `.gitignore`

## Inspiration

Reference set for CLI/TUI quality:

- [`googleworkspace/cli`](https://github.com/googleworkspace/cli): installation, prerequisites, agent-ready framing, structured output.
- [`cli/cli`](https://github.com/cli/cli): command ergonomics, help UX, and polished distribution posture.
- [`alexknowshtml/api2cli`](https://github.com/alexknowshtml/api2cli): dual human/agent command design and self-documenting CLI patterns.
- [`asc`](https://asccli.sh/): focused workflow automation with a strong install/onboarding surface.
- [`Polymarket/polymarket-cli`](https://github.com/Polymarket/polymarket-cli): clear warnings, Homebrew install, scriptable terminal product design.
- [`google-gemini/gemini-cli`](https://github.com/google-gemini/gemini-cli) and [`superagent-ai/grok-cli`](https://github.com/superagent-ai/grok-cli): examples of modern agent CLI presentation.
- [`rothgar/awesome-tuis`](https://github.com/rothgar/awesome-tuis): broad TUI idea bank.

What to steal for Sonic:

1. excellent `--help`
2. clean install paths
3. obvious warnings around risky behavior
4. strong README and release posture
5. future-friendly script/agent integration without sacrificing the live TUI

## Preferred Roadmap

1. queue, favorites, recents, config
2. doctor/setup diagnostics
3. session integration
4. cleaner service adapter boundaries
5. broader platform support and release automation

## Session Notes

If `sesh` comes up, check whether the local sibling repo `/Users/MillsMac/code/seth.space` is the target. Favor a thin CLI integration over direct database coupling.

## Validation

For meaningful changes:

1. run `npm run check`
2. smoke-test the CLI manually
3. verify the terminal is restored correctly on quit
