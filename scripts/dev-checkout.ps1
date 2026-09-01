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
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllLines($File, [string[]]$newLines, $utf8NoBom)
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

function Test-TcpPort {
    param([int]$Port)
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        try {
            return $client.ConnectAsync('127.0.0.1', $Port).Wait(1500) -and $client.Connected
        } finally {
            $client.Close()
        }
    } catch {
        return $false
    }
}

function Get-RedisPortable {
    $RedisDir = Join-Path $ProjectDir 'tools\redis'
    $RedisExe = Join-Path $RedisDir 'redis-server.exe'
    if (Test-Path $RedisExe) {
        return $RedisExe
    }
    Write-Host 'Baixando Redis portatil (tporadowski/redis) para tools\redis...'
    New-Item -ItemType Directory -Path $RedisDir -Force | Out-Null
    $ZipPath = Join-Path $env:TEMP 'redis-x64-freelas.zip'
    try {
        Invoke-WebRequest -Uri 'https://github.com/tporadowski/redis/releases/download/v5.0.14.1/Redis-x64-5.0.14.1.zip' -OutFile $ZipPath -UseBasicParsing
    } catch {
        Write-Host 'Falha ao baixar o Redis. Baixe manualmente e extraia em tools\redis.' -ForegroundColor Red
        exit 1
    }
    Expand-Archive -Path $ZipPath -DestinationPath $RedisDir -Force
    Remove-Item $ZipPath -Force -ErrorAction SilentlyContinue
    return $RedisExe
}

$RedisLog = Join-Path $LogDir 'redis.log'
$RedisProcess = $null
if (-not (Test-TcpPort 6379)) {
        $redisExe = Get-RedisPortable
        $RedisDir = Join-Path $ProjectDir 'tools\redis'
        Write-Host 'Iniciando o Redis (porta 6379) para o chat...'
        $RedisProcess = Start-Process -FilePath $redisExe `
            -ArgumentList @('--port', '6379', '--bind', '127.0.0.1', '--appendonly', 'yes', '--dir', $RedisDir, '--appendfilename', 'appendonly.aof', '--logfile', $RedisLog) `
            -PassThru `
            -NoNewWindow
    for ($i = 0; $i -lt 20; $i++) {
        if (Test-TcpPort 6379) { break }
        if ($RedisProcess.HasExited) {
            Write-Host 'O Redis encerrou inesperadamente:' -ForegroundColor Red
            Get-Content $RedisLog -Tail 20
            exit 1
        }
        Start-Sleep -Milliseconds 500
    }
    if (-not (Test-TcpPort 6379)) {
        Write-Host 'Nao foi possivel iniciar o Redis na porta 6379.' -ForegroundColor Red
        exit 1
    }
    Write-Host "Redis rodando em redis://127.0.0.1:6379 (log: $RedisLog)" -ForegroundColor Green
} else {
    Write-Host 'Redis ja esta rodando na porta 6379.' -ForegroundColor Green
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
    -ArgumentList @('http', "$BackendPort", "--authtoken=$ngrokAuthToken", '--log=stdout') `
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

Write-Host 'Backend, frontend, Redis e tunel iniciados. Pressione Ctrl+C para encerrar todos.' -ForegroundColor Cyan
Write-Host ''
Write-Host 'Logs:'
Write-Host "  Backend : $BackendLog"
Write-Host "  Frontend: $FrontendLog"
Write-Host "  Redis   : $RedisLog"
Write-Host "  Ngrok   : $NgrokLog"

try {
    $processes = @($ngrokProcess, $backendProcess, $frontendProcess)
    if ($RedisProcess) {
        $processes += $RedisProcess
    }
    while ($true) {
        $running = @($processes | Where-Object { $_ -and -not $_.HasExited })
        if ($running.Count -lt $processes.Count) {
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
