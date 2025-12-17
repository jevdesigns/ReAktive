# Enhanced deploy script for ReAktive add-on
param(
    [Parameter(Mandatory=$false)]
    [string]$TargetPath = "Z:\addons\local\reaktive",

    [Parameter(Mandatory=$false)]
    [string]$RemoteHost = "",

    [Parameter(Mandatory=$false)]
    [string]$SSHUser = "root",

    [Parameter(Mandatory=$false)]
    [string]$SSHKey = "",

    [Parameter(Mandatory=$false)]
    [switch]$BuildClient = $false,

    [Parameter(Mandatory=$false)]
    [switch]$SetExec = $false,

    [Parameter(Mandatory=$false)]
    [switch]$UseSCP = $false

    ,
    [Parameter(Mandatory=$false)]
    [switch]$DryRun = $false
)

Write-Host "Deploying ReAktive add-on" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Yellow

function Fail($msg) { Write-Error $msg; exit 1 }

# Helper to run a command and bubble up non-zero exit codes
function Run-Proc($exe, $argList, $workingDir = $PSScriptRoot) {
    if ($argList -eq $null) { $argList = @() }
    $argText = ''
    if ($argList -is [System.Array] -and $argList.Count -gt 0) { $argText = $argList -join ' ' } elseif ($argList) { $argText = $argList }
    Write-Host "[RUN] $exe $argText" -ForegroundColor Cyan
    if ($DryRun) {
        Write-Host "[DRYRUN] Would run: $exe $argText" -ForegroundColor Yellow
        return 0
    }
    # Use PowerShell call operator to execute commands reliably in the current process
    try {
        Push-Location -Path $workingDir
        if ($argList -is [System.Array] -and $argList.Count -gt 0) {
            & $exe @argList
        } elseif ($argText -ne '') {
            & $exe $argText
        } else {
            & $exe
        }
        $exit = $LASTEXITCODE
    } finally {
        Pop-Location
    }
    return $exit
}

# Determine client source directory (prefer reaktive/client if present)
$path1 = Join-Path $PSScriptRoot 'reaktive\client'
$path2 = Join-Path $PSScriptRoot 'client'
$clientPaths = @($path1, $path2)
$clientDir = $clientPaths | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $clientDir) { Write-Warning "No client directory found; skipping build" }

if ($BuildClient) {
    if (-not $clientDir) { Fail "Build requested but no client directory found" }
    Write-Host "[BUILD] Running npm ci && npm run build in: $clientDir" -ForegroundColor Cyan
    $code = Run-Proc 'npm' @('ci') $clientDir
    if ($code -ne 0) { Fail "npm ci failed (exit $code)" }
    $code = Run-Proc 'npm' @('run','build') $clientDir
    if ($code -ne 0) { Fail "npm run build failed (exit $code)" }
}

# Ensure client dist exists
if ($clientDir) {
    $clientDistLocal = Join-Path $clientDir 'dist'
} else {
    $clientDistLocal = Join-Path (Join-Path $PSScriptRoot 'reaktive\client') 'dist'
}
if (-not (Test-Path $clientDistLocal)) {
    Write-Warning "Client dist not found at $clientDistLocal"
    if (-not $BuildClient) { Write-Host "Run with -BuildClient to build before deploying" -ForegroundColor Yellow }
    Fail "Client build artifacts missing"
}

