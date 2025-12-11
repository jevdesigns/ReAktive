# Deploy entire add-on to Home Assistant
$source = "D:\HA\ReactiveWork\*"
$destination = "\\192.168.1.243\config\addons\local\reactivedash\"

Write-Host "Deploying add-on to Home Assistant..." -ForegroundColor Cyan

try {
    # Ensure destination directory exists
    if (!(Test-Path -Path $destination)) {
        New-Item -ItemType Directory -Path $destination -Force | Out-Null
    }
    
    # Copy all files
    Copy-Item -Path $source -Destination $destination -Recurse -Force -Exclude ".git","node_modules"
    
    Write-Host "Deployment complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Go to Home Assistant Settings > Add-ons" -ForegroundColor White
    Write-Host "2. Click the three dots (top right) > Check for updates" -ForegroundColor White
    Write-Host "3. Install 'ReactiveDash' from local add-ons" -ForegroundColor White
    Write-Host "4. Start the add-on" -ForegroundColor White
    Write-Host "5. Click 'Show in sidebar' to enable ingress" -ForegroundColor White
}
catch {
    Write-Host "Deployment failed: $_" -ForegroundColor Red
}
