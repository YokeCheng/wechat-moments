$ErrorActionPreference = "Stop"

function Get-ManagedProcess {
    param(
        [Parameter(Mandatory = $true)]
        [string]$PidDir,
        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    $PidFile = Join-Path $PidDir "$Name.pid"
    if (-not (Test-Path -LiteralPath $PidFile)) {
        return $null
    }

    $PidValue = (Get-Content -LiteralPath $PidFile -ErrorAction SilentlyContinue | Select-Object -First 1).Trim()
    if (-not $PidValue) {
        Remove-ManagedProcessPid -PidDir $PidDir -Name $Name
        return $null
    }

    $Process = Get-Process -Id $PidValue -ErrorAction SilentlyContinue
    if (-not $Process) {
        Remove-ManagedProcessPid -PidDir $PidDir -Name $Name
        return $null
    }

    return $Process
}

function Set-ManagedProcessPid {
    param(
        [Parameter(Mandatory = $true)]
        [string]$PidDir,
        [Parameter(Mandatory = $true)]
        [string]$Name,
        [Parameter(Mandatory = $true)]
        [int]$ProcessId
    )

    New-Item -ItemType Directory -Force -Path $PidDir | Out-Null
    Set-Content -LiteralPath (Join-Path $PidDir "$Name.pid") -Value "$ProcessId"
}

function Remove-ManagedProcessPid {
    param(
        [Parameter(Mandatory = $true)]
        [string]$PidDir,
        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    Remove-Item -LiteralPath (Join-Path $PidDir "$Name.pid") -Force -ErrorAction SilentlyContinue
}

function Get-ChildProcessIds {
    param(
        [Parameter(Mandatory = $true)]
        [int]$ParentId
    )

    $ChildIds = @()
    $Children = Get-CimInstance Win32_Process -Filter "ParentProcessId = $ParentId" -ErrorAction SilentlyContinue
    foreach ($Child in $Children) {
        $ChildIds += $Child.ProcessId
        $ChildIds += Get-ChildProcessIds -ParentId $Child.ProcessId
    }

    return $ChildIds
}

function Stop-ProcessTree {
    param(
        [Parameter(Mandatory = $true)]
        [int]$RootPid
    )

    $ChildIds = @(Get-ChildProcessIds -ParentId $RootPid) | Sort-Object -Unique -Descending
    foreach ($ChildId in $ChildIds) {
        Stop-Process -Id $ChildId -Force -ErrorAction SilentlyContinue
    }

    Stop-Process -Id $RootPid -Force -ErrorAction SilentlyContinue
}

function Stop-ManagedProcess {
    param(
        [Parameter(Mandatory = $true)]
        [string]$PidDir,
        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    $Process = Get-ManagedProcess -PidDir $PidDir -Name $Name
    if ($Process) {
        Stop-ProcessTree -RootPid $Process.Id
    }

    Remove-ManagedProcessPid -PidDir $PidDir -Name $Name
}

function Test-HttpReady {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Url
    )

    try {
        $Response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
        return ($Response.StatusCode -ge 200 -and $Response.StatusCode -lt 500)
    } catch {
        return $false
    }
}

function Wait-HttpReady {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Url,
        [Parameter(Mandatory = $true)]
        [string]$Name,
        [string]$LogPath,
        [string]$ErrPath,
        [int]$Attempts = 40,
        [int]$DelayMs = 500
    )

    for ($Index = 0; $Index -lt $Attempts; $Index++) {
        Start-Sleep -Milliseconds $DelayMs
        if (Test-HttpReady -Url $Url) {
            return
        }
    }

    Write-Output "$Name is not ready: $Url"
    if ($LogPath -and (Test-Path -LiteralPath $LogPath)) {
        Write-Output "--- $Name log ---"
        Get-Content -LiteralPath $LogPath -Tail 80
    }

    if ($ErrPath -and (Test-Path -LiteralPath $ErrPath)) {
        Write-Output "--- $Name error log ---"
        Get-Content -LiteralPath $ErrPath -Tail 80
    }

    throw "$Name startup failed"
}
