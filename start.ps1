$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$taskNodeCommand = Get-Command node -ErrorAction SilentlyContinue
if ($taskNodeCommand) {
  $taskNodePath = $taskNodeCommand.Source
} else {
  $taskNodePath = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
  if (-not (Test-Path -LiteralPath $taskNodePath)) { throw '请安装 Node.js 22 或更高版本。' }
}
if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'dist\index.html'))) {
  throw '请先安装依赖并运行 pnpm build。'
}
& $taskNodePath --env-file-if-exists=.env server/index.mjs