# Copy strategy: SCP (ssh) or SMB/drive (default)
if ($RemoteHost -and $UseSCP) {
    # Use scp to copy files to remote host. TargetPath expected to be remote absolute path (e.g. /config/addons/local/reaktive)
    Write-Host ("[SCP] Copying files to {0}@{1}:{2}" -f $SSHUser, $RemoteHost, $TargetPath) -ForegroundColor Cyan

    # Build a temp archive folder to copy from
    $tmp = Join-Path $env:TEMP "reaktive_deploy_$(Get-Random)"
    Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction SilentlyContinue
    New-Item -ItemType Directory -Path $tmp | Out-Null

    # Copy addon root files
    $addonFiles = @('config.yaml','Dockerfile','nginx.conf','run.sh','README.md','CHANGELOG.md')
    foreach ($f in $addonFiles) {
        $src = Join-Path $PSScriptRoot "reaktive\$f"
        if (Test-Path $src) {
            if ($DryRun) { Write-Host "[DRYRUN] Would copy $src -> $tmp" -ForegroundColor Yellow } else { Copy-Item $src -Destination $tmp -Force -Recurse }
        } else { Write-Warning "Missing: $src" }
    }

    # Copy client dist into tmp/client/dist
    $tmpClientDist = Join-Path $tmp 'client\dist'
    if ($DryRun) { Write-Host "[DRYRUN] Would create directory: $tmpClientDist" -ForegroundColor Yellow } else { New-Item -ItemType Directory -Path $tmpClientDist -Force | Out-Null }
    $rcArgs = @($clientDistLocal, $tmpClientDist, '/MIR')
    $rc = Run-Proc 'robocopy' $rcArgs
    if ($rc -ge 8) { Fail "robocopy failed copying dist to temp (exit $rc)" }

    # Use scp to copy recursive. If SSHKey provided use -i
    $scpArgs = @('-r')
    if ($SSHKey) { $scpArgs += @('-i', $SSHKey) }
    $remoteDest = "$SSHUser@${RemoteHost}:`"${TargetPath}`""
    $scpArgs += @($tmp + '\*', $remoteDest)
    if ($DryRun) { Write-Host ("[DRYRUN] Would run: scp {0} {1}" -f ($scpArgs[0]), ($scpArgs[1])) -ForegroundColor Yellow; $scpExit = 0 } else { $scpExit = Run-Proc 'scp' $scpArgs }
    if ($scpExit -ne 0) { Fail "scp failed (exit $scpExit)" }

    if ($SetExec) {
        $sshCmd = "chmod +x `"$TargetPath/run.sh`""
        $sshArgs = @()
        if ($SSHKey) { $sshArgs += @('-i', $SSHKey) }
        $sshArgs += @("$SSHUser@$RemoteHost", $sshCmd)
        if ($DryRun) { Write-Host "[DRYRUN] Would run: ssh $($sshArgs -join ' ')" -ForegroundColor Yellow } else { $sshExit = Run-Proc 'ssh' $sshArgs; if ($sshExit -ne 0) { Write-Warning "ssh chmod returned exit $sshExit" } }
    }

    if ($DryRun) { Write-Host "[DRYRUN] Would remove temp folder: $tmp" -ForegroundColor Yellow } else { Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction SilentlyContinue }
    Write-Host "[OK] SCP deployment completed" -ForegroundColor Green
    exit 0
}

# SMB / Drive-based deployment (local or network share)
Write-Host "[COPY] Using SMB/drive-based deployment to $TargetPath" -ForegroundColor Cyan

$useTempDrive = $false
if ($RemoteHost) {
    # Map \RemoteHost\config to a drive letter (Y:)
    $remoteRoot = "\\$RemoteHost\config"
    $drive = 'Y:'
    try {
        if (Get-PSDrive -Name Y -ErrorAction SilentlyContinue) { Remove-PSDrive -Name Y -Force -ErrorAction SilentlyContinue }
        if ($DryRun) { Write-Host "[DRYRUN] Would map $remoteRoot to $drive" -ForegroundColor Yellow } else { New-PSDrive -Name Y -PSProvider FileSystem -Root $remoteRoot -ErrorAction Stop | Out-Null }
        Write-Host "[OK] Mapped $remoteRoot to $drive" -ForegroundColor Green
        $TargetPath = $TargetPath -replace '^Z:','Y:'
        $useTempDrive = $true
    } catch {
        Fail "Failed to map network share $remoteRoot : $_"
    }
}

