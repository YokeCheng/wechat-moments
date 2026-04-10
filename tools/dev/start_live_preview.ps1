param(
    [string]$FrontendHost = "127.0.0.1",
    [int]$FrontendPort = 3000,
    [string]$BackendHost = "127.0.0.1",
    [int]$BackendPort = 8000,
    [switch]$Restart
)

$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\\..")).Path
$RuntimeDir = Join-Path $RepoRoot ".runtime"
$LogDir = Join-Path $RuntimeDir "logs"
$PidDir = Join-Path $RuntimeDir "pids"

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
New-Item -ItemType Directory -Force -Path $PidDir | Out-Null

function Get-ManagedProcess {
    param([string]$Name)

    $PidFile = Join-Path $PidDir "$Name.pid"
    if (-not (Test-Path -LiteralPath $PidFile)) {
        return $null
    }

    $PidValue = (Get-Content -LiteralPath $PidFile -ErrorAction SilentlyContinue | Select-Object -First 1).Trim()
    if (-not $PidValue) {
        return $null
    }

    $Process = Get-Process -Id $PidValue -ErrorAction SilentlyContinue
    if (-not $Process) {
        Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue
        return $null
    }

    return $Process
}

function Stop-ManagedProcess {
    param([string]$Name)

    $PidFile = Join-Path $PidDir "$Name.pid"
    $Process = Get-ManagedProcess -Name $Name
    if ($Process) {
        Stop-Process -Id $Process.Id -Force -ErrorAction SilentlyContinue
    }
    Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue
}

if ($Restart) {
    Stop-ManagedProcess -Name "backend-live"
    Stop-ManagedProcess -Name "frontend-live"
}

$BackendProcess = Get-ManagedProcess -Name "backend-live"
if (-not $BackendProcess) {
    $BackendLog = Join-Path $LogDir "backend-live.log"
    $BackendErr = Join-Path $LogDir "backend-live.err.log"
    $BackendProcess = Start-Process -FilePath "python" `
        -ArgumentList "-m", "uvicorn", "app.main:app", "--host", $BackendHost, "--port", "$BackendPort" `
        -WorkingDirectory (Join-Path $RepoRoot "backend") `
        -RedirectStandardOutput $BackendLog `
        -RedirectStandardError $BackendErr `
        -PassThru
    Set-Content -LiteralPath (Join-Path $PidDir "backend-live.pid") -Value $BackendProcess.Id
}

$FrontendProcess = Get-ManagedProcess -Name "frontend-live"
if (-not $FrontendProcess) {
    $FrontendLog = Join-Path $LogDir "frontend-live.log"
    $FrontendErr = Join-Path $LogDir "frontend-live.err.log"
    $Command = @"
Set-Location '$($RepoRoot.Replace("'", "''"))\\frontend'
npm run dev -- --host $FrontendHost --port $FrontendPort
"@
    $FrontendProcess = Start-Process -FilePath "powershell.exe" `
        -ArgumentList "-NoLogo", "-NoProfile", "-Command", $Command `
        -WorkingDirectory (Join-Path $RepoRoot "frontend") `
        -RedirectStandardOutput $FrontendLog `
        -RedirectStandardError $FrontendErr `
        -PassThru
    Set-Content -LiteralPath (Join-Path $PidDir "frontend-live.pid") -Value $FrontendProcess.Id
}

Write-Output "Frontend live preview: http://$FrontendHost`:$FrontendPort"
Write-Output "Backend health: http://$BackendHost`:$BackendPort/health"
Write-Output "Logs: $LogDir"
