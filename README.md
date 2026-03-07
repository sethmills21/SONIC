# SONIC

<p align="center">
  <img src="./assets/demo.gif" alt="Sonic — terminal music player" width="800">
</p>

<p align="center">
  Nothing crazy but SONIC is a vibes-based CLI music player to join alongside your other terminal tabs<br>
  Supports YouTube, Mixcloud, and Soundcloud as of now.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/node-%3E%3D20-green?style=flat-square&logo=node.js" alt="Node">
  <img src="https://img.shields.io/badge/license-MIT-yellow?style=flat-square" alt="License">
  <img src="https://img.shields.io/badge/sources-3-purple?style=flat-square" alt="Sources">
</p>

## Quick Start

**One-liner** (macOS / Linux — installs prereqs automatically):

```bash
curl -fsSL https://raw.githubusercontent.com/sethmills21/sonic/main/install.sh | bash
```

<details>
<summary><strong>npm</strong></summary>

```bash
npm install -g sonic-cli
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

## Usage

```bash
sonic                            # open the picker
sonic "deep house"               # search YouTube
sonic --soundcloud "liquid dnb"  # search SoundCloud
sonic --mixcloud "techno mix"    # search Mixcloud
```

## Controls

| Key | Picker | Playback |
| --- | --- | --- |
| `Enter` | Play selected | — |
| `Space` | — | Pause / resume |
| `/` | Search | Search (stops playback) |
| `j` `k` / arrows | Move through lists | — |
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

## Themes

Six built-in themes with dark and light variants: **Neon Night**, **Sunset Cassette**, **Ice Glass**, **Ember Void**, **Midnight Tokyo**, **Terminal Green**. Press `t` to cycle, `d` to toggle mode.

## Visualizers

Five modes: **Bars**, **Tape**, **Wave**, **Rain**, **Flame**. Press `v` during playback.

## Sources

YouTube, SoundCloud, and Mixcloud. All use `mpv` for playback and require no auth. Press `m` to cycle.

## Requirements

**Node.js** 20+ &nbsp;&middot;&nbsp; **yt-dlp** &nbsp;&middot;&nbsp; **mpv** &nbsp;&middot;&nbsp; macOS or Linux

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) and [SECURITY.md](./SECURITY.md).

## License

MIT

---

<p align="center">
  Made by <a href="https://github.com/sethmills21">Seth Mills</a>
</p>
