param(
    [string]$FrontendHost = "127.0.0.1",
    [int]$FrontendPort = 3000,
    [string]$BackendHost = "127.0.0.1",
    [int]$BackendPort = 8000,
    [switch]$Restart,
    [switch]$OpenBrowser
)

$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\\..")).Path
$RuntimeDir = Join-Path $RepoRoot ".runtime"
$LogDir = Join-Path $RuntimeDir "logs"
$PidDir = Join-Path $RuntimeDir "pids"

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
New-Item -ItemType Directory -Force -Path $PidDir | Out-Null

$PythonExe = (Get-Command python -ErrorAction Stop).Source
$NpmExe = (Get-Command npm.cmd -ErrorAction Stop).Source

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
    $BackendProcess = Start-Process -FilePath $PythonExe `
        -ArgumentList "-m", "uvicorn", "app.main:app", "--reload", "--host", $BackendHost, "--port", "$BackendPort" `
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
    $FrontendProcess = Start-Process -FilePath $NpmExe `
        -ArgumentList "run", "dev", "--", "--host", $FrontendHost, "--port", "$FrontendPort" `
        -WorkingDirectory (Join-Path $RepoRoot "frontend") `
        -RedirectStandardOutput $FrontendLog `
        -RedirectStandardError $FrontendErr `
        -PassThru
    Set-Content -LiteralPath (Join-Path $PidDir "frontend-live.pid") -Value $FrontendProcess.Id
}

$FrontendUrl = "http://$FrontendHost`:$FrontendPort"
$BackendHealthUrl = "http://$BackendHost`:$BackendPort/health"

function Wait-HttpReady {
    param(
        [string]$Url,
        [string]$Name
    )

    for ($i = 0; $i -lt 40; $i++) {
        Start-Sleep -Milliseconds 500
        try {
            $Response = Invoke-WebRequest $Url -UseBasicParsing -TimeoutSec 2
            if ($Response.StatusCode -ge 200 -and $Response.StatusCode -lt 500) {
                return
            }
        } catch {
        }
    }

    Write-Output "$Name 尚未就绪：$Url"
    if ($Name -eq "frontend") {
        if (Test-Path -LiteralPath $FrontendLog) {
            Write-Output "--- 前端实时预览日志 ---"
            Get-Content -LiteralPath $FrontendLog -Tail 80
        }
        if (Test-Path -LiteralPath $FrontendErr) {
            Write-Output "--- 前端实时预览错误日志 ---"
            Get-Content -LiteralPath $FrontendErr -Tail 80
        }
    } else {
        if (Test-Path -LiteralPath $BackendLog) {
            Write-Output "--- 后端实时预览日志 ---"
            Get-Content -LiteralPath $BackendLog -Tail 80
        }
        if (Test-Path -LiteralPath $BackendErr) {
            Write-Output "--- 后端实时预览错误日志 ---"
            Get-Content -LiteralPath $BackendErr -Tail 80
        }
    }

    throw "$Name 启动失败"
}

Wait-HttpReady -Url $BackendHealthUrl -Name "backend"
Wait-HttpReady -Url $FrontendUrl -Name "frontend"

Write-Output "前端实时预览：$FrontendUrl"
Write-Output "后端健康检查：$BackendHealthUrl"
Write-Output "日志目录：$LogDir"

if ($OpenBrowser) {
    Start-Process $FrontendUrl
}
