Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path $PSScriptRoot -Parent
Set-Location $repoRoot

. "$PSScriptRoot\use-node14.ps1"

$env:REACT_NATIVE_MAX_WORKERS = '1'

& $env:PXVIEW_NODE .\node_modules\react-native\cli.js bundle `
  --platform android `
  --dev false `
  --entry-file index.js `
  --bundle-output android\app\src\main\assets\index.android.bundle `
  --assets-dest android\app\src\main\res `
  --max-workers 1
$exitCode = $LASTEXITCODE
if ($exitCode -ne 0) {
  exit $exitCode
}
