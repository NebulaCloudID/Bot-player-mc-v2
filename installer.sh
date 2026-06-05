#!/bin/bash

# ============================================================
#  Minecraft Bot - Auto Installer
#  github.com/NebulaCloudID/minecraft-bot
# ============================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

GITHUB_USER="NebulaCloudID"
GITHUB_REPO="minecraft-bot"
RAW_URL="https://raw.githubusercontent.com/$GITHUB_USER/$GITHUB_REPO/main"
INSTALL_DIR="$HOME/minecraft-bot"

clear
echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║       🤖  Minecraft Bot - Auto Installer                 ║"
echo "║         github.com/NebulaCloudID/minecraft-bot           ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ============================================================
# CEK OS
# ============================================================
if [ -f /etc/os-release ]; then
  . /etc/os-release
  OS=$ID
else
  echo -e "${RED}❌ OS tidak dikenali!${NC}"
  exit 1
fi

echo -e "  ${BOLD}OS Terdeteksi:${NC} $PRETTY_NAME"
echo ""

# ============================================================
# CEK & INSTALL NODE.JS
# ============================================================
echo -e "${YELLOW}🔍 Mengecek Node.js...${NC}"

if command -v node &> /dev/null; then
  NODE_VER=$(node -v)
  echo -e "${GREEN}✅ Node.js sudah terinstall: $NODE_VER${NC}"
else
  echo -e "${YELLOW}⬇️  Node.js tidak ditemukan. Menginstall...${NC}"

  if [[ "$OS" == "ubuntu" || "$OS" == "debian" ]]; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - &>/dev/null
    apt-get install -y nodejs &>/dev/null
  elif [[ "$OS" == "centos" || "$OS" == "rhel" || "$OS" == "fedora" ]]; then
    curl -fsSL https://rpm.nodesource.com/setup_18.x | bash - &>/dev/null
    yum install -y nodejs &>/dev/null
  else
    echo -e "${RED}❌ OS tidak didukung untuk auto-install Node.js${NC}"
    echo -e "   Install manual: https://nodejs.org"
    exit 1
  fi

  echo -e "${GREEN}✅ Node.js berhasil diinstall: $(node -v)${NC}"
fi

# ============================================================
# CEK & INSTALL NPM
# ============================================================
if ! command -v npm &> /dev/null; then
  echo -e "${YELLOW}⬇️  Menginstall npm...${NC}"
  apt-get install -y npm &>/dev/null || yum install -y npm &>/dev/null
fi

echo -e "${GREEN}✅ npm: $(npm -v)${NC}"
echo ""

# ============================================================
# DOWNLOAD FILE DARI GITHUB
# ============================================================
echo -e "${YELLOW}📂 Membuat folder: $INSTALL_DIR${NC}"
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

echo -e "${YELLOW}⬇️  Mendownload file dari GitHub...${NC}"

# Download bot.js
echo -e "   → bot.js"
curl -fsSL "$RAW_URL/bot.js" -o bot.js
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Gagal download bot.js!${NC}"
  echo -e "   Pastikan repo sudah public: github.com/$GITHUB_USER/$GITHUB_REPO"
  exit 1
fi

# Download package.json
echo -e "   → package.json"
curl -fsSL "$RAW_URL/package.json" -o package.json
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Gagal download package.json!${NC}"
  exit 1
fi

echo ""

# ============================================================
# INSTALL DEPENDENCIES
# ============================================================
echo -e "${YELLOW}📦 Menginstall dependencies (mineflayer)...${NC}"
npm install --silent
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ npm install gagal!${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Dependencies berhasil diinstall!${NC}"
echo ""

# ============================================================
# SELESAI
# ============================================================
echo -e "${GREEN}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║              ✅ Instalasi Selesai!                       ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo -e "  📁 Lokasi    : ${BOLD}$INSTALL_DIR${NC}"
echo -e "  🚀 Cara run  : ${BOLD}cd ~/minecraft-bot && node bot.js${NC}"
echo ""
echo -e "${CYAN}  Mau langsung jalankan sekarang? (y/n)${NC}"
read -p "  → " RUN_NOW

if [[ "$RUN_NOW" == "y" || "$RUN_NOW" == "Y" ]]; then
  echo ""
  node bot.js
fi
