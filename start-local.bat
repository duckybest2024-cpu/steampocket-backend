@echo off
:: ─────────────────────────────────────────────────────────────
:: Casino Aurelius — local quick-start for Windows
:: Requires: Node.js 18+  (https://nodejs.org)
:: ─────────────────────────────────────────────────────────────

echo.
echo  Casino Aurelius — Local Setup (Windows)
echo  ----------------------------------------

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo  ERROR: Node.js not found.
    echo  Download from https://nodejs.org then re-run this script.
    pause
    exit /b 1
)

echo  Node.js detected:
node -v

:: Create .env if missing
if not exist .env (
    echo  Creating .env...
    (
        echo DATABASE_URL="file:./prisma/casino-local.db"
        echo JWT_SECRET="casino-aurelius-local-change-me"
        echo PORT=3000
    ) > .env
)

echo.
echo  Installing dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 ( echo  npm install failed & pause & exit /b 1 )

echo.
echo  Building TypeScript...
call npm run build
if %ERRORLEVEL% NEQ 0 ( echo  Build failed & pause & exit /b 1 )

echo.
echo  Running database migrations...
call npx prisma migrate deploy
if %ERRORLEVEL% NEQ 0 ( echo  Migration failed & pause & exit /b 1 )

echo.
echo  ----------------------------------------
echo   Casino Aurelius is starting!
echo   Open ^-^> http://localhost:3000
echo   Press Ctrl+C to stop
echo  ----------------------------------------
echo.
node dist/server.js
pause
