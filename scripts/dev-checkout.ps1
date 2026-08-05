param(
    [int]$BackendPort = 8000
)

$ErrorActionPreference = 'Stop'

$ProjectDir = Split-Path -Parent $PSScriptRoot
$BackendDir = Join-Path $ProjectDir 'backend'
$EnvFile = Join-Path $BackendDir '.env'
$PythonExe = Join-Path $BackendDir '.venv\Scripts\python.exe'
$LogDir = Join-Path $env:TEMP 'freelas-ngrok'
$NgrokLog = Join-Path $LogDir 'ngrok.log'
$NgrokErr = Join-Path $LogDir 'ngrok.err'
$BackendLog = Join-Path $LogDir 'backend.log'
$BackendErr = Join-Path $LogDir 'backend.err'
$FrontendLog = Join-Path $LogDir 'frontend.log'
$FrontendErr = Join-Path $LogDir 'frontend.err'

New-Item -ItemType Directory -Path $LogDir -Force | Out-Null

function Read-EnvValue {
    param([string]$Key, [string]$File)
    $line = Get-Content $File -ErrorAction SilentlyContinue | Where-Object { $_ -match "^$([regex]::Escape($Key))=" } | Select-Object -First 1
    if ($line) {
        return $line.Substring($line.IndexOf('=') + 1).Trim()
    }
    return ''
}

function Set-EnvValue {
    param([string]$Key, [string]$Value, [string]$File)
    $pattern = "^$([regex]::Escape($Key))="
    $content = @(Get-Content $File -ErrorAction SilentlyContinue)
    $updated = $false
    $newLines = foreach ($line in $content) {
        if ($line -match $pattern) {
            "$Key=$Value"
            $updated = $true
        } else {
            $line
        }
    }
    if (-not $updated) {
        $newLines += "$Key=$Value"
    }
    Set-Content -Path $File -Value $newLines -Encoding utf8
}

function Stop-ProcessTree {
    param([int]$ProcessId)
    try {
        $children = Get-CimInstance Win32_Process -Filter "ParentProcessId=$ProcessId" -ErrorAction SilentlyContinue
        foreach ($child in $children) {
            Stop-ProcessTree -ProcessId $child.ProcessId
        }
        Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
    } catch {
    }
}

if (-not (Get-Command ngrok -ErrorAction SilentlyContinue)) {
    Write-Host 'ngrok nao foi encontrado.' -ForegroundColor Red
    Write-Host 'Instale-o uma vez seguindo https://ngrok.com/download' -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $PythonExe)) {
    Write-Host "O ambiente virtual nao foi encontrado em $PythonExe" -ForegroundColor Red
    Write-Host 'Crie com: cd backend; python -m venv .venv; .\.venv\Scripts\Activate.ps1; pip install -r requirements.txt' -ForegroundColor Red
    exit 1
}

$ngrokAuthToken = Read-EnvValue 'NGROK_AUTHTOKEN' $EnvFile
if (-not $ngrokAuthToken) {
    Write-Host 'Preencha NGROK_AUTHTOKEN no arquivo backend/.env.' -ForegroundColor Red
    Write-Host 'O token esta disponivel em https://dashboard.ngrok.com/get-started/your-authtoken' -ForegroundColor Red
    exit 1
}

Write-Host 'Iniciando o tunel HTTPS do ngrok...'
$env:NGROK_AUTHTOKEN = $ngrokAuthToken

$ngrokProcess = Start-Process -FilePath 'ngrok' `
    -ArgumentList @('http', "$BackendPort", '--log=stdout') `
    -PassThru `
    -NoNewWindow `
    -RedirectStandardOutput $NgrokLog `
    -RedirectStandardError $NgrokErr

$publicUrl = ''
for ($i = 0; $i -lt 40; $i++) {
    if ($ngrokProcess.HasExited) {
        Write-Host 'O ngrok encerrou antes de criar o tunel:' -ForegroundColor Red
        Get-Content $NgrokLog -Tail 20
        exit 1
    }
    try {
        $tunnels = Invoke-RestMethod -Uri 'http://127.0.0.1:4040/api/tunnels' -TimeoutSec 2
        $httpsTunnel = $tunnels.tunnels | Where-Object { $_.proto -eq 'https' } | Select-Object -First 1
        if ($httpsTunnel -and $httpsTunnel.public_url) {
            $publicUrl = $httpsTunnel.public_url
            break
        }
    } catch {
    }
    Start-Sleep -Milliseconds 500
}

if ($publicUrl -notlike 'https://*') {
    Write-Host 'Nao foi possivel obter a URL publica do ngrok.' -ForegroundColor Red
    Write-Host 'Ultimas mensagens:' -ForegroundColor Red
    Get-Content $NgrokLog -Tail 20
    exit 1
}

Set-EnvValue 'BACKEND_PUBLIC_URL' $publicUrl $EnvFile

Write-Host ''
Write-Host 'Webhook configurado em:' -ForegroundColor Green
Write-Host "  $publicUrl/api/pagamentos/webhook/" -ForegroundColor Green
Write-Host 'Painel local do ngrok:' -ForegroundColor Green
Write-Host '  http://127.0.0.1:4040' -ForegroundColor Green
Write-Host ''

$backendProcess = Start-Process -FilePath $PythonExe `
    -ArgumentList @('manage.py', 'runserver', "0.0.0.0:$BackendPort") `
    -WorkingDirectory $BackendDir `
    -PassThru `
    -NoNewWindow `
    -RedirectStandardOutput $BackendLog `
    -RedirectStandardError $BackendErr

$npmCmd = (Get-Command npm.cmd -ErrorAction Stop).Source

$frontendProcess = Start-Process -FilePath $npmCmd `
    -ArgumentList @('run', 'dev') `
    -WorkingDirectory $ProjectDir `
    -PassThru `
    -NoNewWindow `
    -RedirectStandardOutput $FrontendLog `
    -RedirectStandardError $FrontendErr

Write-Host 'Backend, frontend e tunel iniciados. Pressione Ctrl+C para encerrar todos.' -ForegroundColor Cyan
Write-Host ''
Write-Host 'Logs:'
Write-Host "  Backend : $BackendLog"
Write-Host "  Frontend: $FrontendLog"
Write-Host "  Ngrok   : $NgrokLog"

try {
    $processes = @($ngrokProcess, $backendProcess, $frontendProcess)
    while ($true) {
        $running = @($processes | Where-Object { $_ -and -not $_.HasExited })
        if ($running.Count -lt 3) {
            break
        }
        Start-Sleep -Seconds 1
    }
} finally {
    Write-Host ''
    Write-Host 'Encerrando processos...' -ForegroundColor Yellow
    foreach ($process in $processes) {
        if ($process) {
            Stop-ProcessTree -ProcessId $process.Id
        }
    }
}
