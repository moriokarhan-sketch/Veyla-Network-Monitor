Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Starting Veyla Network Monitoring System..." -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan

$BaseDir = $PSScriptRoot
Set-Location "$BaseDir\backend"

# 1. Force remove old invalid venv if it failed to create python.exe
if (Test-Path "venv") {
    if (-not (Test-Path "$BaseDir\backend\venv\Scripts\python.exe")) {
        Write-Host "[Fix] Removing incomplete virtualenv..." -ForegroundColor Yellow
        Remove-Item -Recurse -Force "venv" -ErrorAction SilentlyContinue
    }
}

# 2. Locate REAL Python executable (Excluding fake WindowsApps stub!)
$PythonExe = $null

# Check py launcher first
$pyCmd = (Get-Command py -ErrorAction SilentlyContinue).Source
if ($pyCmd) {
    $PythonExe = "py -3"
}

# Check real python.exe in PATH (excluding WindowsApps stub)
if (-not $PythonExe) {
    $pathPy = Get-Command python -ErrorAction SilentlyContinue | Where-Object { $_.Source -notlike "*WindowsApps*" }
    if ($pathPy) {
        $PythonExe = $pathPy.Source
    }
}

# Check standard installation directories
if (-not $PythonExe) {
    $searchPaths = @(
        "$env:LocalAppData\Programs\Python\Python312\python.exe",
        "$env:LocalAppData\Programs\Python\Python311\python.exe",
        "$env:LocalAppData\Programs\Python\Python310\python.exe",
        "C:\Program Files\Python312\python.exe",
        "C:\Program Files\Python311\python.exe",
        "C:\Program Files\Python310\python.exe",
        "C:\Python312\python.exe",
        "C:\Python311\python.exe",
        "C:\Python310\python.exe"
    )
    foreach ($p in $searchPaths) {
        if (Test-Path $p) {
            $PythonExe = "`"$p`""
            break
        }
    }
}

if (-not $PythonExe) {
    Write-Host ""
    Write-Host "========================================================" -ForegroundColor Red
    Write-Host "  [ERROR] Real Python is NOT installed on this Server!" -ForegroundColor Red
    Write-Host "========================================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "The 'python' found was Microsoft Store empty stub." -ForegroundColor Yellow
    Write-Host "Please download REAL Python from:" -ForegroundColor Yellow
    Write-Host "  👉 https://www.python.org/downloads/" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "* IMPORTANT during installation:" -ForegroundColor Yellow
    Write-Host "  Check the box '[✓] Add Python.exe to PATH' at bottom!" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit..."
    exit
}

Write-Host "[OK] Located Real Python: $PythonExe" -ForegroundColor Green

# 3. Create fresh venv if missing
if (-not (Test-Path "venv")) {
    Write-Host "[Setup] Creating fresh Python virtual environment on Server..." -ForegroundColor Cyan
    if ($PythonExe -eq "py -3") {
        py -3 -m venv venv
    } else {
        Invoke-Expression "$PythonExe -m venv venv"
    }
    
    if (-not (Test-Path "$BaseDir\backend\venv\Scripts\python.exe")) {
        Write-Host "[ERROR] Failed to create virtual environment." -ForegroundColor Red
        Read-Host "Press Enter to exit..."
        exit
    }
    
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
