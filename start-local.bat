@echo off
REM SkillsFuture Local Development Startup Script for Windows
REM Starts both frontend and backend servers

setlocal enabledelayedexpansion

set PROJECT_ROOT=%cd%
set BACKEND_DIR=%PROJECT_ROOT%\backend
set FRONTEND_DIR=%PROJECT_ROOT%\frontend

echo.
echo ======================================
echo SkillsFuture Development Environment
echo ======================================
echo.

REM Check if .env files exist
if not exist "%BACKEND_DIR%\.env" (
  echo X Missing: backend\.env
  echo Please create backend\.env with SF_PUBLIC_KEY, SF_ENCRYPTION_KEY, etc.
  pause
  exit /b 1
)

if not exist "%FRONTEND_DIR%\.env" (
  echo X Missing: frontend\.env
  echo Please create frontend\.env with REACT_APP_BACKEND_URL
  pause
  exit /b 1
)

echo. Environment files found
echo.

REM Start backend in new window
echo Starting Backend Server...
cd /d "%BACKEND_DIR%"
start "SkillsFuture Backend" cmd /k "npm start"
echo. Backend started
echo   Backend URL: http://localhost:5000
echo.

REM Wait a bit for backend to start
timeout /t 3 /nobreak

REM Start frontend in new window
echo Starting Frontend Server...
cd /d "%FRONTEND_DIR%"
start "SkillsFuture Frontend" cmd /k "npm run dev"
echo. Frontend started
echo   Frontend URL: http://localhost:3000
echo   Payment Page: http://localhost:3000/skillsfuture/payment
echo.

echo ======================================
echo. Both servers are running!
echo ======================================
echo.
echo Close the terminal windows to stop the servers.
echo.

pause
