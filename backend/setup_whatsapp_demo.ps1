#!/usr/bin/env pwsh
# setup_whatsapp_demo.ps1
# ─────────────────────────────────────────────────────────────────────────────
# One-script setup for running the Sell Smart WhatsApp bot locally via ngrok.
# Run this from the project root: .\backend\setup_whatsapp_demo.ps1
# ─────────────────────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "  Sell Smart — WhatsApp Bot Local Setup" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host ""

# ── Step 1: Check Python ───────────────────────────────────────────────────
$pythonCmd = if (Get-Command python3 -ErrorAction SilentlyContinue) { "python3" } else { "python" }
Write-Host "✅ Using Python: $((& $pythonCmd --version 2>&1))" -ForegroundColor Cyan

# ── Step 2: Check ngrok ────────────────────────────────────────────────────
$ngrokInstalled = Get-Command ngrok -ErrorAction SilentlyContinue
if (-not $ngrokInstalled) {
    Write-Host ""
    Write-Host "⚠️  ngrok not found. Install it first:" -ForegroundColor Yellow
    Write-Host "   https://ngrok.com/download  (free account required)" -ForegroundColor Yellow
    Write-Host "   Or via winget: winget install ngrok.ngrok" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "After install, run: ngrok config add-authtoken <your_token>" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}
Write-Host "✅ ngrok found: $((ngrok version 2>&1 | Select-Object -First 1))" -ForegroundColor Cyan

# ── Step 3: Start backend server in background ────────────────────────────
Write-Host ""
Write-Host "▶ Starting FastAPI backend on port 8000..." -ForegroundColor Green
$backendDir = Join-Path $PSScriptRoot ""
$backend = Start-Process -FilePath $pythonCmd -ArgumentList "main.py" `
    -WorkingDirectory $backendDir -PassThru -WindowStyle Minimized
Write-Host "  Backend PID: $($backend.Id)" -ForegroundColor Gray

Start-Sleep -Seconds 3

# Quick health check
try {
    $health = Invoke-RestMethod -Uri "http://localhost:8000/whatsapp/status" -TimeoutSec 5
    Write-Host "✅ Backend healthy — crops: $($health.crops_available -join ', ')" -ForegroundColor Cyan
} catch {
    Write-Host "⚠️  Backend might still be starting. Continuing anyway..." -ForegroundColor Yellow
}

# ── Step 4: Start ngrok ───────────────────────────────────────────────────
Write-Host ""
Write-Host "▶ Launching ngrok tunnel on port 8000..." -ForegroundColor Green
$ngrok = Start-Process -FilePath "ngrok" -ArgumentList "http 8000" -PassThru -WindowStyle Normal
Start-Sleep -Seconds 4

# Get the public URL from ngrok API
try {
    $tunnels = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels" -TimeoutSec 5
    $publicUrl = $tunnels.tunnels | Where-Object { $_.proto -eq "https" } | Select-Object -First 1 -ExpandProperty public_url
} catch {
    $publicUrl = "https://YOUR_NGROK_URL.ngrok-free.app"
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host "  ✅ YOUR PUBLIC WEBHOOK URLS:" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Twilio webhook URL:" -ForegroundColor White
Write-Host "  $publicUrl/whatsapp/twilio" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Meta webhook URL:" -ForegroundColor White
Write-Host "  $publicUrl/whatsapp/meta" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Meta verify token:" -ForegroundColor White
Write-Host "  sellsmart_verify_token_2026" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Test bot directly (no WhatsApp needed):" -ForegroundColor White
Write-Host "  POST $publicUrl/whatsapp/test" -ForegroundColor Cyan
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host ""
Write-Host "NEXT STEPS (TWILIO — fastest, 30 min):" -ForegroundColor Green
Write-Host "  1. Go to: console.twilio.com" -ForegroundColor White
Write-Host "  2. Messaging → Try WhatsApp → Sandbox" -ForegroundColor White
Write-Host "  3. Set 'When a message comes in' to:" -ForegroundColor White
Write-Host "     $publicUrl/whatsapp/twilio" -ForegroundColor Cyan
Write-Host "  4. Farmer saves Twilio's WhatsApp number & sends join code once" -ForegroundColor White
Write-Host "  5. Any message after that gets a real AI reply!" -ForegroundColor White
Write-Host ""
Write-Host "NEXT STEPS (META — production, free):" -ForegroundColor Green
Write-Host "  1. Go to: developers.facebook.com → Your App → WhatsApp" -ForegroundColor White
Write-Host "  2. Set webhook URL: $publicUrl/whatsapp/meta" -ForegroundColor White
Write-Host "  3. Verify token: sellsmart_verify_token_2026" -ForegroundColor White
Write-Host "  4. Copy Access Token & Phone Number ID into backend/.env" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop both the backend and ngrok." -ForegroundColor Gray
Write-Host ""

# Wait for user to stop
try {
    Wait-Process -Id $backend.Id,$ngrok.Id
} catch {
    # Cleanup on Ctrl+C
    if (-not $backend.HasExited) { Stop-Process -Id $backend.Id -Force -ErrorAction SilentlyContinue }
    if (-not $ngrok.HasExited)   { Stop-Process -Id $ngrok.Id   -Force -ErrorAction SilentlyContinue }
    Write-Host "Stopped." -ForegroundColor Gray
}