# Ensure directories exist
try {
    if (-not (Test-Path $TargetPath)) { if ($DryRun) { Write-Host "[DRYRUN] Would create directory: $TargetPath" -ForegroundColor Yellow } else { New-Item -ItemType Directory -Path $TargetPath -Force | Out-Null }; Write-Host "  Created: $TargetPath" -ForegroundColor White } else { Write-Host "  Directory exists: $TargetPath" -ForegroundColor White }
    $clientDistTarget = Join-Path $TargetPath 'client\dist'
    if (-not (Test-Path $clientDistTarget)) { if ($DryRun) { Write-Host "[DRYRUN] Would create directory: $clientDistTarget" -ForegroundColor Yellow } else { New-Item -ItemType Directory -Path $clientDistTarget -Force | Out-Null }; Write-Host "  Created: $clientDistTarget" -ForegroundColor White } else { Write-Host "  Directory exists: $clientDistTarget" -ForegroundColor White }
} catch { Fail "Failed creating target directories: $_" }

# Copy addon root files
$addonFiles = @('config.yaml','Dockerfile','nginx.conf','run.sh','README.md','CHANGELOG.md')
Write-Host "[COPYING] Add-on files..." -ForegroundColor Cyan
foreach ($f in $addonFiles) {
    $src = Join-Path $PSScriptRoot "reaktive\$f"
    $dst = Join-Path $TargetPath $f
    if (Test-Path $src) {
        try { if ($DryRun) { Write-Host "[DRYRUN] Would copy $src -> $dst" -ForegroundColor Yellow } else { Copy-Item -Path $src -Destination $dst -Force -Recurse }; Write-Host "  [OK] $f" -ForegroundColor Green } catch { Write-Warning "  [WARN] Failed to copy $f : $_" }
    } else { Write-Warning "  [WARN] Source not found: $src" }
}

# Copy client dist using robocopy for reliability
Write-Host "[COPYING] Client files to $clientDistTarget" -ForegroundColor Cyan
$rcArgs = @($clientDistLocal, $clientDistTarget, '/MIR')
if ($DryRun) { Write-Host "[DRYRUN] Would run: robocopy $clientDistLocal $clientDistTarget /MIR" -ForegroundColor Yellow } else { $rc = Run-Proc 'robocopy' $rcArgs; if ($rc -ge 8) { Fail "robocopy failed copying dist (exit $rc)" } }

if ($SetExec) {
    if ($RemoteHost -and -not $useTempDrive) { Write-Warning "-SetExec specified but no remote mapping available" }
    if ($RemoteHost -and $useTempDrive) {
        Write-Host "[INFO] Cannot set Linux executable bit over SMB. Consider using -UseSCP with -SetExec to run chmod via SSH." -ForegroundColor Yellow
    }
}

Write-Host "" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host "  Deployment Complete!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host "" -ForegroundColor Green
Write-Host "Add-on deployed to: $TargetPath" -ForegroundColor Cyan
Write-Host "" -ForegroundColor Green

if ($useTempDrive) {
    Write-Host "[CLEANUP] Removing temporary network drive..." -ForegroundColor Cyan
    Remove-PSDrive -Name Y -Force -ErrorAction SilentlyContinue
}

Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Open Home Assistant -> Settings -> Add-ons" -ForegroundColor White
Write-Host "2. Refresh add-on list and install/reinstall 'ReAktive'" -ForegroundColor White
Write-Host "3. Wait for Supervisor to build the image and start the add-on" -ForegroundColor White
Write-Host "4. Access dashboard at: http://<ha-host>:3000" -ForegroundColor Cyan
Write-Host "" -ForegroundColor Green
Write-Host "Usage Examples:" -ForegroundColor Yellow
Write-Host "  Local (mapped Z:):   .\deploy_to_z.ps1" -ForegroundColor White
Write-Host "  Build then deploy:    .\deploy_to_z.ps1 -BuildClient" -ForegroundColor White
Write-Host "  Remote via SMB:      .\deploy_to_z.ps1 -RemoteHost 192.168.1.100 -TargetPath 'Y:\addons\local\reaktive'" -ForegroundColor White
Write-Host "  Remote via SCP+SSH:  .\deploy_to_z.ps1 -RemoteHost 10.0.0.5 -UseSCP -SSHUser root -TargetPath '/config/addons/local/reaktive' -SetExec -SSHKey C:\keys\id_rsa" -ForegroundColor White
