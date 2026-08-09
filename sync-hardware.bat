@echo off
chcp 65001 > nul
title "PC Hardware Sync Agent"
echo ========================================================
echo   جاري فحص مواصفات الجهاز وإرسالها إلى سيرفر المنظومة...
echo ========================================================

if exist "%~dp0sync-hardware.ps1" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0sync-hardware.ps1"
) else (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $f = Join-Path $env:TEMP 'sync-hardware.ps1'; (New-Object System.Net.WebClient).DownloadFile('http://10.15.30.241:8087/sync-hardware.ps1', $f); & $f"
)

pause
