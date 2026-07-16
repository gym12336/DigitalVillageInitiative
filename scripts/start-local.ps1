param(
  [string]$HostName = "127.0.0.1",
  [int]$FrontendPort = 5173,
  [int]$BackendPort = 3001,
  [int]$StopAfterSeconds = 0
)

$ErrorActionPreference = "Stop"

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$NodeDir = Join-Path $Root ".conda-node"
$Node = Join-Path $NodeDir "node.exe"
$Vite = Join-Path $Root "node_modules\vite\bin\vite.js"
$EnvFile = Join-Path $Root ".env"
$EnvExample = Join-Path $Root ".env.example"
$RunDir = Join-Path $Root ".local-dev"
$PidFile = Join-Path $RunDir "pids.json"

function Test-ListeningPort {
  param([int]$Port)

  $Client = New-Object System.Net.Sockets.TcpClient
  try {
    $Result = $Client.BeginConnect("127.0.0.1", $Port, $null, $null)
    if (-not $Result.AsyncWaitHandle.WaitOne(200, $false)) {
      return $false
    }
    $Client.EndConnect($Result)
    return $true
  } catch {
    return $false
  } finally {
    $Client.Close()
  }
}

function Wait-ForPort {
  param(
    [int]$Port,
    [string]$Name,
    [System.Diagnostics.Process]$Process,
    [string]$ErrorLog
  )

  $Deadline = (Get-Date).AddSeconds(30)
  while ((Get-Date) -lt $Deadline) {
    if ($Process.HasExited) {
      Write-Host ""
      Write-Host "$Name exited during startup. Error log:"
      if (Test-Path $ErrorLog) {
        Get-Content $ErrorLog -Tail 30
      }
      throw "$Name failed to start."
    }

    if (Test-ListeningPort $Port) {
      return
    }

    Start-Sleep -Milliseconds 500
  }

  throw "$Name did not listen on port $Port within 30 seconds."
}

function Stop-ProcessTree {
  param(
    [System.Diagnostics.Process]$Process,
    [string]$Name
  )

  if ($null -eq $Process -or $Process.HasExited) {
    return
  }

  Write-Host "Stopping $Name..."
  try {
    Stop-Process -Id $Process.Id -Force -ErrorAction Stop
    Wait-Process -Id $Process.Id -Timeout 5 -ErrorAction SilentlyContinue
  } catch {
    # Process may have already exited.
  }

  if (-not $Process.HasExited) {
    $Taskkill = Join-Path $env:SystemRoot "System32\taskkill.exe"
    if (Test-Path $Taskkill) {
      & $Taskkill /PID $Process.Id /T /F *> $null
    }
  }
}

function Write-PidFile {
  param(
    [System.Diagnostics.Process]$ServerProcess,
    [System.Diagnostics.Process]$FrontendProcess
  )

  $Data = [pscustomobject]@{
    root = $Root
    createdAt = (Get-Date).ToString("o")
    processes = @(
      [pscustomobject]@{
        name = "backend"
        pid = $ServerProcess.Id
      },
      [pscustomobject]@{
        name = "frontend"
        pid = $FrontendProcess.Id
      }
    )
  }

  $Data | ConvertTo-Json -Depth 4 | Set-Content -Path $PidFile -Encoding UTF8
}

Set-Location $Root

if (-not (Test-Path $Node)) {
  throw "Missing $Node. Create the local Node environment first: conda create -p .\.conda-node -c conda-forge nodejs=22 -y"
}

if (-not (Test-Path $Vite)) {
  throw "Missing node_modules. Run first: `$env:PATH = `"$NodeDir;`$env:PATH`"; .\.conda-node\npm.cmd ci --cache .\.npm-cache"
}

if (-not (Test-Path $EnvFile)) {
  if (-not (Test-Path $EnvExample)) {
    throw "Missing .env and .env.example."
  }
  Copy-Item $EnvExample $EnvFile
  Write-Host "Created .env from .env.example."
}

