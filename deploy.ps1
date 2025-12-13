# Deploy entire add-on to Home Assistant
$source = "D:\HA\ReactiveWork\"
$destination = "\\192.168.1.243\config\addons\local\reactivedash\"
$haHost = "192.168.1.243"

Write-Host "ReactiveDash Deployment Script" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

# Check network connectivity to Home Assistant
Write-Host "Checking connection to Home Assistant..." -ForegroundColor Yellow
if (!(Test-Connection -ComputerName $haHost -Count 1 -Quiet)) {
    Write-Host "Error: Cannot reach Home Assistant at $haHost" -ForegroundColor Red
    Write-Host "Make sure Home Assistant is running and the IP address is correct." -ForegroundColor Red
    exit 1
}
Write-Host "Connected to Home Assistant at $haHost" -ForegroundColor Green
Write-Host ""

Write-Host "Deploying add-on to Home Assistant..." -ForegroundColor Cyan

try {
    # Test SMB connectivity first
    Write-Host "Testing SMB access to Home Assistant..." -ForegroundColor White
    $testPath = "\\$haHost\config"
    if (!(Test-Path -Path $testPath)) {
        Write-Host "Error: Cannot access SMB share at $testPath" -ForegroundColor Red
        Write-Host ""
        Write-Host "To enable SMB sharing on Home Assistant:" -ForegroundColor Yellow
        Write-Host "1. Install 'Samba Share' add-on from Home Assistant" -ForegroundColor White
        Write-Host "2. Configure with username and password" -ForegroundColor White
        Write-Host "3. Restart Home Assistant" -ForegroundColor White
        Write-Host ""
        Write-Host "Then try deployment again." -ForegroundColor Yellow
        exit 1
    }
    Write-Host "SMB access verified" -ForegroundColor Green
    Write-Host ""
    
    # Ensure destination directory exists
    Write-Host "Creating destination directory..." -ForegroundColor White
    if (!(Test-Path -Path $destination)) {
        New-Item -ItemType Directory -Path $destination -Force -ErrorAction Stop | Out-Null
        Write-Host "Created: $destination" -ForegroundColor White
    }
    else {
        Write-Host "Directory already exists: $destination" -ForegroundColor White
    }
    
    # Copy files with exclusions
    Write-Host "Copying files..." -ForegroundColor White
    $excludeList = @(".git", "node_modules", "client\node_modules", "client\dist", "dist", ".vscode", ".gitignore")
    Copy-Item -Path "$source*" -Destination $destination -Recurse -Force -Exclude $excludeList -ErrorAction Stop
    
    Write-Host "Deployment complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Go to Home Assistant Settings > Add-ons" -ForegroundColor White
    Write-Host "2. Click the three dots (top right) > Check for updates" -ForegroundColor White
    Write-Host "3. Install 'ReactiveDash' from local add-ons" -ForegroundColor White
    Write-Host "4. Start the add-on" -ForegroundColor White
    Write-Host ""
    Write-Host "Access the dashboard at: http://$haHost`:3000" -ForegroundColor Cyan
}
catch {
    Write-Host "Deployment failed: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "1. Verify SMB is enabled on Home Assistant" -ForegroundColor White
    Write-Host "2. Check that the network path exists: $destination" -ForegroundColor White
    Write-Host "3. Try pinging the Home Assistant IP: ping $haHost" -ForegroundColor White
    Write-Host "4. Check Windows Firewall SMB rules" -ForegroundColor White
    Write-Host ""
    Write-Host "Alternative: Use SCP or SSH instead if SMB is not available" -ForegroundColor Cyan
    exit 1
}

