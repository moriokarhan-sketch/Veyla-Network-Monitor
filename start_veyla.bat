@echo off
title Veyla Network Monitor Starter
echo ========================================================
echo   Starting Veyla Network Monitoring System...
echo ========================================================

:: Get current directory
set BASE_DIR=%~dp0

:: 1. Start Backend in a new terminal window
echo Starting Backend Server (Port 8000)...
start "Veyla Backend API" cmd /c "cd /d %BASE_DIR%backend && powershell -Command \"Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force; .\venv\Scripts\activate; python -m uvicorn app.main:app --reload --port 8000\""

:: 2. Start Frontend in a new terminal window
echo Starting Frontend Web UI (Port 3000)...
start "Veyla Frontend UI" cmd /c "cd /d %BASE_DIR%frontend && npm.cmd run dev"

:: 3. Wait a moment for servers to spin up
echo Waiting for servers to initialize...
timeout /t 5 >nul

:: 4. Automatically open default web browser
echo Opening Veyla Web Panel in browser...
start http://localhost:3000

echo ========================================================
echo   Veyla Network Monitoring System started!
echo   * Keep the other terminal windows open to keep running.
echo ========================================================
timeout /t 10
exit
