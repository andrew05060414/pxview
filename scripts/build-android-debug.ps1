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
& .\gradlew.bat assembleDebug --no-daemon "-PreactNativeArchitectures=$archs"
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}
