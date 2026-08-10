@echo off
setlocal EnableDelayedExpansion
title Veyla Network Monitor Starter
echo ========================================================
echo   Starting Veyla Network Monitoring System...
echo ========================================================

set "BASE_DIR=%~dp0"
cd /d "%BASE_DIR%backend"

:: 1. Verify Python Installation
python --version >nul 2>nul
if !errorlevel! neq 0 (
    echo.
    echo ========================================================
    echo   [ERROR] Python is NOT installed on this Server!
    echo ========================================================
    echo.
    echo Please download and install Python (3.10 or newer) from:
    echo https://www.python.org/downloads/
    echo.
    echo * IMPORTANT: Check the box "Add Python.exe to PATH"
    echo   during installation!
    echo.
    echo ========================================================
    pause
    exit /b 1
)

echo [OK] Python is detected on this computer.

:: 2. Clean invalid venv if copied from another PC
if exist "venv" (
    "%BASE_DIR%backend\venv\Scripts\python.exe" --version >nul 2>nul
    if !errorlevel! neq 0 (
        echo [Fix] Removing virtual environment copied from another PC...
        rmdir /s /q "venv"
    )
)

:: 3. Create fresh venv and install packages if needed
if not exist "venv" (
    echo [Setup] Creating fresh Python virtual environment on this Server...
    python -m venv venv
    if !errorlevel! neq 0 (
        echo [ERROR] Failed to create Python virtual environment.
        pause
        exit /b 1
    )
    call .\venv\Scripts\activate.bat
    echo [Setup] Installing required libraries (FastAPI, Uvicorn, SQLAlchemy)...
    pip install -r requirements.txt
)

:: 4. Start Veyla Server on Port 8000
echo Starting Veyla Server on Port 8000...
start "Veyla Server" cmd /k "cd /d "%BASE_DIR%backend" && call .\venv\Scripts\activate.bat && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"

:: 5. Wait 3 seconds for server to start
timeout /t 3 >nul

:: 6. Open Browser
echo Opening Veyla Web Panel at http://localhost:8000 ...
start http://localhost:8000

echo.
echo ========================================================
echo   Veyla Network Monitoring System is RUNNING!
echo   * Web UI: http://localhost:8000
echo   * Keep the "Veyla Server" window open in background.
echo ========================================================
echo.
pause
