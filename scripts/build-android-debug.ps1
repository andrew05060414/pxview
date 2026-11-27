Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path $PSScriptRoot -Parent
Set-Location $repoRoot

. "$PSScriptRoot\use-android-jdk21.ps1"

& "$PSScriptRoot\test-jest.ps1"
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

$archs = if ($env:PXVIEW_ANDROID_ARCHS) { $env:PXVIEW_ANDROID_ARCHS } else { 'arm64-v8a,x86_64' }

Set-Location "$repoRoot\android"
$buildSlot = if ($env:BUILD_SLOT_PATH) { $env:BUILD_SLOT_PATH } else { 'D:\Andrew\Code\tools\build-slot.js' }
if (-not $env:CI -and (Test-Path $buildSlot) -and (Get-Command node -ErrorAction SilentlyContinue)) {
  & node $buildSlot --queue compile -- .\gradlew.bat assembleDebug --no-daemon "-PreactNativeArchitectures=$archs"
} else {
  & .\gradlew.bat assembleDebug --no-daemon "-PreactNativeArchitectures=$archs"
}
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}
