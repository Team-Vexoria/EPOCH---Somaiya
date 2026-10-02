# setup_whatsapp_demo.ps1
# Run from backend folder: .\setup_whatsapp_demo.ps1
# Starts FastAPI + exposes tunnel for Twilio/Meta webhooks.

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "=====================================================" -ForegroundColor Green
Write-Host "  Sell Smart - WhatsApp AI Assistant Setup" -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Green
Write-Host ""

# 1. Detect Python / Virtualenv
$pythonCmd = "python"
$venvPython = Join-Path $PSScriptRoot "venv\Scripts\python.exe"
if (Test-Path $venvPython) {
    $pythonCmd = $venvPython
    Write-Host "Python: Using backend virtual environment (venv)" -ForegroundColor Cyan
} else {
    try { & python --version | Out-Null; $pythonCmd = "python" } catch { $pythonCmd = "python3" }
    Write-Host ("Python: " + (& $pythonCmd --version 2>&1)) -ForegroundColor Cyan
}

# 2. Start FastAPI backend
Write-Host ""
Write-Host "Starting FastAPI backend on port 8000..." -ForegroundColor Green
$backendDir = $PSScriptRoot
$backend = Start-Process -FilePath $pythonCmd -ArgumentList "main.py" `
    -WorkingDirectory $backendDir -PassThru -WindowStyle Minimized

Write-Host ("  Backend PID: " + $backend.Id) -ForegroundColor Gray
Start-Sleep -Seconds 3

# Health check
try {
    $health = Invoke-RestMethod -Uri "http://localhost:8000/whatsapp/status" -TimeoutSec 5
    Write-Host ("  Status: Online | Crops: " + ($health.crops_available -join ", ")) -ForegroundColor Cyan
} catch {
    Write-Host "  Backend starting up..." -ForegroundColor Yellow
}

# 3. Check for Public Tunnel (ngrok / localtunnel / cloudflared)
$ngrokCmd = Get-Command ngrok -ErrorAction SilentlyContinue
$npxCmd = Get-Command npx -ErrorAction SilentlyContinue
$tunnelProcess = $null
$publicUrl = ""

if ($ngrokCmd) {
    Write-Host ""
    Write-Host "Launching ngrok tunnel on port 8000..." -ForegroundColor Green
    $tunnelProcess = Start-Process -FilePath "ngrok" -ArgumentList "http 8000" -PassThru -WindowStyle Normal
    Start-Sleep -Seconds 4
    try {
        $tunnels = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels" -TimeoutSec 5
        $httpsUrl = $tunnels.tunnels | Where-Object { $_.proto -eq "https" } | Select-Object -First 1
        if ($httpsUrl) { $publicUrl = $httpsUrl.public_url }
    } catch {
        $publicUrl = "https://YOUR_NGROK_URL.ngrok-free.app"
    }
} elseif ($npxCmd) {
    Write-Host ""
    Write-Host "ngrok not found. Using localtunnel via npx..." -ForegroundColor Cyan
    $tunnelProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npx localtunnel --port 8000" -PassThru -WindowStyle Normal
    Start-Sleep -Seconds 4
    Write-Host "localtunnel window opened. Check that window for your public URL." -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "Note: ngrok is not installed for public external webhooks." -ForegroundColor Yellow
    Write-Host "  To install ngrok: winget install ngrok.ngrok" -ForegroundColor Yellow
    Write-Host "  (Or download free from: https://ngrok.com/download)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Good news: The in-app WhatsApp Live Simulator is working right now at http://localhost:8000!" -ForegroundColor Green
}

Write-Host ""
Write-Host "=====================================================" -ForegroundColor Yellow
Write-Host "  WHATSAPP BOT ACCESS & WEBHOOK URLS:" -ForegroundColor Yellow
Write-Host "=====================================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "  1. IN-APP SIMULATOR (No setup required):" -ForegroundColor White
Write-Host "     Open the web app -> Click 'WhatsApp AI Bot' in the sidebar" -ForegroundColor Cyan
Write-Host "     You can chat in Marathi, Hindi, or English and get live AI responses." -ForegroundColor Gray
Write-Host ""

if ($publicUrl) {
    Write-Host "  2. TWILIO WEBHOOK URL (for real WhatsApp):" -ForegroundColor White
    Write-Host ("     " + $publicUrl + "/whatsapp/twilio") -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  3. META CLOUD API WEBHOOK URL:" -ForegroundColor White
    Write-Host ("     " + $publicUrl + "/whatsapp/meta") -ForegroundColor Cyan
    Write-Host "     Verify Token: sellsmart_verify_token_2026" -ForegroundColor Cyan
} else {
    Write-Host "  2. LOCAL TEST API ENDPOINT:" -ForegroundColor White
    Write-Host "     POST http://localhost:8000/whatsapp/test" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "=====================================================" -ForegroundColor Yellow
Write-Host "Backend is running. Press Ctrl+C in this terminal to stop." -ForegroundColor Gray
Write-Host ""

# Wait loop
try {
    while ($true) { Start-Sleep -Seconds 30 }
} finally {
    Write-Host "Stopping background services..." -ForegroundColor Gray
    if ($backend -and -not $backend.HasExited) { Stop-Process -Id $backend.Id -Force -ErrorAction SilentlyContinue }
    if ($tunnelProcess -and -not $tunnelProcess.HasExited) { Stop-Process -Id $tunnelProcess.Id -Force -ErrorAction SilentlyContinue }
    Write-Host "Stopped." -ForegroundColor Gray
}
