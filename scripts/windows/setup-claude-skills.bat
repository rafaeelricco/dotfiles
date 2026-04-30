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
set "CLAUDE_DIR=%USERPROFILE%\.claude"
set "LINK=%CLAUDE_DIR%\skills"

if not exist "%SKILLS_SRC%" (
    echo ERROR: source directory not found: %SKILLS_SRC%
    pause
    exit /b 1
)

echo === Ensuring %CLAUDE_DIR% exists ===
if not exist "%CLAUDE_DIR%" mkdir "%CLAUDE_DIR%"

if exist "%LINK%" rmdir "%LINK%" 2>nul
if exist "%LINK%" (
    echo.
    echo WARNING: %LINK% is a non-empty real directory, not a link.
    echo Move its contents into %SKILLS_SRC% first, then remove %LINK%.
    echo Aborting to avoid data loss.
    pause
    exit /b 1
)

echo === Linking %LINK% -^> %SKILLS_SRC% ===
mklink /D "%LINK%" "%SKILLS_SRC%" >nul && (echo   Done.) || (echo   FAILED.)

echo.
echo === Result ===
dir /AL "%CLAUDE_DIR%"
echo.
pause
endlocal
exit /b 0
