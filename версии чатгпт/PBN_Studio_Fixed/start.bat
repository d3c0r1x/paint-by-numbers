@echo off
setlocal EnableExtensions
cd /d "%~dp0"
set "PBN_PORT=%PBN_PORT%"
if "%PBN_PORT%"=="" set "PBN_PORT=4173"
set "PBN_HOST=127.0.0.1"

echo.
echo  Paint by Numbers Studio
 echo ==========================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js 22 or newer is required.
  echo Download it from https://nodejs.org/
  pause
  exit /b 1
)

for /f "tokens=1 delims=v" %%v in ('node -v') do set NODEVER=%%v
node -e "const m=process.versions.node.split('.')[0]; if(+m<22) process.exit(1)"
if errorlevel 1 (
  echo ERROR: Node.js 22 or newer is required. Found:
  node -v
  pause
  exit /b 1
)

if not exist data mkdir data
if not exist data\uploads mkdir data\uploads
if not exist data\generated mkdir data\generated

rem This build has zero third-party runtime dependencies. SQLite is provided by Node 22+.
echo Starting local SQLite-backed server on http://127.0.0.1:%PBN_PORT% ...
start "PBN Studio Server" /min cmd /c "set PBN_PORT=%PBN_PORT%&&set PBN_HOST=127.0.0.1&&node server.mjs"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$url='http://127.0.0.1:%PBN_PORT%/api/health'; $ok=$false; for($i=0;$i -lt 40;$i++){ try { $r=Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 2; if($r.StatusCode -eq 200){$ok=$true;break} } catch {}; Start-Sleep -Milliseconds 250 }; if($ok){ Start-Process ('http://127.0.0.1:%PBN_PORT%/?demo=1') } else { Write-Host 'Server did not become ready.' -ForegroundColor Red; exit 1 }"
if errorlevel 1 (
  echo.
  echo Failed to start the Studio server.
  pause
  exit /b 1
)

echo.
echo Studio is running. Close this window to leave the server running.
echo To stop it, run stop.bat.
endlocal
