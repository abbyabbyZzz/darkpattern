# Copy Cursor chat-upload DVD cover PNGs into assets as nyan-cover-01.png … 09.png
# Run from the game folder:  cd game; powershell -ExecutionPolicy Bypass -File .\copy-nyan-covers.ps1

$ErrorActionPreference = "Stop"
$destDir = Join-Path $PSScriptRoot "assets"
if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir | Out-Null }

# Match by unique substring inside Cursor’s long filename (works even if prefix/user id differs)
$map = [ordered]@{
  "nyan-cover-01.png" = "4db424b237d86a90787c5910c1f6f6ca"
  "nyan-cover-02.png" = "663d61f016edffb334e820447edcea36"
  "nyan-cover-03.png" = "b106394568ea348448a6cb02fc438dfe"
  "nyan-cover-04.png" = "1851c16ce1faffc38772da0a6adfb0a5"
  "nyan-cover-05.png" = "93372e457b227a3c748d88728ad5a17d"
  "nyan-cover-06.png" = "45c6efa33c2de5fda72e995e773fdccb"
  "nyan-cover-07.png" = "d300111881bc19990a04433ca39b4322"
  "nyan-cover-08.png" = "2b36d2b3e282dc25af03c343497d0a68"
  "nyan-cover-09.png" = "3d0c634b3c4472e6f7ccfebbd81e3a01"
}

function Find-SourceByToken([string]$token) {
  $local = Get-ChildItem -Path $destDir -File -Filter "*.png" -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -like "c__Users*" -and $_.Name -match [regex]::Escape($token) } |
    Select-Object -First 1
  if ($local) { return $local.FullName }

  $cursorRoot = Join-Path $env:USERPROFILE ".cursor\projects"
  if (-not (Test-Path $cursorRoot)) { return $null }

  $hit = Get-ChildItem -Path $cursorRoot -Recurse -File -Filter "*.png" -ErrorAction SilentlyContinue |
    Where-Object {
      $_.DirectoryName -match "[\\/]assets$" -and
      $_.Name -like "c__Users*" -and
      $_.Name -match [regex]::Escape($token)
    } |
    Select-Object -First 1
  if ($hit) { return $hit.FullName }

  $hit2 = Get-ChildItem -Path $cursorRoot -Recurse -File -Filter "*.png" -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -like "c__Users*" -and $_.Name -match [regex]::Escape($token) } |
    Select-Object -First 1
  if ($hit2) { return $hit2.FullName }

  return $null
}

function Copy-FileRobust([string]$src, [string]$dest) {
  if (-not (Test-Path -LiteralPath $src)) { return $false }
  try {
    [System.IO.File]::Copy($src, $dest, $true)
    return $true
  } catch {
    try {
      Copy-Item -LiteralPath $src -LiteralDestination $dest -Force
      return $true
    } catch {
      Write-Warning $_.Exception.Message
      return $false
    }
  }
}

$ok = 0
foreach ($pair in $map.GetEnumerator()) {
  $short = $pair.Key
  $token = $pair.Value
  $src = Find-SourceByToken $token
  if (-not $src) {
    Write-Warning "Missing PNG containing token: $token"
    continue
  }
  if (-not (Test-Path -LiteralPath $src)) {
    Write-Warning "Path not accessible (sync / long path?): $src"
    continue
  }
  $dest = Join-Path $destDir $short
  if (Copy-FileRobust $src $dest) {
    Write-Host "OK $short  <=  $src"
    $ok++
  }
}

Write-Host "`nCopied $ok / $($map.Count) files into $destDir"
if ($ok -lt $map.Count) {
  Write-Host "Tip: copy the c__Users*.png files into assets\, or keep them under .cursor\projects\...\assets\, then run again."
}
