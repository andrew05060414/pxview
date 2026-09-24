Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path $PSScriptRoot -Parent
Set-Location $repoRoot

. "$PSScriptRoot\use-node14.ps1"

$jestCacheDirectory = if ($env:PXVIEW_JEST_CACHE_DIR) {
  $env:PXVIEW_JEST_CACHE_DIR
} else {
  Join-Path $repoRoot '.jest-cache'
}
New-Item -ItemType Directory -Force -Path $jestCacheDirectory | Out-Null

$defaultArgs = @(
  '--runInBand',
  '--roots',
  '__tests__',
  '--setupFiles',
  '<rootDir>/scripts/jest.setup.js',
  '--cacheDirectory',
  $jestCacheDirectory
)

& $env:PXVIEW_NODE .\node_modules\jest\bin\jest.js @defaultArgs @args
$exitCode = $LASTEXITCODE
if ($exitCode -ne 0) {
  exit $exitCode
}
