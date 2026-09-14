$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$taskPython = Join-Path $PSScriptRoot '.venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $taskPython)) {
  $taskPython = (Get-Command python -ErrorAction Stop).Source
}
if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'dist\index.html'))) {
  throw '请先安装依赖并运行 pnpm build。'
}
& $taskPython -m uvicorn python_backend.app:app --host 127.0.0.1 --port 3001
