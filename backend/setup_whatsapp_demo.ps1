# setup_whatsapp_demo.ps1
# Run from backend folder: .\setup_whatsapp_demo.ps1
# Starts FastAPI + ngrok, then prints your webhook URLs.

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=====================================================" -ForegroundColor Green
Write-Host "  Sell Smart - WhatsApp Bot Local Setup" -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Green
Write-Host ""

# Check Python
$pythonCmd = "python"
try { & python --version | Out-Null } catch { $pythonCmd = "python3" }
Write-Host ("Python: " + (& $pythonCmd --version 2>&1)) -ForegroundColor Cyan

# Check ngrok
if (-not (Get-Command ngrok -ErrorAction SilentlyContinue)) {
    Write-Host ""
    Write-Host "ngrok not found. Install it:" -ForegroundColor Yellow
    Write-Host "  https://ngrok.com/download  (free account)" -ForegroundColor Yellow
    Write-Host "  Or: winget install ngrok.ngrok" -ForegroundColor Yellow
    Write-Host "  Then: ngrok config add-authtoken YOUR_TOKEN" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}
Write-Host ("ngrok: " + (& ngrok version 2>&1 | Select-Object -First 1)) -ForegroundColor Cyan

# Start FastAPI backend
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
    Write-Host ("  Crops available: " + ($health.crops_available -join ", ")) -ForegroundColor Cyan
} catch {
    Write-Host "  Backend still starting, continuing..." -ForegroundColor Yellow
}

# Start ngrok
Write-Host ""
Write-Host "Launching ngrok tunnel on port 8000..." -ForegroundColor Green
$ngrok = Start-Process -FilePath "ngrok" -ArgumentList "http 8000" -PassThru -WindowStyle Normal
Start-Sleep -Seconds 4

# Read ngrok public URL
$publicUrl = "https://YOUR_NGROK_URL.ngrok-free.app"
try {
    $tunnels   = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels" -TimeoutSec 5
    $httpsUrl  = $tunnels.tunnels | Where-Object { $_.proto -eq "https" } | Select-Object -First 1
    if ($httpsUrl) { $publicUrl = $httpsUrl.public_url }
} catch {
    Write-Host "  Could not auto-detect ngrok URL. Check ngrok window." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=====================================================" -ForegroundColor Yellow
Write-Host "  YOUR PUBLIC WEBHOOK URLS:" -ForegroundColor Yellow
Write-Host "=====================================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "  TWILIO webhook URL:" -ForegroundColor White
Write-Host ("  " + $publicUrl + "/whatsapp/twilio") -ForegroundColor Cyan
Write-Host ""
Write-Host "  META webhook URL:" -ForegroundColor White
Write-Host ("  " + $publicUrl + "/whatsapp/meta") -ForegroundColor Cyan
Write-Host ""
Write-Host "  META verify token:" -ForegroundColor White
Write-Host "  sellsmart_verify_token_2026" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Test the bot without WhatsApp (PowerShell):" -ForegroundColor White
$testUrl = $publicUrl + "/whatsapp/test"
Write-Host ("  Invoke-RestMethod -Method POST -Uri '" + $testUrl + "' -ContentType 'application/json' -Body '{`"message`":`"kandaa 20 qtl`"}'") -ForegroundColor Cyan
Write-Host ""
Write-Host "=====================================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "TWILIO SETUP (fastest - 5 min if you have an account):" -ForegroundColor Green
Write-Host "  1. console.twilio.com -> Messaging -> Try WhatsApp -> Sandbox" -ForegroundColor White
Write-Host "  2. Set webhook to the TWILIO URL printed above" -ForegroundColor White
Write-Host "  3. Farmer sends the join code once, then gets real AI replies" -ForegroundColor White
Write-Host ""
Write-Host "META SETUP (production, free):" -ForegroundColor Green
Write-Host "  1. developers.facebook.com -> Your App -> WhatsApp -> Configuration" -ForegroundColor White
Write-Host "  2. Paste the META webhook URL + verify token above" -ForegroundColor White
Write-Host "  3. Add META_ACCESS_TOKEN and META_PHONE_NUMBER_ID to backend/.env" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop." -ForegroundColor Gray
Write-Host ""

# Keep running until Ctrl+C
try {
    while ($true) { Start-Sleep -Seconds 30 }
} finally {
    Write-Host "Stopping..." -ForegroundColor Gray
    if (-not $backend.HasExited) { Stop-Process -Id $backend.Id -Force -ErrorAction SilentlyContinue }
    if (-not $ngrok.HasExited)   { Stop-Process -Id $ngrok.Id -Force -ErrorAction SilentlyContinue }
    Write-Host "Done." -ForegroundColor Gray
}
