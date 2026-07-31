Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path $PSScriptRoot -Parent
Set-Location $repoRoot

. "$PSScriptRoot\use-node14.ps1"
. "$PSScriptRoot\use-android-jdk11.ps1"

& "$PSScriptRoot\test-jest.ps1"
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}
& "$PSScriptRoot\bundle-android-release.ps1"
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

Set-Location "$repoRoot\android"

& .\gradlew.bat clean assembleRelease --no-daemon `
  "-PPXVIEWR_RELEASE_STORE_FILE=$repoRoot/android/app/debug.keystore" `
  "-PPXVIEWR_RELEASE_STORE_PASSWORD=android" `
  "-PPXVIEWR_RELEASE_KEY_ALIAS=androiddebugkey" `
  "-PPXVIEWR_RELEASE_KEY_PASSWORD=android" `
  -x bundleReleaseJsAndAssets
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}
