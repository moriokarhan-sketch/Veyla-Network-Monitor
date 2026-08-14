Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force

Write-Host '========================================================' -ForegroundColor Cyan
Write-Host '  Starting Veyla Network Monitoring System...' -ForegroundColor Green
Write-Host '========================================================' -ForegroundColor Cyan

$BaseDir = $PSScriptRoot
Set-Location "$BaseDir\backend"

# 1. Force remove old developer venv if copied from another PC or corrupted
if (Test-Path "venv") {
    $cfgFile = "$BaseDir\backend\venv\pyvenv.cfg"
    $isInvalid = $true
    if (Test-Path $cfgFile) {
        $cfgText = Get-Content $cfgFile -Raw
        if ($cfgText -notlike "*boboh*" -and (Test-Path "$BaseDir\backend\venv\Scripts\python.exe")) {
            # Check if python in venv actually runs
            $testRun = & "$BaseDir\backend\venv\Scripts\python.exe" -c "print('OK')" 2>$null
            if ($testRun -eq 'OK') {
                $isInvalid = $false
            }
        }
    }
    if ($isInvalid) {
        Write-Host '[Fix] Purging invalid or copied virtualenv...' -ForegroundColor Yellow
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
        "$env:LocalAppData\Programs\Python\Python313\python.exe",
        "C:\Program Files\Python312\python.exe",
        "C:\Program Files\Python311\python.exe",
        "C:\Program Files\Python310\python.exe",
        "C:\Program Files\Python313\python.exe",
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
            Write-Host 'IMPORTANT: Check the box "Add Python.exe to PATH"' -ForegroundColor Yellow
            Read-Host 'Press Enter to exit...'
            exit
        }
    } else {
        Write-Host 'Please download and install Python manually from:' -ForegroundColor Yellow
        Write-Host '  https://www.python.org/downloads/' -ForegroundColor Cyan
        Write-Host 'IMPORTANT: Check the box "Add Python.exe to PATH"' -ForegroundColor Yellow
        Read-Host 'Press Enter to exit...'
        exit
    }
}

Write-Host "[OK] Located Real Python: $PythonExe" -ForegroundColor Green

# 3. Create fresh venv on Server if missing
$venvPython = "$BaseDir\backend\venv\Scripts\python.exe"
if (-not (Test-Path "venv")) {
    Write-Host '[Setup] Creating fresh Python virtual environment on Server...' -ForegroundColor Cyan
    if ($PythonExe -eq 'py -3') {
        py -3 -m venv venv
    } else {
        & $PythonExe -m venv venv
    }
    
    if (-not (Test-Path $venvPython)) {
        Write-Host '[ERROR] Failed to create virtual environment.' -ForegroundColor Red
        Read-Host 'Press Enter to exit...'
        exit
    }
}

# 4. Ensure pip/wheel are upgraded and install pre-compiled binary packages
Write-Host '[Setup] Upgrading pip to ensure binary wheel support...' -ForegroundColor Cyan
& "$venvPython" -m pip install --upgrade pip setuptools wheel --no-warn-script-location --quiet

Write-Host '[Setup] Installing/Verifying backend dependencies (using pre-compiled binary packages)...' -ForegroundColor Cyan
& "$venvPython" -m pip install --prefer-binary -r "$BaseDir\backend\requirements.txt" --no-warn-script-location

# Verify critical imports
$verifyOk = $false
try {
    $testResult = & "$venvPython" -c "import fastapi, uvicorn, sqlalchemy, pydantic, pydantic_settings, jose, bcrypt; print('ALL_MODULES_OK')" 2>$null
    if ($testResult -like "*ALL_MODULES_OK*") {
        $verifyOk = $true
    }
} catch {}

if (-not $verifyOk) {
    Write-Host '[Warning] Retrying binary installation for missing modules...' -ForegroundColor Yellow
    & "$venvPython" -m pip install --prefer-binary fastapi uvicorn sqlalchemy "pydantic>=2.7.0" pydantic-settings python-jose cryptography requests python-multipart pysnmp-lextudio bcrypt --no-warn-script-location
}

Write-Host '[OK] Backend dependencies verified successfully.' -ForegroundColor Green

# 5. Start Backend Uvicorn Server
Write-Host 'Starting Veyla Server on Port 8000...' -ForegroundColor Green

# Kill any lingering process on port 8000 first
try {
    $portUsers = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
    if ($portUsers) {
        foreach ($conn in $portUsers) {
            Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
        }
    }
} catch {}

Start-Process powershell -ArgumentList "-NoExit -Command `"Set-Location '$BaseDir\backend'; Write-Host 'Veyla Backend API Server Running on Port 8000...' -ForegroundColor Green; & '$venvPython' -m uvicorn app.main:app --host 0.0.0.0 --port 8000`""

# 6. Wait for Server to be ready before opening browser (poll up to 15 seconds)
Write-Host 'Waiting for Veyla Server to initialize...' -ForegroundColor Cyan
$serverReady = $false
for ($i = 1; $i -le 15; $i++) {
    Start-Sleep -Seconds 1
    try {
        $res = Invoke-WebRequest -Uri 'http://localhost:8000/api/devices' -Method GET -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
        if ($res -and ($res.StatusCode -eq 200 -or $res.StatusCode -eq 401)) {
            $serverReady = $true
            break
        }
    } catch {
        # Check if root responds
        try {
            $res2 = Invoke-WebRequest -Uri 'http://localhost:8000' -Method GET -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
            if ($res2 -and $res2.StatusCode -eq 200) {
                $serverReady = $true
                break
            }
        } catch {}
    }
}

if ($serverReady) {
    Write-Host '[OK] Veyla Server is responding!' -ForegroundColor Green
    Write-Host 'Opening Veyla Web Panel at http://localhost:8000 ...' -ForegroundColor Cyan
    Start-Process 'http://localhost:8000'
} else {
    Write-Host '[Notice] Opening browser at http://localhost:8000 ...' -ForegroundColor Yellow
    Start-Process 'http://localhost:8000'
}

Write-Host '========================================================' -ForegroundColor Cyan
Write-Host '  Veyla Network Monitoring System is RUNNING!' -ForegroundColor Green
Write-Host '  Web UI: http://localhost:8000' -ForegroundColor Yellow
Write-Host '========================================================' -ForegroundColor Cyan
