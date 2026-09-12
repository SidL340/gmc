# GM Collection House — Database Setup Script
# Run AFTER editing apps/api/.env with your DATABASE_URL
# Usage: .\db-setup.ps1

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  GMC Database Setup                    " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Copy .env from API to database package (Prisma needs DATABASE_URL)
Write-Host "Copying .env for Prisma..." -ForegroundColor Yellow
Copy-Item "apps\api\.env" "packages\database\.env" -ErrorAction SilentlyContinue

Set-Location "packages\database"

# Generate Prisma client
Write-Host "Generating Prisma client..." -ForegroundColor Yellow
npx prisma generate
if ($LASTEXITCODE -ne 0) { Write-Host "Prisma generate failed!" -ForegroundColor Red; Set-Location "..\.." ; exit 1 }

# Push schema to database (creates all tables)
Write-Host "Pushing schema to database..." -ForegroundColor Yellow
npx prisma db push
if ($LASTEXITCODE -ne 0) { Write-Host "DB push failed! Check your DATABASE_URL in apps\api\.env" -ForegroundColor Red; Set-Location "..\.." ; exit 1 }

Set-Location "..\.."

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Database setup complete!              " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Now create an admin account:" -ForegroundColor Cyan
Write-Host "  Run: npx prisma studio   (from packages\database)" -ForegroundColor White
Write-Host "  Or connect via pgAdmin and run the SQL below:" -ForegroundColor White
Write-Host ""
Write-Host "  INSERT INTO users (id, name, phone, role, ""isVerified"", ""createdAt"", ""updatedAt"")" -ForegroundColor Gray
Write-Host "  VALUES (gen_random_uuid(), 'Admin', '98XXXXXXXX', 'SUPER_ADMIN', true, NOW(), NOW());" -ForegroundColor Gray
Write-Host ""
Write-Host "Then login at: http://localhost:3001/login" -ForegroundColor Cyan
