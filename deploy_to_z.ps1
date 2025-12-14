# Deploy ReactiveDash Add-on to Z: Drive (Local Home Assistant)
param(
    [Parameter(Mandatory=$false)]
    [string]$ZDrivePath = "Z:\addons\local\reactivedash"
)

Write-Host "🚀 Deploying ReactiveDash NGINX Add-on to Z: Drive" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Yellow

# Check if Z: drive exists
if (!(Test-Path "Z:\")) {
    Write-Error "❌ Z: drive not found. Please make sure your Home Assistant share is mapped to Z:"
    Write-Host "How to map Z: drive:" -ForegroundColor Yellow
    Write-Host "1. Open File Explorer" -ForegroundColor White
    Write-Host "2. Right-click 'This PC' → 'Map network drive'" -ForegroundColor White
    Write-Host "3. Drive: Z:" -ForegroundColor White
    Write-Host "4. Folder: \\homeassistant.local\config (or your HA IP)" -ForegroundColor White
    Write-Host "5. Check 'Reconnect at sign-in'" -ForegroundColor White
    exit 1
}

Write-Host "✅ Z: drive found" -ForegroundColor Green

# Create the add-on directory structure
$addonDir = $ZDrivePath
$clientDistDir = Join-Path $addonDir "client\dist"

Write-Host "📁 Creating directory structure..." -ForegroundColor Cyan
try {
    if (!(Test-Path $addonDir)) {
        New-Item -ItemType Directory -Path $addonDir -Force | Out-Null
        Write-Host "  Created: $addonDir" -ForegroundColor White
    } else {
        Write-Host "  Directory exists: $addonDir" -ForegroundColor White
    }

    if (!(Test-Path $clientDistDir)) {
        New-Item -ItemType Directory -Path $clientDistDir -Force | Out-Null
        Write-Host "  Created: $clientDistDir" -ForegroundColor White
    } else {
        Write-Host "  Directory exists: $clientDistDir" -ForegroundColor White
    }
} catch {
    Write-Error "❌ Failed to create directories: $_"
    exit 1
}

# Files to copy to add-on root
$addonFiles = @(
    "addon.yaml",
    "Dockerfile",
    "nginx.conf",
    "run.sh"
)

Write-Host "📋 Copying add-on files..." -ForegroundColor Cyan
foreach ($file in $addonFiles) {
    $sourcePath = Join-Path $PSScriptRoot $file
    $destPath = Join-Path $addonDir $file

    if (Test-Path $sourcePath) {
        try {
            Copy-Item -Path $sourcePath -Destination $destPath -Force
            Write-Host "  ✅ $file" -ForegroundColor Green
        } catch {
            Write-Error "  ❌ Failed to copy $file : $_"
        }
    } else {
        Write-Warning "  ⚠️  Source file not found: $sourcePath"
    }
}

# Copy client dist files
Write-Host "🌐 Copying client files..." -ForegroundColor Cyan
$clientSource = Join-Path $PSScriptRoot "client\dist"
if (Test-Path $clientSource) {
    try {
        # Use robocopy for reliable copying
        $robocopyArgs = @($clientSource, $clientDistDir, "/MIR")
        $robocopyResult = Start-Process -FilePath "robocopy" -ArgumentList $robocopyArgs -NoNewWindow -Wait -PassThru

        if ($robocopyResult.ExitCode -lt 8) {
            Write-Host "  ✅ Client files copied successfully" -ForegroundColor Green
        } else {
            Write-Error "  ❌ Robocopy failed with exit code $($robocopyResult.ExitCode)"
        }
    } catch {
        Write-Error "  ❌ Failed to copy client files: $_"
    }
} else {
    Write-Error "  ❌ Client dist directory not found: $clientSource"
    Write-Host "  💡 Run 'npm run build' in the client directory first" -ForegroundColor Yellow
    exit 1
}

Write-Host "" -ForegroundColor Green
Write-Host "🎉 Deployment Complete!" -ForegroundColor Green
Write-Host "======================" -ForegroundColor Green
Write-Host "" -ForegroundColor Green
Write-Host "📍 Add-on deployed to: $addonDir" -ForegroundColor Cyan
Write-Host "" -ForegroundColor Green
Write-Host "🔧 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Open Home Assistant → Settings → Add-ons" -ForegroundColor White
Write-Host "2. Find 'ReactiveDash' in local add-ons" -ForegroundColor White
Write-Host "3. Click 'Install' (or 'Reinstall' if already installed)" -ForegroundColor White
Write-Host "4. Wait for Docker build to complete" -ForegroundColor White
Write-Host "5. Click 'Start' to run the add-on" -ForegroundColor White
Write-Host "6. Access dashboard at: http://homeassistant.local:3000" -ForegroundColor White
Write-Host "" -ForegroundColor Green
Write-Host "✨ Your NGINX-powered dashboard is ready!" -ForegroundColor Green