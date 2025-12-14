# Automated Raspberry Pi Update Script for ReactiveDash NGINX Redesign
# This script will SSH into your Raspberry Pi and update the Home Assistant add-on

param(
    [Parameter(Mandatory=$true)]
    [string]$RaspberryPiIP,

    [Parameter(Mandatory=$true)]
    [string]$SSHUsername,

    [Parameter(Mandatory=$false)]
    [string]$SSHPassword,

    [Parameter(Mandatory=$false)]
    [string]$SSHKeyPath,

    [Parameter(Mandatory=$false)]
    [string]$HAConfigPath = "/config",

    [Parameter(Mandatory=$false)]
    [switch]$UsePasswordAuth
)

Write-Host "🚀 Starting Automated Raspberry Pi Update for ReactiveDash NGINX Redesign" -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Yellow

# Validate parameters
if ($UsePasswordAuth -and -not $SSHPassword) {
    Write-Error "SSH password is required when using -UsePasswordAuth"
    exit 1
}

if (-not $UsePasswordAuth -and -not $SSHKeyPath) {
    $SSHKeyPath = "$env:USERPROFILE\.ssh\id_rsa"
    if (-not (Test-Path $SSHKeyPath)) {
        Write-Error "No SSH key found at $SSHKeyPath. Use -UsePasswordAuth or specify -SSHKeyPath"
        exit 1
    }
}

# Build SSH command
$sshCommand = "ssh"
if (-not $UsePasswordAuth) {
    $sshCommand += " -i `"$SSHKeyPath`""
}
$sshCommand += " ${SSHUsername}@${RaspberryPiIP}"

Write-Host "📡 Connecting to Raspberry Pi at ${RaspberryPiIP}..." -ForegroundColor Cyan

# Test SSH connection
Write-Host "🔍 Testing SSH connection..." -ForegroundColor Yellow
$testCommand = "$sshCommand 'echo `"SSH connection successful`"'"
try {
    $testResult = Invoke-Expression $testCommand 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ SSH connection successful" -ForegroundColor Green
    } else {
        throw "SSH test failed"
    }
} catch {
    Write-Error "❌ SSH connection failed. Please check your credentials and network."
    Write-Host "Troubleshooting tips:" -ForegroundColor Yellow
    Write-Host "1. Make sure SSH is enabled on your Raspberry Pi"
    Write-Host "2. Verify the IP address is correct"
    Write-Host "3. Check SSH key permissions (should be 600)"
    Write-Host "4. Try: ssh ${SSHUsername}@${RaspberryPiIP} manually first"
    exit 1
}

# Execute update commands on Raspberry Pi
$updateCommands = @"
echo "📁 Navigating to Home Assistant config directory..."
cd ${HAConfigPath}

echo "📥 Pulling latest changes from GitHub..."
git pull origin master

if [ `$? -eq 0 ]; then
    echo "✅ Git pull successful"
else
    echo "❌ Git pull failed"
    exit 1
fi

echo "🔨 Rebuilding ReactiveDash add-on..."
curl -X POST "http://localhost:8123/api/hassio/addons/local_reactivedash/rebuild" \
  -H "Authorization: Bearer `${SUPERVISOR_TOKEN}" \
  -H "Content-Type: application/json"

if [ `$? -eq 0 ]; then
    echo "✅ Add-on rebuild initiated"
    echo ""
    echo "⏳ Waiting for rebuild to complete..."
    sleep 30
    echo "🔍 Checking add-on status..."
    curl -s "http://localhost:8123/api/hassio/addons/local_reactivedash/info" \
      -H "Authorization: Bearer `${SUPERVISOR_TOKEN}" | grep -o '"state":"[^"]*"' | head -1
else
    echo "❌ Add-on rebuild failed, trying alternative method..."
    echo "You may need to rebuild manually via Home Assistant UI:"
    echo "Settings → Add-ons → ReactiveDash → Uninstall → Install"
fi

echo ""
echo "🎉 Update process completed!"
echo "📊 Check your dashboard at: http://${RaspberryPiIP}:3000"
echo ""
echo "🔧 What changed:"
echo "  • Node.js server → NGINX web server"
echo "  • ~50MB memory → ~10MB memory"
echo "  • HA ingress → Direct port access"
echo "  • All features preserved (WebSocket, dynamic discovery, etc.)"
"@

Write-Host "🔄 Executing update commands on Raspberry Pi..." -ForegroundColor Cyan
Write-Host "This may take a few minutes..." -ForegroundColor Yellow

# Execute the commands
$fullCommand = "$sshCommand `"$updateCommands`""
try {
    Invoke-Expression $fullCommand
    if ($LASTEXITCODE -eq 0) {
        Write-Host "" -ForegroundColor Green
        Write-Host "✅ Raspberry Pi update completed successfully!" -ForegroundColor Green
        Write-Host "" -ForegroundColor Green
        Write-Host "🌐 Access your updated dashboard at: http://${RaspberryPiIP}:3000" -ForegroundColor Cyan
        Write-Host "" -ForegroundColor Green
        Write-Host "📋 Next steps:" -ForegroundColor Yellow
        Write-Host "1. Open Home Assistant → Settings → Add-ons → ReactiveDash" -ForegroundColor White
        Write-Host "2. Check the logs to ensure NGINX started correctly" -ForegroundColor White
        Write-Host "3. Test the dashboard functionality" -ForegroundColor White
        Write-Host "4. Enjoy your faster, more efficient dashboard!" -ForegroundColor White
    } else {
        Write-Error "❌ Update commands failed with exit code $LASTEXITCODE"
        Write-Host "You may need to run the commands manually on your Raspberry Pi:" -ForegroundColor Yellow
        Write-Host "1. SSH into your Raspberry Pi" -ForegroundColor White
        Write-Host "2. cd ${HAConfigPath}" -ForegroundColor White
        Write-Host "3. git pull origin master" -ForegroundColor White
        Write-Host "4. Rebuild the add-on via Home Assistant UI" -ForegroundColor White
    }
} catch {
    Write-Error "❌ Failed to execute update commands: $_"
    Write-Host "Manual intervention may be required." -ForegroundColor Red
}