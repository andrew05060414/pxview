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
$keystorePath = if ($env:PXVIEW_KEYSTORE_PATH) { $env:PXVIEW_KEYSTORE_PATH } else { "$repoRoot/android/app/debug.keystore" }
$keystorePassword = if ($env:PXVIEW_KEYSTORE_PASSWORD) { $env:PXVIEW_KEYSTORE_PASSWORD } else { 'android' }
$keyAlias = if ($env:PXVIEW_KEY_ALIAS) { $env:PXVIEW_KEY_ALIAS } else { 'androiddebugkey' }
$keyPassword = if ($env:PXVIEW_KEY_PASSWORD) { $env:PXVIEW_KEY_PASSWORD } else { 'android' }

Set-Location "$repoRoot\android"
$buildSlot = if ($env:BUILD_SLOT_PATH) { $env:BUILD_SLOT_PATH } else { 'D:\Andrew\Code\tools\build-slot.js' }
$gradleArgs = @(
  'assembleRelease',
  '--no-daemon',
  "-PreactNativeArchitectures=$archs",
  "-PPXVIEWR_RELEASE_STORE_FILE=$keystorePath",
  "-PPXVIEWR_RELEASE_STORE_PASSWORD=$keystorePassword",
  "-PPXVIEWR_RELEASE_KEY_ALIAS=$keyAlias",
  "-PPXVIEWR_RELEASE_KEY_PASSWORD=$keyPassword"
)
if (-not $env:CI -and (Test-Path $buildSlot) -and (Get-Command node -ErrorAction SilentlyContinue)) {
  & node $buildSlot --queue compile -- .\gradlew.bat @gradleArgs
} else {
  & .\gradlew.bat @gradleArgs
}
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}
