# Development script with hot reload for Windows
Write-Host "Starting ReactiveDash Development Server..." -ForegroundColor Cyan
Write-Host ""

# Ensure we're in the project root directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

Write-Host "Building client..." -ForegroundColor Yellow
Push-Location client
npm install
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}
Pop-Location

Write-Host ""
Write-Host "Starting server with hot reload..." -ForegroundColor Green
Write-Host ""
Write-Host "Ingress URL: /api/hassio/app" -ForegroundColor White
Write-Host "Direct URL: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "Edit these files and they will auto-reload:" -ForegroundColor Yellow
Write-Host "  - App.jsx" -ForegroundColor White
Write-Host "  - ClimatePage.jsx" -ForegroundColor White
Write-Host "  - LightsPage.jsx" -ForegroundColor White
Write-Host "  - SecurityPage.jsx" -ForegroundColor White
Write-Host "  - SettingsPage.jsx" -ForegroundColor White
Write-Host "  - MediaPage.jsx (coming soon)" -ForegroundColor White
Write-Host ""

# Install server dependencies if needed
if (!(Test-Path node_modules)) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
}

$env:NODE_ENV = "development"
node server.js
