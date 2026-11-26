Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path $PSScriptRoot -Parent
Set-Location $repoRoot

& npx.cmd jest @args
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}
