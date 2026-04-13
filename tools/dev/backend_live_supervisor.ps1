param(
    [Parameter(Mandatory = $true)]
    [string]$RepoRoot,
    [string]$BackendHost = "127.0.0.1",
    [int]$BackendPort = 8000
)

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "live_preview_common.ps1")

$RuntimeDir = Join-Path $RepoRoot ".runtime"
$LogDir = Join-Path $RuntimeDir "logs"
$PidDir = Join-Path $RuntimeDir "pids"
$BackendDir = Join-Path $RepoRoot "backend"
$PythonExe = (Get-Command python -ErrorAction Stop).Source
$ChildProcessName = "backend-live-child"
$BackendAppLog = Join-Path $LogDir "backend-live.app.log"
$BackendAppErr = Join-Path $LogDir "backend-live.app.err.log"

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
New-Item -ItemType Directory -Force -Path $PidDir | Out-Null

function Get-BackendWatchFiles {
    $WatchFiles = @()
    $AppDir = Join-Path $BackendDir "app"
    if (Test-Path -LiteralPath $AppDir) {
        $WatchFiles += Get-ChildItem -LiteralPath $AppDir -Recurse -File -Include *.py
    }

    foreach ($EnvPath in @(
        (Join-Path $RepoRoot ".env"),
        (Join-Path $BackendDir ".env")
    )) {
        if (Test-Path -LiteralPath $EnvPath) {
            $WatchFiles += Get-Item -LiteralPath $EnvPath
        }
    }

    return $WatchFiles | Sort-Object -Property FullName -Unique
}

function Get-BackendFingerprint {
    $FingerprintBuilder = [System.Text.StringBuilder]::new()
    foreach ($File in Get-BackendWatchFiles) {
        [void]$FingerprintBuilder.Append($File.FullName)
        [void]$FingerprintBuilder.Append("|")
        [void]$FingerprintBuilder.Append($File.LastWriteTimeUtc.Ticks)
        [void]$FingerprintBuilder.Append("|")
        [void]$FingerprintBuilder.Append($File.Length)
        [void]$FingerprintBuilder.Append("`n")
    }

    return $FingerprintBuilder.ToString()
}

function Start-BackendApp {
    Stop-ManagedProcess -PidDir $PidDir -Name $ChildProcessName
    Stop-ConflictingBackendProcess

    $Process = Start-Process -FilePath $PythonExe `
        -ArgumentList @(
            "-m", "uvicorn",
            "app.main:app",
            "--host", $BackendHost,
            "--port", "$BackendPort"
        ) `
        -WorkingDirectory $BackendDir `
        -RedirectStandardOutput $BackendAppLog `
        -RedirectStandardError $BackendAppErr `
        -PassThru

    Set-ManagedProcessPid -PidDir $PidDir -Name $ChildProcessName -ProcessId $Process.Id
    return $Process
}

function Stop-ConflictingBackendProcess {
    $OwningProcessIds = @(Get-NetTCPConnection -State Listen -LocalPort $BackendPort -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique)
    if (-not $OwningProcessIds -or $OwningProcessIds.Count -eq 0) {
        return
    }

    $ChildProcess = Get-ManagedProcess -PidDir $PidDir -Name $ChildProcessName
    $TargetProcessIds = @($OwningProcessIds | ForEach-Object { [int]$_ } | Sort-Object -Unique -Descending)

    foreach ($OwningProcessId in $TargetProcessIds) {
        if ($ChildProcess -and $OwningProcessId -eq $ChildProcess.Id) {
            continue
        }

        $ProcessInfo = Get-CimInstance Win32_Process -Filter "ProcessId = $OwningProcessId" -ErrorAction SilentlyContinue
        if (-not $ProcessInfo) {
            continue
        }

        $CommandLine = [string]$ProcessInfo.CommandLine
        $LooksLikeRepoBackend = $CommandLine -match "uvicorn\\s+app\\.main:app"
        if (-not $LooksLikeRepoBackend) {
            throw "backend port $BackendPort is occupied by unmanaged process $OwningProcessId"
        }

        Write-Output "stopping conflicting backend process $OwningProcessId on port $BackendPort"
        Stop-ProcessTree -RootPid $OwningProcessId
    }
    Start-Sleep -Milliseconds 500
}

try {
    $CurrentFingerprint = Get-BackendFingerprint
    $null = Start-BackendApp
    $HasLoggedStopped = $false

    while ($true) {
        Start-Sleep -Milliseconds 1000

        $NextFingerprint = Get-BackendFingerprint
        if ($NextFingerprint -ne $CurrentFingerprint) {
            $CurrentFingerprint = $NextFingerprint
            Write-Output ("backend source changed at " + (Get-Date).ToString("s"))
            $null = Start-BackendApp
            $HasLoggedStopped = $false
            continue
        }

        $ChildProcess = Get-ManagedProcess -PidDir $PidDir -Name $ChildProcessName
        if ($ChildProcess) {
            $HasLoggedStopped = $false
            continue
        }

        if (-not $HasLoggedStopped) {
            Write-Output "backend app stopped; waiting for file changes to restart."
            $HasLoggedStopped = $true
        }
    }
} finally {
    Stop-ManagedProcess -PidDir $PidDir -Name $ChildProcessName
}
