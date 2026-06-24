# Start Next.js dev server (no admin). Use if `npm` is not in PATH yet.
$nodeDir = Join-Path $env:LOCALAPPDATA "nodejs"
if (-not (Test-Path (Join-Path $nodeDir "npm.cmd"))) {
  Write-Error "Node not found at $nodeDir. Re-run the portable Node install first."
  exit 1
}
$env:Path = "$nodeDir;" + $env:Path
Set-Location $PSScriptRoot
& npm.cmd run dev
