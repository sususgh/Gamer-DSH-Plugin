#!/usr/bin/env bash
set -euo pipefail
DEFAULT_PORT=8765
read -r -p "Gamer desktop port [${DEFAULT_PORT}]: " GAMER_PORT
GAMER_PORT="${GAMER_PORT:-$DEFAULT_PORT}"
if ! [[ "$GAMER_PORT" =~ ^[0-9]+$ ]] || (( GAMER_PORT < 1 || GAMER_PORT > 65535 )); then
  echo "Invalid port. Enter an integer from 1 to 65535."
  exit 1
fi
cd "$(dirname "$0")/desktop-runtime"
if [[ ! -d node_modules/qrcode ]]; then
  echo "Installing desktop runtime dependencies..."
  npm install
fi
export GAMER_PORT
echo "Starting Gamer desktop service on port $GAMER_PORT..."
echo "Keep this terminal open while using the DSH plugin."
npm start
