$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "live_preview_common.ps1")

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\\..")).Path
$PidDir = Join-Path $RepoRoot ".runtime\\pids"

Stop-ManagedProcess -PidDir $PidDir -Name "backend-live-child"
Stop-ManagedProcess -PidDir $PidDir -Name "backend-live"
Stop-ManagedProcess -PidDir $PidDir -Name "frontend-live"

Write-Output "Stopped managed live preview processes."
