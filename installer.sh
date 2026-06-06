#!/bin/bash
# ============================================================
#  Minecraft Bot Player - Installer
#  Author: NebulaCloudID
#  github.com/NebulaCloudID
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║       🤖  Minecraft Bot Player - Installer               ║"
echo "║              github.com/NebulaCloudID                   ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# ── 1. Cek OS ────────────────────────────────────────────────
if [ -f /etc/debian_version ]; then
  DISTRO="debian"
elif [ -f /etc/redhat-release ]; then
  DISTRO="redhat"
else
  DISTRO="unknown"
fi

# ── 2. Install Node.js kalau belum ada ───────────────────────
if ! command -v node &> /dev/null; then
  echo -e "${YELLOW}  [1/4] Node.js tidak ditemukan. Installing...${NC}"
  if [ "$DISTRO" = "debian" ]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
    apt-get install -y nodejs > /dev/null 2>&1
  elif [ "$DISTRO" = "redhat" ]; then
    curl -fsSL https://rpm.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
    yum install -y nodejs > /dev/null 2>&1
  else
    echo -e "${RED}  ❌ OS tidak dikenali. Install Node.js manual dulu.${NC}"
    exit 1
  fi
  echo -e "${GREEN}  ✅ Node.js $(node -v) berhasil diinstall!${NC}"
else
  echo -e "${GREEN}  [1/4] Node.js sudah ada: $(node -v)${NC}"
fi

# ── 3. Buat folder project ───────────────────────────────────
INSTALL_DIR="$HOME/bot-playermc-v2"
echo -e "${CYAN}  [2/4] Membuat folder: $INSTALL_DIR${NC}"
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

# ── 4. Init npm & install mineflayer ─────────────────────────
if [ ! -f package.json ]; then
  echo -e "${CYAN}  [3/4] Setup npm & install mineflayer...${NC}"
  npm init -y > /dev/null 2>&1
  npm install mineflayer > /dev/null 2>&1
  echo -e "${GREEN}  ✅ Mineflayer berhasil diinstall!${NC}"
else
  echo -e "${GREEN}  [3/4] Dependency sudah ada, skip install.${NC}"
fi

# ── 5. Download script bot ───────────────────────────────────
echo -e "${CYAN}  [4/4] Download script bot...${NC}"
curl -fsSL https://raw.githubusercontent.com/NebulaCloudID/Bot-player-mc-v2/main/bot-load-test.js -o bot-load-test.js
echo -e "${GREEN}  ✅ Script berhasil didownload!${NC}"

# ── Done ─────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════════════════"
echo -e "${GREEN}  ✅ Instalasi selesai!${NC}"
echo ""
echo -e "  Jalankan bot dengan perintah:"
echo -e "  ${CYAN}cd $INSTALL_DIR && node bot-load-test.js${NC}"
echo ""
echo "══════════════════════════════════════════════════════════"
echo ""

# Tanya mau langsung jalankan atau tidak
read -p "  🚀 Jalankan bot sekarang? (y/n): " RUN_NOW
if [ "$RUN_NOW" = "y" ] || [ "$RUN_NOW" = "Y" ]; then
  echo ""
  node bot-load-test.js
fi
