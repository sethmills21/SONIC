# SONIC

<p align="center">
  <img src="./assets/demo.gif" alt="Sonic — terminal music player" width="800">
</p>

<p align="center">
  SONIC is a vibes-based CLI music player to join alongside your other terminal tabs<br>
  Supports YouTube, SoundCloud, Mixcloud, and Spotify.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/node-%3E%3D22-green?style=flat-square&logo=node.js" alt="Node">
  <img src="https://img.shields.io/badge/license-MIT-yellow?style=flat-square" alt="License">
  <img src="https://img.shields.io/badge/sources-4-purple?style=flat-square" alt="Sources">
</p>

## Quick Start

**One-liner** (macOS / Linux — installs prereqs automatically):

```bash
curl -fsSL https://raw.githubusercontent.com/sethmills21/sonic/main/install.sh | bash
```

<details>
<summary><strong>npm</strong></summary>

```bash
npm install -g github:sethmills21/SONIC
sonic "lofi"
```
</details>

<details>
<summary><strong>Hackable</strong></summary>

```bash
brew install yt-dlp mpv                    # macOS prereqs
git clone https://github.com/sethmills21/sonic.git
cd sonic && npm install
npm start
```
</details>

<details>
<summary><strong>Verify setup</strong></summary>

```bash
sonic doctor
```
</details>

## Commands

```bash
sonic                            # open the picker
sonic "deep house"               # search and play
sonic "james bond intro music, working"   # describe a vibe
sonic --soundcloud "liquid dnb"  # search SoundCloud
sonic --mixcloud "techno mix"    # search Mixcloud
sonic --spotify "daft punk"      # search Spotify
sonic connect                    # connect Spotify, step by step
sonic "https://youtu.be/..."     # play a link (quote it)
sonic doctor                     # check setup
sonic --help                     # full help
```

## Controls

| Key | Picker | Playback |
| --- | --- | --- |
| `Enter` | Play selected | — |
| `Space` | — | Pause / resume |
| `/` | Describe a vibe | New vibe (stops playback) |
| `j` `k` / arrows | Move through lists | — |
| `1`–`0` | Quick pick a vibe | — |
| `Tab` / `Left` `Right` | Switch tabs | — |
| `n` / `p` | — | Next / previous track |
| `f` | Open favorites | Favorite track |
| `r` | Open recents | — |
| `[` `]` | — | Seek -/+ 10s |
| `-` `+` | — | Volume down / up |
| `m` | Cycle source | — |
| `v` | — | Cycle visualizer |
| `t` / `T` | Next / prev theme | Next / prev theme |
| `d` | Toggle dark/light | Toggle dark/light |
| `o` | — | Open in browser |
| `b` | — | Back to picker |
| `q` | Quit | Quit |

macOS media keys work via Control Center.

## Describe a vibe

Press `/` and type what you want in plain words: a mood, a scene, an artist, or a song. Three or more words count as a vibe. Sonic searches your words and a long-mix version at once, then puts sets you can work to (20+ minutes, or live) first. On Spotify, a vibe finds playlists.

## Themes

Six built-in themes with dark and light variants: **Neon Night**, **Sunset Cassette**, **Ice Glass**, **Ember Void**, **Midnight Tokyo**, **Terminal Green**. Press `t` to cycle, `d` to toggle mode.

## Visualizers

Five modes: **Bars**, **Tape**, **Wave**, **Rain**, **Flame**. Press `v` during playback.

## Sources

YouTube, SoundCloud, and Mixcloud play through `mpv` and need no account. Press `m` to cycle. Live streams show a **LIVE** badge instead of a fake length.

### Spotify

Spotify is optional. Sonic acts as a remote: audio plays in a Spotify app (desktop, phone, or web player), and Sonic searches, starts, skips, seeks, and shows what is playing.

```bash
sonic connect        # or press c on the home screen
```

Connect walks you through three checked steps: install [spogo](https://github.com/steipete/spogo) (the Spotify CLI Sonic drives), bring over your Spotify login from your browser, and find a device to play on. macOS asks once to share your browser's saved logins; click **Always Allow**.

- **Vibes and sessions** open Spotify playlists. **Search** finds tracks. Spotify links (`open.spotify.com/...` or `spotify:` URIs) play directly.
- **How auth works:** [spogo](https://github.com/steipete/spogo) uses your own Spotify web session cookies, stored locally. Sonic never sees or stores your password, and no developer app is needed.
- **Premium:** Spotify only allows remote playback control for Premium accounts. On macOS with the Spotify desktop app open, spogo can drive the app directly instead.
- Press `m` to switch to Spotify any time. If it is not connected yet, Sonic opens Connect. `sonic doctor` reports whether you are logged in.
- Unofficial: this uses Spotify's web player endpoints the same way your browser does. Use it with your own account.

## Requirements

**Node.js** 22+ &nbsp;&middot;&nbsp; **yt-dlp** &nbsp;&middot;&nbsp; **mpv** &nbsp;&middot;&nbsp; macOS or Linux &nbsp;&middot;&nbsp; optional: **spogo** for Spotify

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) and [SECURITY.md](./SECURITY.md).

## License

MIT

---

<p align="center">
  Cooked up by <a href="https://github.com/sethmills21">Seth Mills</a> and <a href="https://claude.ai/code">Claude Code</a>
</p>

<p align="center">
  <sub>Not claiming this is some groundbreaking piece of tech — just solving my own problem and had a lot of fun building it. Open to ideas, feel free to fork.</sub>
</p>
