@echo off
title Veyla Network Monitor Starter
echo ========================================================
echo   Starting Veyla Network Monitoring System...
echo ========================================================

set BASE_DIR=%~dp0
cd /d "%BASE_DIR%backend"

:: 1. Find Python executable on Server
set PY_CMD=python
where python >nul 2>nul
if %errorlevel% neq 0 (
    if exist "C:\Python310\python.exe" set PY_CMD="C:\Python310\python.exe"
    if exist "C:\Python311\python.exe" set PY_CMD="C:\Python311\python.exe"
    if exist "C:\Python312\python.exe" set PY_CMD="C:\Python312\python.exe"
)

:: 2. Check if venv was copied from another PC (invalid paths)
if exist "venv" (
    "%BASE_DIR%backend\venv\Scripts\python.exe" --version >nul 2>nul
    if %errorlevel% neq 0 (
        echo [Fix] Cleaning up virtual environment copied from another PC...
        rmdir /s /q "venv"
    )
)

:: 3. Create fresh venv and install packages if missing
if not exist "venv" (
    echo [Setup] Creating fresh Python virtual environment...
    %PY_CMD% -m venv venv
    call .\venv\Scripts\activate.bat
    echo [Setup] Installing required packages (fastapi, uvicorn, sqlalchemy)...
    pip install -r requirements.txt
)

:: 4. Start Veyla Server on Port 8000 (API + Built Web UI)
echo Starting Veyla Server on Port 8000...
start "Veyla Server" cmd /k "cd /d %BASE_DIR%backend && .\venv\Scripts\activate.bat && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"

:: 5. Try starting Frontend Dev Server if node_modules exists
if exist "%BASE_DIR%frontend\node_modules" (
    echo Starting Frontend Dev Server on Port 3000...
    start "Veyla Dev UI" cmd /k "cd /d %BASE_DIR%frontend && npm.cmd run dev"
)

:: 6. Wait 5 seconds for server initialization
timeout /t 5 >nul

:: 7. Open Browser to Port 8000 (Standalone Production App)
echo Opening Veyla Web Panel at http://localhost:8000 ...
start http://localhost:8000

echo ========================================================
echo   Veyla Network Monitoring System is RUNNING!
echo   * Access Web UI at: http://localhost:8000
echo   * Keep the "Veyla Server" window open in background.
echo ========================================================
timeout /t 10
exit
