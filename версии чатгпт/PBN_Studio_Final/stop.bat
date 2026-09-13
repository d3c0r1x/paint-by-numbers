@echo off
setlocal
if "%PBN_PORT%"=="" set "PBN_PORT=4173"
for /f "tokens=5" %%p in ('netstat -aon ^| findstr ":%PBN_PORT%" ^| findstr LISTENING') do taskkill /PID %%p /F >nul 2>&1
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_Process | Where-Object {$_.CommandLine -like '*server.mjs*PBN_PORT=%PBN_PORT%*' -or $_.CommandLine -like '*server.mjs*'} | ForEach-Object { if ($_.ProcessId -ne $PID) { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue } }"
echo Paint by Numbers Studio server stopped on port %PBN_PORT%.
endlocal
pause
