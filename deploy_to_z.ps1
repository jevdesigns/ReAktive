# Deploy ReAktive Add-on to Home Assistant (Local or Remote)
param(
    [Parameter(Mandatory=$false)]
    [string]$HAHost = "homeassistant.local",
    
    [Parameter(Mandatory=$false)]
    [string]$HAUsername = "admin",
    
    [Parameter(Mandatory=$false)]
    [string]$HAPassword = "a12b34c56d",
    
    [Parameter(Mandatory=$false)]
    [string]$ZDrivePath = "Z:\addons\local\reaktive",
    
    [Parameter(Mandatory=$false)]
    [switch]$Remote = $false
)

Write-Host "Deploying ReAktive NGINX Add-on" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Yellow

# Try Z: drive first (local mapped drive)
if ((Test-Path "Z:\") -and !$Remote) {
    Write-Host "[OK] Z: drive found - using local deployment" -ForegroundColor Green
    $UseLocal = $true
} else {
    # Use remote deployment via network path
    Write-Host "[REMOTE] Using remote deployment to \\$HAHost\config" -ForegroundColor Cyan
    $UseLocal = $false
    
    # Try to connect with credentials if provided
    if ($HAUsername -and $HAPassword) {
        Write-Host "[AUTH] Authenticating to Home Assistant..." -ForegroundColor Cyan
        try {
            $SecurePassword = ConvertTo-SecureString $HAPassword -AsPlainText -Force
            $Credential = New-Object System.Management.Automation.PSCredential($HAUsername, $SecurePassword)
            
            # Map network drive temporarily
            $TempDrive = "Y:"
            if (Test-Path $TempDrive) {
                Remove-PSDrive -Name "Y" -Force -ErrorAction SilentlyContinue
            }
            
            New-PSDrive -Name "Y" -PSProvider FileSystem -Root "\\$HAHost\config" -Credential $Credential -Persist -ErrorAction Stop | Out-Null
            $ZDrivePath = "Y:\addons\local\reaktive"
            Write-Host "[OK] Connected to Home Assistant at $TempDrive" -ForegroundColor Green
        } catch {
            Write-Error "[ERROR] Failed to connect to Home Assistant: $_"
            Write-Host "[INFO] Make sure Samba add-on is installed and running in Home Assistant" -ForegroundColor Yellow
            exit 1
        }
    }
}

Write-Host "[OK] Target path configured" -ForegroundColor Green

# Create the add-on directory structure
$addonDir = $ZDrivePath
$clientDistDir = Join-Path $addonDir "client\dist"

Write-Host "[CREATING] Directory structure..." -ForegroundColor Cyan
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
    Write-Error "[ERROR] Failed to create directories: $_"
    exit 1
}

# Files to copy to add-on root
$addonFiles = @(
    "config.yaml",
    "Dockerfile",
    "nginx.conf",
    "run.sh",
    "README.md",
    "CHANGELOG.md"
)

Write-Host "[COPYING] Add-on files..." -ForegroundColor Cyan
foreach ($file in $addonFiles) {
    $sourcePath = Join-Path $PSScriptRoot $file
    $destPath = Join-Path $addonDir $file

    if (Test-Path $sourcePath) {
        try {
            Copy-Item -Path $sourcePath -Destination $destPath -Force
            Write-Host "  [OK] $file" -ForegroundColor Green
        } catch {
            Write-Error "  [ERROR] Failed to copy $file : $_"
        }
    } else {
        Write-Warning "  [WARN] Source file not found: $sourcePath"
    }
}

# Copy client dist files
Write-Host "[COPYING] Client files..." -ForegroundColor Cyan
$clientSource = Join-Path $PSScriptRoot "client\dist"
if (Test-Path $clientSource) {
    try {
        # Use robocopy for reliable copying
        $robocopyArgs = @($clientSource, $clientDistDir, "/MIR")
        $robocopyResult = Start-Process -FilePath "robocopy" -ArgumentList $robocopyArgs -NoNewWindow -Wait -PassThru

        if ($robocopyResult.ExitCode -lt 8) {
            Write-Host "  [OK] Client files copied successfully" -ForegroundColor Green
        } else {
            Write-Error "  [ERROR] Robocopy failed with exit code $($robocopyResult.ExitCode)"
        }
    } catch {
        Write-Error "  [ERROR] Failed to copy client files: $_"
    }
} else {
    Write-Error "  [ERROR] Client dist directory not found: $clientSource"
    Write-Host "  [INFO] Run 'npm run build' in the client directory first" -ForegroundColor Yellow
    exit 1
}

Write-Host "" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host "  Deployment Complete!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host "" -ForegroundColor Green
Write-Host "Add-on deployed to: $addonDir" -ForegroundColor Cyan
Write-Host "" -ForegroundColor Green

# Clean up temporary drive if used
if (!$UseLocal -and (Test-Path "Y:")) {
    Write-Host "[CLEANUP] Removing temporary network drive..." -ForegroundColor Cyan
    Remove-PSDrive -Name "Y" -Force -ErrorAction SilentlyContinue
}

Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Open Home Assistant -> Settings -> Add-ons" -ForegroundColor White
Write-Host "2. Click 'Check for updates' to refresh add-on list" -ForegroundColor White
Write-Host "3. Find 'ReAktive' in local add-ons" -ForegroundColor White
Write-Host "4. Click 'Install' (or 'Reinstall' if already installed)" -ForegroundColor White
Write-Host "5. Wait for Docker build to complete (~1-2 minutes)" -ForegroundColor White
Write-Host "6. Click 'Start' to run the add-on" -ForegroundColor White
Write-Host "7. Access dashboard at: http://$HAHost`:3000" -ForegroundColor Cyan
Write-Host "" -ForegroundColor Green
Write-Host "Your NGINX-powered dashboard is ready!" -ForegroundColor Green
Write-Host "" -ForegroundColor Green
Write-Host "Usage Examples:" -ForegroundColor Yellow
Write-Host "  Local (Z: drive):  .\deploy_to_z.ps1" -ForegroundColor White
Write-Host "  Remote:            .\deploy_to_z.ps1 -Remote" -ForegroundColor White
Write-Host "  Custom host:       .\deploy_to_z.ps1 -HAHost 192.168.1.100" -ForegroundColor White
