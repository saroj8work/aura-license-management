@echo off
echo ========================================================
echo Starting Aura License Management FastAPI Backend
echo Port: 8090 | PostgreSQL Localhost
echo ========================================================
set PYTHONPATH=%~dp0..\backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8090 --reload
