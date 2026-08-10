@echo off
setlocal EnableDelayedExpansion
title Veyla Server Diagnostic Tool
echo ========================================================
echo   Veyla Server System Diagnostic Tool
echo ========================================================
echo.

set "BASE_DIR=%~dp0"
cd /d "%BASE_DIR%backend"

echo [Step 1] Checking Python installation...
python --version
if !errorlevel! neq 0 (
    echo.
    echo [ERROR] 'python' command is not recognized in Windows CMD!
    echo.
    echo Solution:
    echo 1. Please RESTART your computer once after installing Python.
    echo 2. Or ensure 'Add Python.exe to PATH' was checked during Python setup.
    echo.
    pause
    exit /b 1
)

echo.
echo [Step 2] Checking virtual environment...
if exist "venv" (
    ".\venv\Scripts\python.exe" --version >nul 2>nul
    if !errorlevel! neq 0 (
        echo [Fix] Cleaning old venv directory...
        rmdir /s /q "venv"
    )
)

if not exist "venv" (
    echo [Fix] Creating fresh venv environment...
    python -m venv venv
    if !errorlevel! neq 0 (
        echo [ERROR] Could not create venv environment.
        pause
        exit /b 1
    )
)

echo.
echo [Step 3] Installing backend packages...
call .\venv\Scripts\activate.bat
pip install fastapi uvicorn sqlalchemy pydantic pyjwt passlib bcrypt

echo.
echo [Step 4] Starting Veyla Server on http://localhost:8000 ...
echo (Keep this window open!)
echo.
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000

echo.
pause
