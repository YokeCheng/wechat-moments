$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\\..")).Path
$PidDir = Join-Path $RepoRoot ".runtime\\pids"

function Stop-ManagedProcess {
    param([string]$Name)

    $PidFile = Join-Path $PidDir "$Name.pid"
    if (-not (Test-Path -LiteralPath $PidFile)) {
        return
    }

    $PidValue = (Get-Content -LiteralPath $PidFile -ErrorAction SilentlyContinue | Select-Object -First 1).Trim()
    if ($PidValue) {
        Stop-Process -Id $PidValue -Force -ErrorAction SilentlyContinue
    }

    Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue
}

Stop-ManagedProcess -Name "backend-live"
Stop-ManagedProcess -Name "frontend-live"

Write-Output "已停止受管控的实时预览进程。"
