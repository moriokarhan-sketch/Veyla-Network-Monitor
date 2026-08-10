Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force

Write-Host '========================================================' -ForegroundColor Cyan
Write-Host '  Starting Veyla Network Monitoring System...' -ForegroundColor Green
Write-Host '========================================================' -ForegroundColor Cyan

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
        Write-Host '[Fix] Purging old virtualenv copied from developer PC...' -ForegroundColor Yellow
        Remove-Item -Recurse -Force "venv" -ErrorAction SilentlyContinue
    }
}

# 2. Locate REAL Python executable
$PythonExe = $null

$pyCmd = (Get-Command py -ErrorAction SilentlyContinue).Source
if ($pyCmd) {
    $PythonExe = 'py -3'
}

if (-not $PythonExe) {
    $pathPy = Get-Command python -ErrorAction SilentlyContinue | Where-Object { $_.Source -notlike "*WindowsApps*" }
    if ($pathPy) {
        $PythonExe = $pathPy.Source
    }
}

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
            $PythonExe = $p
            break
        }
    }
}

if (-not $PythonExe) {
    Write-Host ''
    Write-Host '========================================================' -ForegroundColor Red
    Write-Host '  [ERROR] Real Python is NOT installed on this Server!' -ForegroundColor Red
    Write-Host '========================================================' -ForegroundColor Red
    Write-Host ''
    Write-Host 'The system detected an empty Windows Store placeholder.' -ForegroundColor Yellow
    Write-Host ''
    $ans = Read-Host 'Would you like to Auto-Download and Install Python 3.12 now? (Y/N)'
    if ($ans -eq 'Y' -or $ans -eq 'y') {
        Write-Host 'Downloading Python 3.12 Installer from python.org...' -ForegroundColor Cyan
        $installerPath = "$env:TEMP\python-installer.exe"
        try {
            [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
            Invoke-WebRequest -Uri 'https://www.python.org/ftp/python/3.12.4/python-3.12.4-amd64.exe' -OutFile $installerPath
            Write-Host 'Installing Python 3.12 with PATH enabled...' -ForegroundColor Green
            Start-Process $installerPath -ArgumentList '/quiet InstallAllUsers=1 PrependPath=1' -Wait
            Write-Host '[OK] Python 3.12 installed successfully!' -ForegroundColor Green
            $PythonExe = 'C:\Program Files\Python312\python.exe'
        } catch {
            Write-Host '[ERROR] Auto download failed. Please download Python manually from:' -ForegroundColor Red
            Write-Host '  https://www.python.org/downloads/' -ForegroundColor Cyan
            Write-Host 'IMPORTANT: Check the box Add Python.exe to PATH' -ForegroundColor Yellow
            Read-Host 'Press Enter to exit...'
            exit
        }
    } else {
        Write-Host 'Please download and install Python manually from:' -ForegroundColor Yellow
        Write-Host '  https://www.python.org/downloads/' -ForegroundColor Cyan
        Write-Host 'IMPORTANT: Check the box Add Python.exe to PATH' -ForegroundColor Yellow
        Read-Host 'Press Enter to exit...'
        exit
    }
}

Write-Host "[OK] Located Real Python: $PythonExe" -ForegroundColor Green

# 3. Create fresh venv on Server if missing
if (-not (Test-Path "venv")) {
    Write-Host '[Setup] Creating fresh Python virtual environment on Server...' -ForegroundColor Cyan
    if ($PythonExe -eq 'py -3') {
        py -3 -m venv venv
    } else {
        & $PythonExe -m venv venv
    }
    
    if (-not (Test-Path "$BaseDir\backend\venv\Scripts\python.exe")) {
        Write-Host '[ERROR] Failed to create virtual environment.' -ForegroundColor Red
        Read-Host 'Press Enter to exit...'
        exit
    }
    
    Write-Host '[Setup] Installing required backend packages...' -ForegroundColor Cyan
    & "$BaseDir\backend\venv\Scripts\python.exe" -m pip install -r "$BaseDir\backend\requirements.txt"
    & "$BaseDir\backend\venv\Scripts\python.exe" -m pip install pydantic-settings python-jose cryptography requests python-multipart pysnmp-lextudio
}

# 4. Start Backend Uvicorn Server
Write-Host 'Starting Veyla Server on Port 8000...' -ForegroundColor Green
$venvPython = "$BaseDir\backend\venv\Scripts\python.exe"
Start-Process powershell -ArgumentList "-NoExit -Command `"Set-Location '$BaseDir\backend'; & '$venvPython' -m uvicorn app.main:app --host 0.0.0.0 --port 8000`""

Start-Sleep -Seconds 4

# 5. Open Web Panel
Write-Host 'Opening Veyla Web Panel at http://localhost:8000 ...' -ForegroundColor Cyan
Start-Process 'http://localhost:8000'

Write-Host '========================================================' -ForegroundColor Cyan
Write-Host '  Veyla Network Monitoring System is RUNNING!' -ForegroundColor Green
Write-Host '  Web UI: http://localhost:8000' -ForegroundColor Yellow
Write-Host '========================================================' -ForegroundColor Cyan
