# GM Collection House — Setup Script for Windows PowerShell
# Run this from the project root: C:\Users\ACER\Desktop\GMC
# Usage: .\setup.ps1

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  GM Collection House - Project Setup   " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ── Step 1: Root dependencies ─────────────────────────────────────────────────
Write-Host "[1/5] Installing root dependencies..." -ForegroundColor Yellow
npm install --legacy-peer-deps
if ($LASTEXITCODE -ne 0) { Write-Host "Root install failed!" -ForegroundColor Red; exit 1 }
Write-Host "  Done." -ForegroundColor Green

# ── Step 2: API dependencies ─────────────────────────────────────────────────
Write-Host "[2/5] Installing API dependencies..." -ForegroundColor Yellow
Set-Location "apps\api"
npm install --legacy-peer-deps
if ($LASTEXITCODE -ne 0) { Write-Host "API install failed!" -ForegroundColor Red; exit 1 }
Set-Location "..\.."
Write-Host "  Done." -ForegroundColor Green

# ── Step 3: Web dependencies ──────────────────────────────────────────────────
Write-Host "[3/5] Installing Web (storefront) dependencies..." -ForegroundColor Yellow
Set-Location "apps\web"
npm install --legacy-peer-deps
if ($LASTEXITCODE -ne 0) { Write-Host "Web install failed!" -ForegroundColor Red; exit 1 }
Set-Location "..\.."
Write-Host "  Done." -ForegroundColor Green

# ── Step 4: Admin dependencies ────────────────────────────────────────────────
Write-Host "[4/5] Installing Admin Panel dependencies..." -ForegroundColor Yellow
Set-Location "apps\admin"
npm install --legacy-peer-deps
if ($LASTEXITCODE -ne 0) { Write-Host "Admin install failed!" -ForegroundColor Red; exit 1 }
Set-Location "..\.."
Write-Host "  Done." -ForegroundColor Green

# ── Step 5: Database package ──────────────────────────────────────────────────
Write-Host "[5/5] Installing Database package..." -ForegroundColor Yellow
Set-Location "packages\database"
npm install --legacy-peer-deps
if ($LASTEXITCODE -ne 0) { Write-Host "Database install failed!" -ForegroundColor Red; exit 1 }
Set-Location "..\.."
Write-Host "  Done." -ForegroundColor Green

# ── Done ──────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  All dependencies installed!           " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Copy env files:"
Write-Host "       Copy-Item apps\api\.env.example apps\api\.env"
Write-Host "       Copy-Item apps\web\.env.example apps\web\.env.local"
Write-Host "       Copy-Item apps\admin\.env.example apps\admin\.env.local"
Write-Host ""
Write-Host "  2. Edit apps\api\.env with your database URL and API keys"
Write-Host ""
Write-Host "  3. Set up database:"
Write-Host "       cd packages\database"
Write-Host "       npx prisma db push"
Write-Host "       npx prisma generate"
Write-Host "       cd ..\.."
Write-Host ""
Write-Host "  4. Start development servers:"
Write-Host "       .\dev.ps1"
Write-Host ""
