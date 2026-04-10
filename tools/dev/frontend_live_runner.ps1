param(
    [Parameter(Mandatory = $true)]
    [string]$RepoRoot,
    [string]$FrontendHost = "127.0.0.1",
    [int]$FrontendPort = 3000
)

$ErrorActionPreference = "Stop"

$FrontendDir = Join-Path $RepoRoot "frontend"
$NpmExe = (Get-Command npm.cmd -ErrorAction Stop).Source

Set-Location $FrontendDir
& $NpmExe "run" "dev" "--" "--host" $FrontendHost "--port" "$FrontendPort"
