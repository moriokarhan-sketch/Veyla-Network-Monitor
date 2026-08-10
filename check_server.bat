@echo off
setlocal EnableDelayedExpansion
title Veyla Server Diagnostic Tool
echo ========================================================
echo   Veyla Server System Diagnostic Tool
echo ========================================================
echo.

set "BASE_DIR=%~dp0"
cd /d "%BASE_DIR%backend"

:: 1. Auto-detect Python Executable (py -3, python, or AppData/ProgramFiles)
set "PY_EXE="

py -3 --version >nul 2>nul
if !errorlevel! equ 0 (
    set "PY_EXE=py -3"
)

if "!PY_EXE!"=="" (
    python --version 2>&1 | findstr /i "Python 3" >nul
    if !errorlevel! equ 0 set "PY_EXE=python"
)

if "!PY_EXE!"=="" (
    for /d %%D in ("%LOCALAPPDATA%\Programs\Python\Python3*" "C:\Program Files\Python3*" "C:\Python3*") do (
        if exist "%%D\python.exe" set "PY_EXE=%%D\python.exe"
    )
)

if "!PY_EXE!"=="" (
    echo.
    echo ========================================================
    echo   [ERROR] Python is NOT installed on this Server!
    echo ========================================================
    echo.
    echo Please download and install Python (3.10 or newer) from:
    echo https://www.python.org/downloads/
    echo.
    echo * IMPORTANT: Check the box "Add Python.exe to PATH"
    echo.
    pause
    exit /b 1
)

echo [OK] Located Python: !PY_EXE!
!PY_EXE! --version

echo.
echo [Step 2] Testing/Setting up Virtual Environment...
if exist "venv" (
    ".\venv\Scripts\python.exe" --version >nul 2>nul
    if !errorlevel! neq 0 (
        echo [Fix] Removing old venv copied from another PC...
        rmdir /s /q "venv"
    )
)

if not exist "venv" (
    echo [Fix] Creating fresh venv environment...
    !PY_EXE! -m venv venv
    if !errorlevel! neq 0 (
        echo [ERROR] Could not create venv environment.
        pause
        exit /b 1
    )
)

echo.
echo [Step 3] Installing backend dependencies...
call .\venv\Scripts\activate.bat
pip install fastapi uvicorn sqlalchemy pydantic pyjwt passlib bcrypt

echo.
echo [Step 4] Starting Veyla Server on http://localhost:8000 ...
echo (Keep this window open!)
echo.
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000

echo.
pause
