Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path $PSScriptRoot -Parent
$releaseDir = Join-Path $repoRoot 'android\app\build\outputs\apk\release'
$candidates = @(
  'app-arm64-v8a-release.apk',
  'app-universal-release.apk',
  'app-release.apk'
)
$apkPath = $candidates |
  ForEach-Object { Join-Path $releaseDir $_ } |
  Where-Object { Test-Path $_ } |
  Select-Object -First 1

if (-not $apkPath) {
  throw "Release APK not found under $releaseDir"
}

adb install -r $apkPath
$exitCode = $LASTEXITCODE
if ($exitCode -ne 0) {
  exit $exitCode
}
