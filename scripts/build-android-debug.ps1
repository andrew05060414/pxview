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

# Run clean in its own invocation: inside a single `clean assembleDebug`
# invocation, compileDebugJavaWithJavac can run before `clean`/generatePackageList
# settle the generated PackageList.java, failing the build with
# "cannot find symbol: com.facebook.react.PackageList".
& .\gradlew.bat clean --no-daemon
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

& .\gradlew.bat assembleDebug --no-daemon -x bundleDebugJsAndAssets
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}
