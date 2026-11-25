Set-StrictMode -Version Latest

if (-not ($env:JAVA_HOME -and (Test-Path (Join-Path $env:JAVA_HOME 'bin\java.exe')) -and ((& (Join-Path $env:JAVA_HOME 'bin\java.exe') -version 2>&1) -match '21\.'))) {
  $candidates = @(
    Get-ChildItem -Path 'C:\Program Files\Java' -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -like 'jdk-21*' } | Select-Object -ExpandProperty FullName
    Get-ChildItem -Path 'C:\Program Files\Eclipse Adoptium' -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -like 'jdk-21*' } | Select-Object -ExpandProperty FullName
    Get-ChildItem -Path 'C:\Program Files\Microsoft' -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -like 'jdk-21*' } | Select-Object -ExpandProperty FullName
  ) | Where-Object { $_ -and (Test-Path (Join-Path $_ 'bin\java.exe')) }

  if ($candidates.Count -gt 0) {
    $env:JAVA_HOME = $candidates[0]
  } else {
    throw 'JDK 21 not found. Install JDK 21 or set JAVA_HOME before building Android.'
  }
}

$env:PATH = "$(Join-Path $env:JAVA_HOME 'bin');$env:PATH"
