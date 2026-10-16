#!/usr/bin/env bash
set -e

# Sonic — terminal music player
# https://github.com/sethmills21/sonic

BOLD="\033[1m"
DIM="\033[2m"
GREEN="\033[32m"
RED="\033[31m"
YELLOW="\033[33m"
CYAN="\033[36m"
RESET="\033[0m"

info()  { echo -e "${CYAN}${BOLD}==>${RESET} $1"; }
ok()    { echo -e "${GREEN}${BOLD} ✓${RESET} $1"; }
warn()  { echo -e "${YELLOW}${BOLD} !${RESET} $1"; }
fail()  { echo -e "${RED}${BOLD} ✗${RESET} $1"; exit 1; }

echo ""
echo -e "${BOLD}  SONIC${RESET} — terminal music player"
echo ""

# --- Detect OS ---
OS="unknown"
if [[ "$OSTYPE" == "darwin"* ]]; then
  OS="macos"
elif [[ "$OSTYPE" == "linux"* ]]; then
  OS="linux"
else
  fail "Unsupported platform: $OSTYPE (macOS and Linux only)"
fi

# --- Check Node.js ---
info "Checking Node.js..."
if command -v node &>/dev/null; then
  NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
  if [[ "$NODE_VERSION" -ge 22 ]]; then
    ok "Node.js $(node -v)"
  else
    fail "Node.js 22+ required (found $(node -v)). Update at https://nodejs.org"
  fi
else
  fail "Node.js not found. Install 22+ from https://nodejs.org"
fi

# --- Check / install yt-dlp ---
info "Checking yt-dlp..."
if command -v yt-dlp &>/dev/null; then
  ok "yt-dlp $(yt-dlp --version 2>/dev/null || echo 'installed')"
else
  warn "yt-dlp not found — installing..."
  if [[ "$OS" == "macos" ]]; then
    brew install yt-dlp || fail "Failed to install yt-dlp via Homebrew"
  else
    SUDO=""; command -v sudo &>/dev/null && SUDO="sudo"
    $SUDO apt-get install -y yt-dlp 2>/dev/null \
      || { curl -fsSL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && chmod +x /usr/local/bin/yt-dlp; } \
      || fail "Failed to install yt-dlp"
  fi
  ok "yt-dlp installed"
fi

# --- Check / install mpv ---
info "Checking mpv..."
if command -v mpv &>/dev/null; then
  ok "mpv installed"
else
  warn "mpv not found — installing..."
  if [[ "$OS" == "macos" ]]; then
    brew install mpv || fail "Failed to install mpv via Homebrew"
  else
    SUDO=""; command -v sudo &>/dev/null && SUDO="sudo"
    $SUDO apt-get update -qq && $SUDO apt-get install -y mpv || fail "Failed to install mpv"
  fi
  ok "mpv installed"
fi

# --- Install Sonic ---
info "Installing Sonic..."

INSTALL_DIR="${HOME}/.sonic"

if [[ -d "$INSTALL_DIR" ]]; then
  warn "Existing install found — updating..."
  cd "$INSTALL_DIR"
  git pull --ff-only origin main
  npm install --silent
else
  git clone https://github.com/sethmills21/sonic.git "$INSTALL_DIR"
  cd "$INSTALL_DIR"
  npm install --silent
fi

# --- Create symlink ---
info "Linking sonic command..."

BIN_DIR="${HOME}/.local/bin"
mkdir -p "$BIN_DIR"

ln -sf "${INSTALL_DIR}/bin/sonic.js" "${BIN_DIR}/sonic"

# Check if BIN_DIR is in PATH
if [[ ":$PATH:" != *":${BIN_DIR}:"* ]]; then
  warn "${BIN_DIR} is not in your PATH"
  echo ""
  echo "  Add this to your shell profile (~/.zshrc or ~/.bashrc):"
  echo ""
  echo -e "    ${DIM}export PATH=\"\$HOME/.local/bin:\$PATH\"${RESET}"
  echo ""
fi

echo ""
echo -e "${GREEN}${BOLD}  Sonic installed!${RESET}"
echo ""
echo -e "  Run: ${BOLD}sonic${RESET}            — open the picker"
echo -e "  Run: ${BOLD}sonic \"lofi\"${RESET}     — search and play"
echo -e "  Run: ${BOLD}sonic doctor${RESET}      — verify setup"
echo ""
echo -e "  ${DIM}Spotify (optional): run sonic connect${RESET}"
echo ""
