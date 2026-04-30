@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0check-skills.ps1"
echo.
pause
exit /b %errorlevel%
