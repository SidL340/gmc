# GM Collection House — Quick PostgreSQL Setup using Docker
# Docker is the easiest way to get PostgreSQL running on Windows
# Prerequisites: Docker Desktop installed (https://www.docker.com/products/docker-desktop)

Write-Host ""
Write-Host "Setting up PostgreSQL with Docker..." -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
$dockerRunning = docker info 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker Desktop is not running." -ForegroundColor Red
    Write-Host "Please install and start Docker Desktop from: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    Write-Host "Then run this script again." -ForegroundColor Yellow
    exit 1
}

Write-Host "Docker is running. Starting PostgreSQL container..." -ForegroundColor Green

# Start PostgreSQL container
docker run -d `
  --name gmc-postgres `
  -e POSTGRES_USER=postgres `
  -e POSTGRES_PASSWORD=gmc_password_2024 `
  -e POSTGRES_DB=gmc_ecommerce `
  -p 5432:5432 `
  --restart unless-stopped `
  postgres:16-alpine

if ($LASTEXITCODE -ne 0) {
    # Maybe container already exists
    Write-Host "Starting existing container..." -ForegroundColor Yellow
    docker start gmc-postgres
}

Write-Host ""
Write-Host "PostgreSQL is running!" -ForegroundColor Green
Write-Host ""
Write-Host "Now updating your .env file with the database URL..." -ForegroundColor Cyan

# Update DATABASE_URL in .env
$envPath = "apps\api\.env"
$content = Get-Content $envPath -Raw
$content = $content -replace 'DATABASE_URL=.*', 'DATABASE_URL=postgresql://postgres:gmc_password_2024@localhost:5432/gmc_ecommerce'
Set-Content $envPath $content

# Also update database package .env
Copy-Item "apps\api\.env" "packages\database\.env"

Write-Host "DATABASE_URL set to: postgresql://postgres:gmc_password_2024@localhost:5432/gmc_ecommerce" -ForegroundColor White
Write-Host ""
Write-Host "Running database schema setup..." -ForegroundColor Cyan

Start-Sleep -Seconds 3  # Give postgres time to start

Set-Location "packages\database"
npx prisma db push
Set-Location "..\.."

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Database ready!                       " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Connection details:" -ForegroundColor Cyan
Write-Host "  Host:     localhost:5432"
Write-Host "  Database: gmc_ecommerce"
Write-Host "  User:     postgres"
Write-Host "  Password: gmc_password_2024"
Write-Host ""
Write-Host "Now run: .\dev.ps1  to start all servers!" -ForegroundColor Green
