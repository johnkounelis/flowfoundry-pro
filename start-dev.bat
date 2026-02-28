@echo off
setlocal enabledelayedexpansion

REM Go to the folder this script lives in (repo root)
cd /d "%~dp0"

echo.
echo [1/5] Starting local services (Docker)...
docker compose -f infra\docker-compose.yml up -d
if errorlevel 1 goto :error

echo.
echo [2/5] Setting DATABASE_URL for this session...
set "DATABASE_URL=postgresql://postgres:postgres@localhost:5432/flowfoundry"

echo.
echo [3/5] Applying DB schema (Prisma migrate deploy)...
call pnpm --filter @flowfoundry/db prisma migrate deploy
if errorlevel 1 goto :error

echo.
echo [4/5] Seeding demo data (safe to re-run)...
call pnpm --filter @flowfoundry/db exec tsx src/seed.ts
if errorlevel 1 goto :error

echo.
echo [5/5] Launching Inngest Dev in a new window...
start "Inngest Dev" cmd /k "cd /d %~dp0 && npx inngest-cli@latest dev -u http://localhost:3000/api/inngest"

echo.
echo ▶ Starting web + worker (pnpm dev)...
call pnpm dev
goto :eof

:error
echo.
echo [ERROR] A step failed. Scroll up for details.
pause
endlocal
