@echo off
title Veyla Network Monitor Starter
echo ========================================================
echo   Starting Veyla Network Monitoring System...
echo ========================================================

set BASE_DIR=%~dp0

:: 1. Check Python venv in backend
if not exist "%BASE_DIR%backend\venv" (
    echo [Setup] Creating Python virtual environment...
    cd /d "%BASE_DIR%backend"
    python -m venv venv
    call .\venv\Scripts\activate.bat
    pip install -r requirements.txt
)

:: 2. Start Backend (Serves API + Web UI on Port 8000)
echo Starting Veyla Server on Port 8000...
start "Veyla Server" cmd /k "cd /d %BASE_DIR%backend && .\venv\Scripts\activate.bat && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"

:: 3. Try starting Frontend Dev Server if node_modules exists
if exist "%BASE_DIR%frontend\node_modules" (
    echo Starting Frontend Dev Server on Port 3000...
    start "Veyla Dev UI" cmd /k "cd /d %BASE_DIR%frontend && npm.cmd run dev"
)

:: 4. Wait 4 seconds for server initialization
timeout /t 4 >nul

:: 5. Open Browser to Port 8000 (Standalone Production App)
echo Opening Veyla Web Panel...
start http://localhost:8000

echo ========================================================
echo   Veyla Network Monitoring System is RUNNING!
echo   * Access Web UI at: http://localhost:8000
echo ========================================================
timeout /t 5
exit
