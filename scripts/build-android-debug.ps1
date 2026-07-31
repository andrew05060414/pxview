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
& .\gradlew.bat clean assembleDebug --no-daemon -x bundleDebugJsAndAssets
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}
