param(
  [int[]]$Ports = @(3001, 5173)
)

$ErrorActionPreference = "Stop"

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Node = Join-Path $Root ".conda-node\node.exe"
$RunDir = Join-Path $Root ".local-dev"
$PidFile = Join-Path $RunDir "pids.json"

function Test-ProjectNodeProcess {
  param([System.Diagnostics.Process]$Process)

  try {
    return ($Process.Path -eq $Node)
  } catch {
    return $false
  }
}

function Stop-ProjectProcess {
  param(
    [int]$ProcessId,
    [string]$Reason
  )

  $Process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
  if ($null -eq $Process) {
    return
  }

  if (-not (Test-ProjectNodeProcess -Process $Process)) {
    Write-Host "Skip PID $ProcessId for $Reason; it is not this project's node.exe."
    return
  }

  Write-Host "Stopping PID $ProcessId ($Reason)..."
  try {
    Stop-Process -Id $ProcessId -Force -ErrorAction Stop
    Wait-Process -Id $ProcessId -Timeout 5 -ErrorAction SilentlyContinue
  } catch {
    $Taskkill = Join-Path $env:SystemRoot "System32\taskkill.exe"
    if (Test-Path $Taskkill) {
      & $Taskkill /PID $ProcessId /T /F *> $null
    }
  }
}

function Get-ListeningPidsByPort {
  param([int[]]$PortList)

  $Found = @()
  $Lines = & netstat -ano
  foreach ($Line in $Lines) {
    if ($Line -notmatch "LISTENING") {
      continue
    }

    foreach ($Port in $PortList) {
      if ($Line -match "[:.]$Port\s+\S+\s+LISTENING\s+(\d+)$") {
        $Found += [pscustomobject]@{
          Port = $Port
          Pid = [int]$Matches[1]
        }
      }
    }
  }

  return $Found
}

$StoppedAny = $false

if (Test-Path $PidFile) {
  try {
    $PidData = Get-Content $PidFile -Raw | ConvertFrom-Json
    foreach ($Entry in @($PidData.processes)) {
      Stop-ProjectProcess -ProcessId ([int]$Entry.pid) -Reason $Entry.name
      $StoppedAny = $true
    }
  } catch {
    Write-Host "Could not read $PidFile; falling back to port scan."
  }
}

foreach ($Found in Get-ListeningPidsByPort -PortList $Ports) {
  Stop-ProjectProcess -ProcessId $Found.Pid -Reason "port $($Found.Port)"
  $StoppedAny = $true
}

if (Test-Path $PidFile) {
  Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue
}

if ($StoppedAny) {
  Write-Host "Stopped local preview processes."
} else {
  Write-Host "No local preview process found."
}
