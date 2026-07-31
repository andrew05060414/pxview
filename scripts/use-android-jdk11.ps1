$env:ANDROID_HOME = 'C:\Users\Andrew\AppData\Local\Android\Sdk'
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:JAVA_HOME = 'C:\Program Files\OpenLogic\jdk-11.0.27.6-hotspot'
$repoRoot = Split-Path $PSScriptRoot -Parent
if (-not $env:GRADLE_USER_HOME) {
  $env:GRADLE_USER_HOME = Join-Path $repoRoot '.gradle-user-home'
}

if (-not (Test-Path $env:ANDROID_HOME)) {
  throw "ANDROID_HOME not found at $env:ANDROID_HOME"
}

if (-not (Test-Path $env:JAVA_HOME)) {
  throw "JAVA_HOME not found at $env:JAVA_HOME"
}

if (-not (Test-Path $env:GRADLE_USER_HOME)) {
  New-Item -ItemType Directory -Path $env:GRADLE_USER_HOME -Force | Out-Null
}

Write-Host "ANDROID_HOME    =" $env:ANDROID_HOME
Write-Host "ANDROID_SDK_ROOT=" $env:ANDROID_SDK_ROOT
Write-Host "JAVA_HOME       =" $env:JAVA_HOME
Write-Host "GRADLE_USER_HOME=" $env:GRADLE_USER_HOME
