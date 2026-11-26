[CmdletBinding()]
param(
    [string]$Apk,
    [string]$Package = "com.utopia.pxviewr.exp",
    [string]$Device = "127.0.0.1:16384"
)

$ErrorActionPreference = "Stop"

# Safety guard: NEVER touch production package
if ($Package -eq "com.utopia.pxviewr") {
    Write-Error "Safety guard triggered: refusing to run against production package $Package"
    exit 2
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "../..")
$smokeDir = Join-Path $repoRoot "smoke-out"
if (-not (Test-Path $smokeDir)) {
    New-Item -ItemType Directory -Force -Path $smokeDir | Out-Null
}
$smokeDir = (Resolve-Path $smokeDir).Path

Write-Host "=== PXView Android Smoke Test ==="
Write-Host "Device:    $Device"
Write-Host "Package:   $Package"
if ($Apk) {
    Write-Host "APK:       $Apk"
}
Write-Host "OutputDir: $smokeDir"

# 1. Install APK if provided
if ($Apk) {
    if (-not (Test-Path $Apk)) {
        Write-Error "APK file not found: $Apk"
        exit 1
    }
    Write-Host "[1/6] Installing APK..."
    adb -s $Device install -r $Apk
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to install APK"
        exit 1
    }
} else {
    Write-Host "[1/6] No APK specified, assuming already installed."
}

# 2. Clear logcat
Write-Host "[2/6] Clearing logcat..."
adb -s $Device logcat -c

# 3. Start app
Write-Host "[3/6] Starting application..."
adb -s $Device shell am start -n "$Package/.MainActivity"

# 4. Wait 30 seconds
Write-Host "[4/6] Waiting 30 seconds..."
Start-Sleep -Seconds 30

# 5. Screenshot
Write-Host "[5/6] Capturing screenshot..."
$screenRemote = "/data/local/tmp/smoke-screen-$Package.png"
$screenLocal = Join-Path $smokeDir "screenshot.png"
adb -s $Device shell screencap -p $screenRemote
adb -s $Device pull $screenRemote $screenLocal
adb -s $Device shell rm -f $screenRemote

# 6. Check process liveness & grab AndroidRuntime:E and ReactNativeJS:E
Write-Host "[6/6] Checking logs and process liveness..."
$pidText = (adb -s $Device shell pidof $Package) -join ""
$pidText = $pidText.Trim()
$isAlive = -not [string]::IsNullOrWhiteSpace($pidText)

$logcatOutput = adb -s $Device logcat -d -s AndroidRuntime:E ReactNativeJS:E
$logcatPath = Join-Path $smokeDir "error.log"
Set-Content -Path $logcatPath -Value $logcatOutput -Encoding UTF8

$fullLog = adb -s $Device logcat -d
$fullLogPath = Join-Path $smokeDir "logcat_full.log"
Set-Content -Path $fullLogPath -Value $fullLog -Encoding UTF8

# Parse for fatal crash or JS errors
$hasFatal = $false
$firstError = ""

foreach ($line in $logcatOutput) {
    if ($line -match "(FATAL EXCEPTION|ReactNativeJS.*Error|ReactNativeJS:E|AndroidRuntime:E)") {
        $hasFatal = $true
        if (-not $firstError) {
            $firstError = $line.Trim()
        }
    }
}

if (-not $firstError -and -not $isAlive) {
    foreach ($line in $fullLog) {
        if ($line -match "$Package.*(FATAL|died|crash)") {
            $hasFatal = $true
            if (-not $firstError) {
                $firstError = $line.Trim()
            }
        }
    }
}

if (-not $firstError -and $logcatOutput.Count -gt 0) {
    $firstError = ($logcatOutput | Where-Object { $_.Trim().Length -gt 0 } | Select-Object -First 1)
}

Write-Host "--- Smoke Results ---"
Write-Host "Process Alive: $isAlive (PID: $pidText)"
Write-Host "Crash Detected: $hasFatal"
Write-Host "Screenshot: $screenLocal"
Write-Host "Error Log:  $logcatPath"

if ($firstError) {
    Write-Host "First Error: $firstError"
    $firstErrorPath = Join-Path $smokeDir "first_error.txt"
    Set-Content -Path $firstErrorPath -Value $firstError -Encoding UTF8
}

if ($isAlive -and -not $hasFatal -and [string]::IsNullOrWhiteSpace($firstError)) {
    Write-Host "Smoke Test: PASSED"
    exit 0
} else {
    Write-Host "Smoke Test: FAILED (Expected at this stage: app crashed on launch)"
    exit 1
}
