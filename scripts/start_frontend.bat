@echo off
echo ========================================================
echo Starting Aura License Management React UI
echo Vite Port: 3000 (Proxying /api to http://127.0.0.1:8090)
echo ========================================================
cd /d "%~dp0..\frontend"
npm.cmd run dev