if (Test-ListeningPort $BackendPort) {
  throw "Port $BackendPort is already in use. Run .\stop-local.cmd, or pass -BackendPort <port>."
}

if (Test-ListeningPort $FrontendPort) {
  throw "Port $FrontendPort is already in use. Run .\stop-local.cmd, or pass -FrontendPort <port>."
}

New-Item -ItemType Directory -Path $RunDir -Force | Out-Null

$env:PATH = "$NodeDir;$env:PATH"
$env:PORT = "$BackendPort"

$ServerOut = Join-Path $RunDir "server.out.log"
$ServerErr = Join-Path $RunDir "server.err.log"
$ViteOut = Join-Path $RunDir "vite.out.log"
$ViteErr = Join-Path $RunDir "vite.err.log"

Remove-Item -LiteralPath $ServerOut, $ServerErr, $ViteOut, $ViteErr -ErrorAction SilentlyContinue

$Server = $null
$Frontend = $null
$OldTreatControlCAsInput = $null
$ChangedControlCMode = $false

try {
  $Server = Start-Process -FilePath $Node `
    -ArgumentList @("server/index.js") `
    -WorkingDirectory $Root `
    -WindowStyle Hidden `
    -RedirectStandardOutput $ServerOut `
    -RedirectStandardError $ServerErr `
    -PassThru

  $Frontend = Start-Process -FilePath $Node `
    -ArgumentList @("node_modules/vite/bin/vite.js", "--host", $HostName, "--port", "$FrontendPort") `
    -WorkingDirectory $Root `
    -WindowStyle Hidden `
    -RedirectStandardOutput $ViteOut `
    -RedirectStandardError $ViteErr `
    -PassThru

  Write-PidFile -ServerProcess $Server -FrontendProcess $Frontend

  Wait-ForPort -Port $BackendPort -Name "Backend" -Process $Server -ErrorLog $ServerErr
  Wait-ForPort -Port $FrontendPort -Name "Frontend" -Process $Frontend -ErrorLog $ViteErr

  Write-Host ""
  Write-Host "Local preview is running."
  Write-Host "Frontend: http://$HostName`:$FrontendPort/"
  Write-Host "Backend:  http://127.0.0.1:$BackendPort/api/health"
  Write-Host "Logs:     $RunDir"
  Write-Host ""
  Write-Host "Press Enter, Q, Esc, or Ctrl+C to stop both services."

  $StopAt = $null
  if ($StopAfterSeconds -gt 0) {
    $StopAt = (Get-Date).AddSeconds($StopAfterSeconds)
  }

  try {
    $OldTreatControlCAsInput = [Console]::TreatControlCAsInput
    [Console]::TreatControlCAsInput = $true
    $ChangedControlCMode = $true
  } catch {
    $ChangedControlCMode = $false
  }

  while ($true) {
    if ($null -ne $StopAt -and (Get-Date) -ge $StopAt) {
      break
    }

    if ($Server.HasExited) {
      Write-Host "Backend exited. See $ServerErr"
      break
    }
    if ($Frontend.HasExited) {
      Write-Host "Frontend exited. See $ViteErr"
      break
    }

    try {
      if ([Console]::KeyAvailable) {
        $Key = [Console]::ReadKey($true)
        $KeyName = $Key.Key.ToString()
        $IsCtrlC = ($KeyName -eq "C" -and ($Key.Modifiers -band [ConsoleModifiers]::Control))
        if ($KeyName -in @("Enter", "Q", "Escape") -or $IsCtrlC) {
          break
        }
      }
    } catch {
      # Non-interactive shells may not expose console key state.
    }

    Start-Sleep -Milliseconds 200
  }
} finally {
  if ($ChangedControlCMode) {
    [Console]::TreatControlCAsInput = $OldTreatControlCAsInput
  }

  Stop-ProcessTree -Process $Frontend -Name "frontend"
  Stop-ProcessTree -Process $Server -Name "backend"
  Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue
  Write-Host "Stopped."
}
