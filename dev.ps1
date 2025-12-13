# Development script with hot reload for Windows
Write-Host "Starting ReactiveDash Development Server..." -ForegroundColor Cyan
Write-Host ""

Write-Host "Building client..." -ForegroundColor Yellow
Push-Location client
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

$env:NODE_ENV = "development"
node server.js
