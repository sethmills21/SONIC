# Security Policy

## Status

Sonic is a small hobby project with a basic CI check and manual smoke testing. Treat it as best-effort software: there is no formal support SLA, no release-signing workflow, and no promise of long-term compatibility across platforms.

## Reporting A Vulnerability

Do not open a public issue with exploit details.

Instead:

- use a private GitHub security advisory if the repository is public
- or contact the maintainer directly if you know the maintainer

Include:

- affected version or commit
- operating system
- exact reproduction steps
- whether the issue requires malicious media metadata, a crafted URL, or local access
- proof-of-concept details if available

## High-Risk Areas

- shelling out to `yt-dlp`, `mpv`, and OS-level browser open commands
- handling untrusted metadata and URLs from external media sources
- any future OAuth tokens or service API integrations
- any future local config files that execute commands or templates

## Current Guardrails

- browser opening is limited to `http` and `https` URLs
- search execution uses argument-based process spawning, not shell interpolation
- dependencies are intentionally small and tracked via `package-lock.json`
- setup diagnostics are available via `node ./bin/sonic.js doctor`

## Security Rules For Contributors

- do not add shell-based command construction around user or track input
- do not add telemetry or remote config without documenting the trust model
- do not store secrets in the repo
- document every new external integration in `README.md`
- review service terms before adding non-trivial playback support
