# Watch all React source files for changes, auto-build and deploy
$sourceBase = "D:\HA\ReactiveWork\client\src"
$destinationBase = "\\192.168.1.243\config\addons\local\reactivedash\client"

Write-Host "Starting file watcher for React app with auto-build..." -ForegroundColor Green
Write-Host "Source: $sourceBase" -ForegroundColor Cyan
Write-Host "Destination: $destinationBase" -ForegroundColor Cyan
Write-Host "Watching: *.jsx, *.js, *.css in src/ and subdirectories" -ForegroundColor Cyan
Write-Host "Auto-building with Vite on changes..." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

$script:lastBuildTime = [DateTime]::MinValue
$script:buildDebounceSeconds = 2

$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $sourceBase
$watcher.Filter = "*.*"
$watcher.IncludeSubdirectories = $true
$watcher.EnableRaisingEvents = $true
$watcher.NotifyFilter = [System.IO.NotifyFilters]::LastWrite

$action = {
    param($source, $e)
    
    $filePath = $e.FullPath
    $changeType = $e.ChangeType
    
    if ($filePath -notmatch '\.(jsx|js|css)$') {
        return
    }
    
    $timestamp = Get-Date -Format "HH:mm:ss"
    $relativePath = $filePath.Replace("D:\HA\ReactiveWork\client\src\", "")
    
    Write-Host "[$timestamp] $changeType detected: $relativePath" -ForegroundColor Yellow
    
    $now = Get-Date
    if (($now - $script:lastBuildTime).TotalSeconds -lt $script:buildDebounceSeconds) {
        Write-Host "[$timestamp] Debouncing build..." -ForegroundColor Gray
        return
    }
    $script:lastBuildTime = $now
    
    Start-Sleep -Milliseconds 500
    
    try {
        $destinationPath = $filePath.Replace("D:\HA\ReactiveWork\client\src", "\\192.168.1.243\config\addons\local\reactivedash\client\src")
        $destinationDir = Split-Path $destinationPath
        
        if (!(Test-Path $destinationDir)) {
            New-Item -ItemType Directory -Path $destinationDir -Force | Out-Null
        }
        
        Copy-Item -Path $filePath -Destination $destinationPath -Force
        Write-Host "[$timestamp] Source copied: $relativePath" -ForegroundColor Cyan
        
        Write-Host "[$timestamp] Building app..." -ForegroundColor Yellow
        & npm --prefix "D:\HA\ReactiveWork\client" run build 2>&1 | Out-Null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[$timestamp] Build successful" -ForegroundColor Green
            
            Write-Host "[$timestamp] Deploying dist folder..." -ForegroundColor Yellow
            $distSource = "D:\HA\ReactiveWork\client\dist\*"
            $distDest = "\\192.168.1.243\config\addons\local\reactivedash\client\dist\"
            
            Copy-Item -Path $distSource -Destination $distDest -Recurse -Force
            Write-Host "[$timestamp] Deployed - Refresh browser!" -ForegroundColor Green
            Write-Host ""
        } else {
            Write-Host "[$timestamp] Build failed!" -ForegroundColor Red
        }
    }
    catch {
        Write-Host "[$timestamp] Error: $_" -ForegroundColor Red
    }
}

Register-ObjectEvent -InputObject $watcher -EventName Changed -Action $action -SourceIdentifier FileChanged | Out-Null

Write-Host "Watcher is active. Make changes to your files..." -ForegroundColor Green
Write-Host ""

try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
}
finally {
    Unregister-Event -SourceIdentifier FileChanged -ErrorAction SilentlyContinue
    $watcher.Dispose()
    Write-Host "Watcher stopped." -ForegroundColor Yellow
}
