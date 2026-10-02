param(
    [string]$DeviceId = "127.0.0.1:16384",
    [string]$PackageName = "com.utopia.pxviewr.exp",
    [string]$OutputDir = "smoke-out",
    [string[]]$Pages = @("home", "search", "detail", "settings", "images_viewer")
)

$ErrorActionPreference = "Stop"

Write-Host "=== PXView Exp Automated Screenshots ===" -ForegroundColor Cyan
Write-Host "Target Device: $DeviceId" -ForegroundColor Yellow
Write-Host "Package Name:  $PackageName" -ForegroundColor Yellow
Write-Host "Output Dir:    $OutputDir" -ForegroundColor Yellow

# Ensure output directory exists
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
}

# Connect and verify device
$devList = adb devices
if ($devList -notmatch [regex]::Escape($DeviceId)) {
    Write-Host "Connecting to $DeviceId..."
    adb connect $DeviceId | Out-Null
}

$devState = (adb -s $DeviceId get-state 2>&1).Trim()
if ($devState -ne "device") {
    Write-Error "Device $DeviceId is not ready (state: $devState). Ensure the target emulator is running on $DeviceId."
    exit 1
}

$hasFailure = $false
$summary = @()

foreach ($page in $Pages) {
    Write-Host "`n--- Testing Screen: $page ---" -ForegroundColor Cyan
    
    # 1. Clear logcat and force stop package
    adb -s $DeviceId logcat -c
    adb -s $DeviceId shell am force-stop $PackageName | Out-Null
    
    # 2. Launch test entrance via intent extra
    Write-Host "Launching $PackageName for test_screen: $page"
    $startOutput = adb -s $DeviceId shell am start -W -n "$PackageName/.MainActivity" --es test_screen $page
    
    # 3. Wait for render
    Start-Sleep -Seconds 4
    
    # 4. Check if process is still running
    $pidOutput = (adb -s $DeviceId shell pidof $PackageName 2>&1).Trim()
    if (-not $pidOutput) {
        Write-Host "CRASH: Process $PackageName is not running for $page!" -ForegroundColor Red
        $hasFailure = $true
    }
    
    # 5. Capture screenshot
    $remotePath = "/sdcard/${page}.png"
    $localPath = Join-Path $OutputDir "${page}.png"
    adb -s $DeviceId shell screencap -p $remotePath | Out-Null
    adb -s $DeviceId pull $remotePath $localPath | Out-Null
    adb -s $DeviceId shell rm $remotePath | Out-Null
    
    if (-not (Test-Path $localPath)) {
        Write-Host "ERROR: Screenshot file was not saved to $localPath" -ForegroundColor Red
        $hasFailure = $true
    } else {
        $size = (Get-Item $localPath).Length
        Write-Host "Screenshot saved: $localPath ($size bytes)" -ForegroundColor Green
    }
    
    # 6. Check logcat errors
    $logcat = (adb -s $DeviceId logcat -d -s AndroidRuntime:E ReactNativeJS:E 2>&1) -join "`n"
    $crashErrors = ""
    if ($logcat -match "FATAL EXCEPTION" -or $logcat -match "ReactNativeJS:E" -or $logcat -match "AndroidRuntime:E") {
        Write-Host "LOGCAT ERRORS DETECTED for ${page}:" -ForegroundColor Red
        Write-Host $logcat -ForegroundColor Red
        $hasFailure = $true
        $crashErrors = $logcat
    } else {
        Write-Host "Logcat check clean (no AndroidRuntime:E or ReactNativeJS:E)." -ForegroundColor Green
    }
    
    $summary += [PSCustomObject]@{
        Screen     = $page
        PID        = $pidOutput
        Screenshot = $localPath
        Status     = if ($pidOutput -and -not $crashErrors) { "PASS" } else { "FAIL" }
    }
}

Write-Host "`n=== Final Screenshot Test Results ===" -ForegroundColor Cyan
$summary | Format-Table -AutoSize

if ($hasFailure) {
    Write-Host "'L One or more screens failed or crashed!" -ForegroundColor Red
    exit 1
} else {
    Write-Host "' All screens rendered successfully without crash or red screen!" -ForegroundColor Green
    exit 0
}