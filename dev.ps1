# GM Collection House — Start All Dev Servers
# Run from project root: .\dev.ps1
# Opens 3 terminals: API (5000), Web (3000), Admin (3001)

Write-Host ""
Write-Host "Starting GM Collection House Dev Servers..." -ForegroundColor Cyan
Write-Host ""

# Auto-start portable PostgreSQL if present
$pgBin  = "C:\Users\ACER\Desktop\GMC\.postgres\pgsql\bin"
$pgData = "C:\Users\ACER\Desktop\GMC\.postgres\data"
$pgLog  = "C:\Users\ACER\Desktop\GMC\.postgres\logfile.txt"

if (Test-Path (Join-Path $pgBin "pg_ctl.exe")) {
    $pgProc = Get-Process "postgres" -ErrorAction SilentlyContinue
    if (-not $pgProc) {
        Write-Host "Starting local PostgreSQL server..." -ForegroundColor Yellow
        & "$pgBin\pg_ctl.exe" -D $pgData -l $pgLog start
        Start-Sleep -Seconds 2
    } else {
        Write-Host "Local PostgreSQL is already running." -ForegroundColor Green
    }
}

# Start API in new terminal
Write-Host "Starting API server on port 5000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location 'C:\Users\ACER\Desktop\GMC\apps\api'; Write-Host 'GMC API - Port 5000' -ForegroundColor Cyan; npm run dev"

Start-Sleep -Milliseconds 500

# Start Web in new terminal
Write-Host "Starting Web storefront on port 3000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location 'C:\Users\ACER\Desktop\GMC\apps\web'; Write-Host 'GMC Web Storefront - Port 3000' -ForegroundColor Green; npm run dev"

Start-Sleep -Milliseconds 500

# Start Admin in new terminal
Write-Host "Starting Admin panel on port 3001..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location 'C:\Users\ACER\Desktop\GMC\apps\admin'; Write-Host 'GMC Admin Panel - Port 3001' -ForegroundColor Magenta; npm run dev"

Write-Host ""
Write-Host "All servers starting! Open your browser:" -ForegroundColor Green
Write-Host "  Customer Store : http://localhost:3000" -ForegroundColor White
Write-Host "  Admin Panel    : http://localhost:3001" -ForegroundColor White
Write-Host "  API Health     : http://localhost:5000/api/health" -ForegroundColor White
Write-Host ""
Write-Host "Wait about 10 seconds for servers to be ready." -ForegroundColor Gray
