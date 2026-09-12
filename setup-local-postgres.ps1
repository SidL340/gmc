# GM Collection House — Standalone Portable PostgreSQL Setup
# No installation or administrator rights required!
# Runs PostgreSQL locally from C:\Users\ACER\Desktop\GMC\.postgres

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot
if (-not $ProjectRoot) { $ProjectRoot = "C:\Users\ACER\Desktop\GMC" }

$PgDir   = Join-Path $ProjectRoot ".postgres"
$ZipFile = Join-Path $PgDir "pgsql.zip"
$BinDir  = Join-Path $PgDir "pgsql\bin"
$DataDir = Join-Path $PgDir "data"
$LogFile = Join-Path $PgDir "logfile.txt"

Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  GM Collection House - Portable PostgreSQL Setup" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $PgDir)) {
    New-Item -ItemType Directory -Path $PgDir -Force | Out-Null
}

# 1. Download binaries if not already extracted
if (-not (Test-Path (Join-Path $BinDir "postgres.exe"))) {
    if (-not (Test-Path $ZipFile)) {
        $downloadUrl = "https://get.enterprisedb.com/postgresql/postgresql-16.3-1-windows-x64-binaries.zip"
        Write-Host "Downloading PostgreSQL 16 standalone binaries (approx 330MB)..." -ForegroundColor Yellow
        Write-Host "URL: $downloadUrl" -ForegroundColor Gray
        
        try {
            Start-BitsTransfer -Source $downloadUrl -Destination $ZipFile -DisplayName "Downloading PostgreSQL"
        } catch {
            Write-Host "BITS transfer failed, trying curl/Invoke-WebRequest..." -ForegroundColor Yellow
            Invoke-WebRequest -Uri $downloadUrl -OutFile $ZipFile -UseBasicParsing
        }
    }

    Write-Host "Extracting PostgreSQL binaries..." -ForegroundColor Yellow
    Expand-Archive -Path $ZipFile -DestinationPath $PgDir -Force
    Remove-Item $ZipFile -Force -ErrorAction SilentlyContinue
    Write-Host "PostgreSQL extracted." -ForegroundColor Green
} else {
    Write-Host "PostgreSQL binaries already present." -ForegroundColor Green
}

# 2. Initialize Database Cluster if not present
if (-not (Test-Path (Join-Path $DataDir "PG_VERSION"))) {
    Write-Host "Initializing database cluster in $DataDir..." -ForegroundColor Yellow
    & "$BinDir\initdb.exe" -D $DataDir -U postgres -A trust -E utf8
    if ($LASTEXITCODE -ne 0) {
        Write-Host "initdb failed!" -ForegroundColor Red
        exit 1
    }
}

# 3. Start PostgreSQL Server
Write-Host "Starting PostgreSQL on localhost:5432..." -ForegroundColor Yellow
$pgRunning = Get-Process "postgres" -ErrorAction SilentlyContinue
if (-not $pgRunning) {
    & "$BinDir\pg_ctl.exe" -D $DataDir -l $LogFile start
    Start-Sleep -Seconds 3
}

# 4. Create database gmc_ecommerce if not exists
Write-Host "Ensuring database 'gmc_ecommerce' exists..." -ForegroundColor Yellow
& "$BinDir\createdb.exe" -U postgres -h localhost -p 5432 gmc_ecommerce 2>$null
# Ignore exit code if it already exists

# 5. Update .env files
$dbUrl = "postgresql://postgres@localhost:5432/gmc_ecommerce"
Write-Host "Updating DATABASE_URL in .env..." -ForegroundColor Yellow

$apiEnv = Join-Path $ProjectRoot "apps\api\.env"
if (Test-Path $apiEnv) {
    $c = Get-Content $apiEnv -Raw
    $c = $c -replace 'DATABASE_URL=.*', "DATABASE_URL=$dbUrl"
    Set-Content $apiEnv $c
}

$dbEnv = Join-Path $ProjectRoot "packages\database\.env"
if (Test-Path $dbEnv) {
    $c = Get-Content $dbEnv -Raw
    $c = $c -replace 'DATABASE_URL=.*', "DATABASE_URL=$dbUrl"
    Set-Content $dbEnv $c
} else {
    Copy-Item $apiEnv $dbEnv -Force
}

# 6. Apply Prisma Schema & Seed
Write-Host "Pushing Prisma schema to database..." -ForegroundColor Yellow
Set-Location (Join-Path $ProjectRoot "packages\database")
npx prisma db push
if ($LASTEXITCODE -ne 0) {
    Write-Host "Prisma db push failed!" -ForegroundColor Red
    Set-Location $ProjectRoot
    exit 1
}

Write-Host "Seeding database with categories, products, TikTok previews & admin..." -ForegroundColor Yellow
npx ts-node prisma/seed.ts
Set-Location $ProjectRoot

Write-Host ""
Write-Host "=================================================" -ForegroundColor Green
Write-Host "  PostgreSQL Database is 100% READY!             " -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green
Write-Host "Connection URL: $dbUrl" -ForegroundColor White
Write-Host ""
