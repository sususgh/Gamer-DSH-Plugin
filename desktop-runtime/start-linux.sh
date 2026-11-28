#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
command -v node >/dev/null 2>&1 || { echo "[Gamer] Node.js 22.13+ is required."; exit 1; }
node -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)" || { echo "[Gamer] Please upgrade Node.js to 22.13 or newer."; exit 1; }
if [[ ! -d node_modules/qrcode ]]; then
  echo "[Gamer] Installing desktop QR dependencies..."
  npm install --no-audit --no-fund
fi
echo "[Gamer] Starting desktop pairing service..."
npm start
