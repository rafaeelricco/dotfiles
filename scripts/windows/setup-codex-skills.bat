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
set "INSTRUCTIONS_SRC=%REPO%\.codex\AGENTS.md"
set "CODEX_ROOT=%USERPROFILE%\.codex"
set "CODEX_DIR=%CODEX_ROOT%\skills"
set "INSTRUCTIONS_LINK=%CODEX_ROOT%\AGENTS.md"

if not exist "%SKILLS_SRC%" (
    echo ERROR: source directory not found: %SKILLS_SRC%
    pause
    exit /b 1
)

if not exist "%INSTRUCTIONS_SRC%" (
    echo ERROR: source file not found: %INSTRUCTIONS_SRC%
    pause
    exit /b 1
)

echo === Ensuring %CODEX_DIR% exists ===
if not exist "%CODEX_DIR%" mkdir "%CODEX_DIR%"

echo === Linking each skill from %SKILLS_SRC% ===
for /d %%S in ("%SKILLS_SRC%\*") do call :LinkSkill "%%S" "%CODEX_DIR%\%%~nxS"

echo === Linking %INSTRUCTIONS_LINK% -^> %INSTRUCTIONS_SRC% ===
if exist "%INSTRUCTIONS_LINK%" del /f /q "%INSTRUCTIONS_LINK%" >nul 2>&1
mklink "%INSTRUCTIONS_LINK%" "%INSTRUCTIONS_SRC%" >nul && (echo   Done.) || (echo   FAILED.)

echo.
echo === Result (links in %CODEX_DIR%) ===
dir /AL "%CODEX_DIR%"
echo.
echo === Result (links in %CODEX_ROOT%) ===
dir /AL "%CODEX_ROOT%"
echo.
echo Done. Codex bundled skills under .system\ remain untouched.
pause
endlocal
exit /b 0

:LinkSkill
if exist "%~2" rmdir "%~2" >nul 2>&1
mklink /D "%~2" "%~1" >nul && (echo   linked: %~nx2) || (echo   FAILED: %~nx2)
goto :eof
