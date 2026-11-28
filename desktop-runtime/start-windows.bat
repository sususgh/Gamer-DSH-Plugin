@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo [Gamer] Node.js 22.13+ is required. Install it from https://nodejs.org/
  pause
  exit /b 1
)
node -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)"
if errorlevel 1 (
  echo [Gamer] Please upgrade Node.js to 22.13 or newer.
  pause
  exit /b 1
)
if not exist "node_modules\qrcode" (
  echo [Gamer] Installing desktop QR dependencies...
  npm install --no-audit --no-fund
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
echo [Gamer] Starting desktop pairing service...
npm start
pause
