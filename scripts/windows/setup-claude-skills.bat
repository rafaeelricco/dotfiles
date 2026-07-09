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
set "INSTRUCTIONS_SRC=%REPO%\.claude\CLAUDE.md"
set "AGENTS_SRC=%REPO%\.claude\agents"
set "CLAUDE_DIR=%USERPROFILE%\.claude"
set "LINK=%CLAUDE_DIR%\skills"
set "INSTRUCTIONS_LINK=%CLAUDE_DIR%\CLAUDE.md"
set "AGENTS_DIR=%CLAUDE_DIR%\agents"

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

echo === Linking %INSTRUCTIONS_LINK% -^> %INSTRUCTIONS_SRC% ===
if exist "%INSTRUCTIONS_LINK%" del /f /q "%INSTRUCTIONS_LINK%" >nul 2>&1
mklink "%INSTRUCTIONS_LINK%" "%INSTRUCTIONS_SRC%" >nul && (echo   Done.) || (echo   FAILED.)

echo === Linking agents into %AGENTS_DIR% ===
if not exist "%AGENTS_SRC%" (
    echo   No .claude\agents directory in repo; skipping.
) else (
    if not exist "%AGENTS_DIR%" mkdir "%AGENTS_DIR%"
    for %%A in ("%AGENTS_SRC%\*.md") do if exist "%%~fA" call :link_agent "%%~fA" "%AGENTS_DIR%\%%~nxA"
)

echo.
echo === Result ===
dir /AL "%CLAUDE_DIR%"
echo.
pause
endlocal
exit /b 0

:link_agent
rem %1 = repo agent file, %2 = destination under %AGENTS_DIR%
set "AGENT_DEST=%~2"
powershell -NoProfile -Command "$item = Get-Item -LiteralPath $env:AGENT_DEST -Force -ErrorAction SilentlyContinue; if ($null -eq $item) { exit 2 }; if ($item.LinkType -eq 'SymbolicLink' -and -not $item.PSIsContainer) { exit 0 }; exit 1"
if errorlevel 3 (
    echo   SKIP %~nx2 : unable to inspect destination safely
    goto :eof
)
if errorlevel 2 goto :create_agent_link
if errorlevel 1 (
    echo   SKIP %~nx2 : existing entry is not a file symlink
    goto :eof
)
del /f /q "%~2" >nul 2>&1

:create_agent_link
mklink "%~2" "%~1" >nul && (echo   %~nx2) || (echo   FAILED: %~nx2)
goto :eof
