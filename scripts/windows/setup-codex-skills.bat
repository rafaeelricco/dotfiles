@echo off
setlocal

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Requesting administrator privileges...
    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

pushd "%~dp0..\.."
set "REPO=%CD%"
popd

set "SKILLS_SRC=%REPO%\.claude\skills"
set "CODEX_DIR=%USERPROFILE%\.codex\skills"

if not exist "%SKILLS_SRC%" (
    echo ERROR: source directory not found: %SKILLS_SRC%
    pause
    exit /b 1
)

echo === Ensuring %CODEX_DIR% exists ===
if not exist "%CODEX_DIR%" mkdir "%CODEX_DIR%"

echo === Linking each skill from %SKILLS_SRC% ===
for /d %%S in ("%SKILLS_SRC%\*") do call :LinkSkill "%%S" "%CODEX_DIR%\%%~nxS"

echo.
echo === Result (links in %CODEX_DIR%) ===
dir /AL "%CODEX_DIR%"
echo.
echo Done. Codex bundled skills under .system\ remain untouched.
pause
endlocal
exit /b 0

:LinkSkill
if exist "%~2" rmdir "%~2" >nul 2>&1
mklink /D "%~2" "%~1" >nul && (echo   linked: %~nx2) || (echo   FAILED: %~nx2)
goto :eof
