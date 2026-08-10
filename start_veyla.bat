@echo off
title Veyla Network Monitor Starter
echo ========================================================
echo   Starting Veyla Network Monitoring System...
echo ========================================================

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start_veyla.ps1"

pause
