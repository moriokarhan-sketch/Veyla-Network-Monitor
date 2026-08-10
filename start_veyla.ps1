Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Starting Veyla Network Monitoring System..." -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan

$BaseDir = $PSScriptRoot
Set-Location "$BaseDir\backend"

# 1. Force remove old developer venv if copied from another PC
if (Test-Path "venv") {
    $cfgFile = "$BaseDir\backend\venv\pyvenv.cfg"
    $isInvalid = $true
    if (Test-Path $cfgFile) {
        $cfgText = Get-Content $cfgFile -Raw
        if ($cfgText -notlike "*boboh*" -and (Test-Path "$BaseDir\backend\venv\Scripts\python.exe")) {
            $isInvalid = $false
        }
    }
    if ($isInvalid) {
        Write-Host "[Fix] Removing invalid virtualenv copied from developer PC..." -ForegroundColor Yellow
        Remove-Item -Recurse -Force "venv" -ErrorAction SilentlyContinue
    }
}

# 2. Detect Python
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

# 3. Create fresh venv if missing
if (-not (Test-Path "venv")) {
    Write-Host "[Setup] Creating fresh Python virtual environment on Server..." -ForegroundColor Cyan
    & $PythonExe -m venv venv
    Write-Host "[Setup] Installing required packages (FastAPI, Uvicorn, SQLAlchemy)..." -ForegroundColor Cyan
    & "$BaseDir\backend\venv\Scripts\python.exe" -m pip install fastapi uvicorn sqlalchemy pydantic pyjwt passlib bcrypt
}

# 4. Start Backend Uvicorn Server
Write-Host "Starting Veyla Server on Port 8000..." -ForegroundColor Green
$venvPython = "$BaseDir\backend\venv\Scripts\python.exe"
Start-Process powershell -ArgumentList "-NoExit -Command `"Set-Location '$BaseDir\backend'; & '$venvPython' -m uvicorn app.main:app --host 0.0.0.0 --port 8000`""

Start-Sleep -Seconds 4

# 5. Open Web Panel
Write-Host "Opening Veyla Web Panel at http://localhost:8000 ..." -ForegroundColor Cyan
Start-Process "http://localhost:8000"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Veyla Network Monitoring System is RUNNING!" -ForegroundColor Green
Write-Host "  Web UI: http://localhost:8000" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan
