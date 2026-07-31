$script:PxViewNode14 = 'C:\Users\Andrew\AppData\Roaming\nvm\v14.21.3\node.exe'
$script:PxViewNpm = 'C:\Program Files\nodejs\npm.cmd'

if (-not (Test-Path $script:PxViewNode14)) {
  throw "Node v14 binary not found at $script:PxViewNode14"
}

if (-not (Test-Path $script:PxViewNpm)) {
  throw "npm.cmd not found at $script:PxViewNpm"
}

$env:PXVIEW_NODE = $script:PxViewNode14
$env:PXVIEW_NPM = $script:PxViewNpm
$env:PATH = "{0};{1}" -f (Split-Path $script:PxViewNode14 -Parent), $env:PATH

Write-Host "Using Node:" $env:PXVIEW_NODE
Write-Host "Using npm :" $env:PXVIEW_NPM
