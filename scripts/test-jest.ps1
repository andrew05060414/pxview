Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path $PSScriptRoot -Parent
Set-Location $repoRoot

. "$PSScriptRoot\use-node14.ps1"

$defaultArgs = @(
  '--runInBand',
  '--roots',
  '__tests__',
  '--setupFiles',
  '<rootDir>/scripts/jest.setup.js'
)

& $env:PXVIEW_NODE .\node_modules\jest\bin\jest.js @defaultArgs @args
$exitCode = $LASTEXITCODE
if ($exitCode -ne 0) {
  exit $exitCode
}
