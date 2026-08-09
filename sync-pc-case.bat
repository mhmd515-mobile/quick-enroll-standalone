@echo off
chcp 65001 > nul
title "PC Hardware Sync Agent - PC Case"
echo ========================================================
echo   جاري فحص مواصفات الكمبيوتر المكتبي (PC Case) وإرسالها للسيرفر...
echo ========================================================

if exist "%~dp0sync-hardware.ps1" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0sync-hardware.ps1" -DeviceType "pc-case"
) else (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $f = Join-Path $env:TEMP 'sync-hardware.ps1'; (New-Object System.Net.WebClient).DownloadFile('http://10.15.30.241:8087/sync-hardware.ps1', $f); & $f -DeviceType 'pc-case'"
)

pause
