@echo off
setlocal
title Gamer Desktop Pairing Service
echo ==========================================
echo   Gamer Desktop - QR Pairing Service
echo ==========================================
set "GAMER_PORT=8765"
set /p "GAMER_PORT=Enter port (1-65535) [8765]: "
if "%GAMER_PORT%"=="" set "GAMER_PORT=8765"
powershell -NoProfile -Command "if ([int]::TryParse('%GAMER_PORT%', [ref]$p) -and $p -ge 1 -and $p -le 65535) { exit 0 } else { exit 1 }"
if errorlevel 1 (
  echo Invalid port. Please enter a number from 1 to 65535.
  pause
  exit /b 1
)
cd /d "%~dp0desktop-runtime"
if not exist "node_modules\qrcode" (
  echo Installing desktop runtime dependencies...
  call npm install
  if errorlevel 1 (
    echo Dependency installation failed.
    pause
    exit /b 1
  )
)
set "GAMER_PORT=%GAMER_PORT%"
echo Starting Gamer on port %GAMER_PORT%...
echo Keep this window open while using the DSH plugin.
call npm start
pause
