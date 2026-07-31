Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path $PSScriptRoot -Parent
$apkPath = Join-Path $repoRoot 'android\app\build\outputs\apk\release\app-release.apk'

if (-not (Test-Path $apkPath)) {
  throw "Release APK not found at $apkPath"
}

adb install -r $apkPath
$exitCode = $LASTEXITCODE
if ($exitCode -ne 0) {
  exit $exitCode
}
