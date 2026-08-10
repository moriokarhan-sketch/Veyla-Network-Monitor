Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Starting Veyla Network Monitoring System..." -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan

$BaseDir = $PSScriptRoot
Set-Location "$BaseDir\backend"

# 1. Detect Python
$PythonExe = (Get-Command python -ErrorAction SilentlyContinue).Source
if (-not $PythonExe) {
    $PythonExe = (Get-Command py -ErrorAction SilentlyContinue).Source
}

if (-not $PythonExe) {
    if (Test-Path "C:\Program Files\Python312\python.exe") { $PythonExe = "C:\Program Files\Python312\python.exe" }
    elseif (Test-Path "C:\Program Files\Python311\python.exe") { $PythonExe = "C:\Program Files\Python311\python.exe" }
    elseif (Test-Path "C:\Program Files\Python310\python.exe") { $PythonExe = "C:\Program Files\Python310\python.exe" }
    elseif (Test-Path "C:\Python312\python.exe") { $PythonExe = "C:\Python312\python.exe" }
}

if (-not $PythonExe) {
    Write-Host "[ERROR] Python is not installed on this Server!" -ForegroundColor Red
    Write-Host "Please download Python from: https://www.python.org/downloads/" -ForegroundColor Yellow
    Write-Host "IMPORTANT: Check 'Add Python.exe to PATH' during install!" -ForegroundColor Yellow
    Read-Host "Press Enter to exit..."
    exit
}

Write-Host "[OK] Located Python: $PythonExe" -ForegroundColor Green

# 2. Check/recreate virtual environment if invalid
if (Test-Path "venv") {
    $venvPy = "$BaseDir\backend\venv\Scripts\python.exe"
    if (-not (Test-Path $venvPy)) {
        Write-Host "[Fix] Removing invalid virtualenv copied from another PC..." -ForegroundColor Yellow
        Remove-Item -Recurse -Force "venv"
    }
}

if (-not (Test-Path "venv")) {
    Write-Host "[Setup] Creating fresh Python virtual environment..." -ForegroundColor Cyan
    & $PythonExe -m venv venv
    Write-Host "[Setup] Installing required packages..." -ForegroundColor Cyan
    & "$BaseDir\backend\venv\Scripts\python.exe" -m pip install fastapi uvicorn sqlalchemy pydantic pyjwt passlib bcrypt
}

# 3. Start Backend Uvicorn Server
Write-Host "Starting Veyla Server on Port 8000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit -Command `"Set-Location '$BaseDir\backend'; & '$BaseDir\backend\venv\Scripts\python.exe' -m uvicorn app.main:app --host 0.0.0.0 --port 8000`""

Start-Sleep -Seconds 3

# 4. Open Web Panel
Write-Host "Opening Veyla Web Panel at http://localhost:8000 ..." -ForegroundColor Cyan
Start-Process "http://localhost:8000"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Veyla Network Monitoring System is RUNNING!" -ForegroundColor Green
Write-Host "  Web UI: http://localhost:8000" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan
