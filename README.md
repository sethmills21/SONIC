# Sonic

<p align="center">
  <img src="./assets/demo.gif" alt="Sonic — terminal music player" width="800">
</p>

<p align="center">
  A terminal music player with a theatrical TUI, fast keyboard controls, and persistent local state.<br>
  Search YouTube, SoundCloud, and Mixcloud from your terminal. Zero browser tabs. One dependency.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/node-%3E%3D20-green?style=flat-square&logo=node.js" alt="Node">
  <img src="https://img.shields.io/badge/license-MIT-yellow?style=flat-square" alt="License">
  <img src="https://img.shields.io/badge/sources-3-purple?style=flat-square" alt="Sources">
</p>

## Install

```bash
brew install yt-dlp mpv                              # prereqs (macOS)
git clone https://github.com/sethmills21/sonic.git && cd sonic && npm install
npm start                                             # open the picker
```

<details>
<summary>Linux</summary>

```bash
sudo apt install yt-dlp mpv
git clone https://github.com/sethmills21/sonic.git && cd sonic && npm install
```
</details>

Run `npm run doctor` to verify your setup.

## Usage

```bash
npm start                        # open the picker
npm start -- "lofi"              # search and play immediately
npm start -- --soundcloud "dnb"  # search SoundCloud
npm start -- --mixcloud "techno" # search Mixcloud
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

- **Node.js** 20+ &nbsp; **yt-dlp** &nbsp; **mpv** &nbsp; macOS or Linux

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) and [SECURITY.md](./SECURITY.md).

## License

MIT

---

<p align="center">
  Made by <a href="https://github.com/sethmills21">Seth Mills</a>
</p>
