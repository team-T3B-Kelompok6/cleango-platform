param(
  [string]$DatabaseName = 'cleango',
  [string]$PostgresRoot = 'D:\Alat Tempur\Fly Env\FlyEnv-Data\app\postgresql-18.6\pgsql'
)

$ErrorActionPreference = 'Stop'

$psql = Join-Path $PostgresRoot 'bin\psql.exe'
$createdb = Join-Path $PostgresRoot 'bin\createdb.exe'
$projectRoot = Split-Path -Parent $PSScriptRoot
$bootstrap = Join-Path $projectRoot 'supabase\local\000_flyenv_bootstrap.sql'
$migrationDir = Join-Path $projectRoot 'supabase\migrations'

if (-not (Test-Path -LiteralPath $psql)) {
  throw "psql tidak ditemukan: $psql"
}

$exists = & $psql -w -h 127.0.0.1 -p 5432 -U root -d postgres -Atc `
  "select 1 from pg_database where datname = '$DatabaseName'"

if ($exists -ne '1') {
  & $createdb -w -h 127.0.0.1 -p 5432 -U root -T template0 -E UTF8 $DatabaseName
}

$alreadyMigrated = & $psql -w -h 127.0.0.1 -p 5432 -U root -d $DatabaseName -Atc `
  "select to_regclass('public.profiles') is not null"

if ($alreadyMigrated -eq 't') {
  Write-Host "Database '$DatabaseName' sudah memiliki schema CleanGo."
  exit 0
}

& $psql -v ON_ERROR_STOP=1 -w -h 127.0.0.1 -p 5432 -U root -d $DatabaseName -f $bootstrap

Get-ChildItem -File -LiteralPath $migrationDir -Filter '*.sql' |
  Sort-Object Name |
  ForEach-Object {
    Write-Host "Applying $($_.Name)..."
    & $psql -v ON_ERROR_STOP=1 -w -h 127.0.0.1 -p 5432 -U root -d $DatabaseName -f $_.FullName
    if ($LASTEXITCODE -ne 0) {
      throw "Migration gagal: $($_.Name)"
    }
  }

Write-Host "Database '$DatabaseName' siap digunakan."

