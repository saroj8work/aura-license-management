@echo off
set PGDIR=%~dp0..\.db_local
set PGBIN=C:\Program Files\PostgreSQL\18\bin

if not exist "%PGDIR%\PG_VERSION" (
    echo Initializing database cluster at %PGDIR%...
    "%PGBIN%\initdb.exe" -D "%PGDIR%" -U postgres -A trust --encoding=UTF8
)

echo Starting PostgreSQL on port 5433...
"%PGBIN%\pg_ctl.exe" -D "%PGDIR%" -l "%PGDIR%\server.log" -o "-p 5433" start
timeout /t 3 /nobreak >nul
"%PGBIN%\psql.exe" -h localhost -p 5433 -U postgres -c "SELECT version();"
