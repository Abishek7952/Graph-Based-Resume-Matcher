@echo off
echo ===========================================
echo 🚀 Starting Backend and Frontend Servers
echo ===========================================

:: Start Backend
echo.
echo 🟢 Starting Backend Server...
start cmd /k "cd /d %~dp0 && call .venv\Scripts\activate.bat && python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000"

:: Small delay to ensure backend starts first
timeout /t 5 >nul

:: Start Frontend
echo.
echo 🟣 Starting Frontend Development Server...
start cmd /k "cd /d %~dp0\resume-analyzer-frontend && npm start"

echo.
echo ===========================================
echo ✅ Both backend and frontend have been launched successfully!
echo ===========================================
pause
