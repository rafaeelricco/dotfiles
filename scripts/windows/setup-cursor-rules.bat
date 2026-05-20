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

set "RULES_SRC=%REPO%\.cursor\rules"
set "CURSOR_DIR=%USERPROFILE%\.cursor"
set "LINK=%CURSOR_DIR%\rules"

if not exist "%RULES_SRC%" (
    echo ERROR: source directory not found: %RULES_SRC%
    pause
    exit /b 1
)

echo === Ensuring %CURSOR_DIR% exists ===
if not exist "%CURSOR_DIR%" mkdir "%CURSOR_DIR%"

if exist "%LINK%" rmdir "%LINK%" 2>nul
if exist "%LINK%" (
    echo.
    echo WARNING: %LINK% is a non-empty real directory, not a link.
    echo Move its contents into %RULES_SRC% first, then remove %LINK%.
    echo Aborting to avoid data loss.
    pause
    exit /b 1
)

echo === Linking %LINK% -^> %RULES_SRC% ===
mklink /D "%LINK%" "%RULES_SRC%" >nul && (echo   Done.) || (echo   FAILED.)

echo.
echo === Result ===
dir /AL "%CURSOR_DIR%"
echo.
pause
endlocal
exit /b 0
