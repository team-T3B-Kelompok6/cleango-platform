$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$pgAdminData = Join-Path $projectRoot '.pgadmin-appdata'
$pythonw = 'D:\Alat Tempur\Fly Env\FlyEnv-Data\app\postgresql-18.6\pgsql\pgAdmin 4\python\pythonw.exe'
$runner = Join-Path $PSScriptRoot 'run-pgadmin.py'
$url = 'http://127.0.0.1:5050/browser/'
$createdNew = $false
$mutex = [System.Threading.Mutex]::new($true, 'Local\CleanGoPgAdminWatchdog', [ref]$createdNew)

if (-not $createdNew) {
  exit 0
}

function Test-PgAdminReady {
  try {
    $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3
    return $response.StatusCode -eq 200
  }
  catch {
    return $false
  }
}

function Get-PgAdminProcesses {
  return @(Get-Process -Name 'pythonw' -ErrorAction SilentlyContinue | Where-Object {
    $_.Path -eq $pythonw
  })
}

try {
  if (-not (Test-Path -LiteralPath $pythonw)) {
    throw "Python pgAdmin tidak ditemukan: $pythonw"
  }

  if (-not (Test-Path -LiteralPath $runner)) {
    throw "Launcher pgAdmin tidak ditemukan: $runner"
  }

  New-Item -ItemType Directory -Path $pgAdminData -Force | Out-Null
  $env:APPDATA = $pgAdminData
  $env:PGADMIN_SERVER_MODE = 'OFF'

  while ($true) {
    if (-not (Test-PgAdminReady)) {
      $pgAdminProcesses = Get-PgAdminProcesses
      $oldestStart = $pgAdminProcesses |
        Sort-Object StartTime |
        Select-Object -First 1 -ExpandProperty StartTime

      if ($pgAdminProcesses.Count -eq 0 -or
          ($oldestStart -and ((Get-Date) - $oldestStart).TotalSeconds -gt 120)) {
        if ($pgAdminProcesses.Count -gt 0) {
          $pgAdminProcesses | Stop-Process -Force
        }

        Start-Process -FilePath $pythonw `
          -ArgumentList ('"' + $runner + '"') `
          -WorkingDirectory $PSScriptRoot `
          -WindowStyle Hidden
      }
    }

    Start-Sleep -Seconds 15
  }
}
finally {
  $mutex.ReleaseMutex()
  $mutex.Dispose()
}
