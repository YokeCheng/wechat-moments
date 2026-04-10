param(
    [string]$FrontendHost = "127.0.0.1",
    [int]$FrontendPort = 3000,
    [string]$BackendHost = "127.0.0.1",
    [int]$BackendPort = 8000,
    [switch]$Restart,
    [switch]$OpenBrowser
)

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "live_preview_common.ps1")

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\\..")).Path
$RuntimeDir = Join-Path $RepoRoot ".runtime"
$LogDir = Join-Path $RuntimeDir "logs"
$PidDir = Join-Path $RuntimeDir "pids"

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
New-Item -ItemType Directory -Force -Path $PidDir | Out-Null

$PowerShellExe = (Get-Command powershell.exe -ErrorAction Stop).Source

$FrontendLog = Join-Path $LogDir "frontend-live.log"
$FrontendErr = Join-Path $LogDir "frontend-live.err.log"
$BackendLog = Join-Path $LogDir "backend-live.log"
$BackendErr = Join-Path $LogDir "backend-live.err.log"
$BackendAppLog = Join-Path $LogDir "backend-live.app.log"
$BackendAppErr = Join-Path $LogDir "backend-live.app.err.log"

$FrontendUrl = "http://$FrontendHost`:$FrontendPort"
$BackendHealthUrl = "http://$BackendHost`:$BackendPort/health"

function Start-ManagedScript {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,
        [Parameter(Mandatory = $true)]
        [string]$ScriptPath,
        [Parameter(Mandatory = $true)]
        [string]$LogPath,
        [Parameter(Mandatory = $true)]
        [string]$ErrPath,
        [string[]]$ScriptArguments = @()
    )

    $ArgumentList = @(
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        $ScriptPath
    ) + $ScriptArguments

    $Process = Start-Process -FilePath $PowerShellExe `
        -ArgumentList $ArgumentList `
        -WorkingDirectory $RepoRoot `
        -WindowStyle Hidden `
        -RedirectStandardOutput $LogPath `
        -RedirectStandardError $ErrPath `
        -PassThru

    Set-ManagedProcessPid -PidDir $PidDir -Name $Name -ProcessId $Process.Id
    return $Process
}

function Ensure-ManagedService {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,
        [Parameter(Mandatory = $true)]
        [string]$ReadyUrl,
        [Parameter(Mandatory = $true)]
        [scriptblock]$Starter
    )

    $Process = Get-ManagedProcess -PidDir $PidDir -Name $Name
    if ($Process -and -not (Test-HttpReady -Url $ReadyUrl)) {
        Stop-ManagedProcess -PidDir $PidDir -Name $Name
        $Process = $null
    }

    if (-not $Process) {
        & $Starter | Out-Null
    }
}

if ($Restart) {
    Stop-ManagedProcess -PidDir $PidDir -Name "backend-live-child"
    Stop-ManagedProcess -PidDir $PidDir -Name "backend-live"
    Stop-ManagedProcess -PidDir $PidDir -Name "frontend-live"
}

Ensure-ManagedService -Name "backend-live" -ReadyUrl $BackendHealthUrl -Starter {
    Start-ManagedScript `
        -Name "backend-live" `
        -ScriptPath (Join-Path $PSScriptRoot "backend_live_supervisor.ps1") `
        -LogPath $BackendLog `
        -ErrPath $BackendErr `
        -ScriptArguments @(
            "-RepoRoot", $RepoRoot,
            "-BackendHost", $BackendHost,
            "-BackendPort", "$BackendPort"
        )
}

Ensure-ManagedService -Name "frontend-live" -ReadyUrl $FrontendUrl -Starter {
    Start-ManagedScript `
        -Name "frontend-live" `
        -ScriptPath (Join-Path $PSScriptRoot "frontend_live_runner.ps1") `
        -LogPath $FrontendLog `
        -ErrPath $FrontendErr `
        -ScriptArguments @(
            "-RepoRoot", $RepoRoot,
            "-FrontendHost", $FrontendHost,
            "-FrontendPort", "$FrontendPort"
        )
}

Wait-HttpReady -Url $BackendHealthUrl -Name "backend" -LogPath $BackendAppLog -ErrPath $BackendAppErr
Wait-HttpReady -Url $FrontendUrl -Name "frontend" -LogPath $FrontendLog -ErrPath $FrontendErr

Write-Output "Frontend live preview: $FrontendUrl"
Write-Output "Backend health check: $BackendHealthUrl"
Write-Output "Logs: $LogDir"

if ($OpenBrowser) {
    Start-Process $FrontendUrl
}
