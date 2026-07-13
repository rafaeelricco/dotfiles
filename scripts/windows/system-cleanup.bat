@echo off
setlocal
net session >nul 2>&1 || (echo Run as Administrator. & pause & exit /b 1)

echo === Deleting user TEMP files ===
del /q /f /s "%TEMP%\*" 2>nul
for /d %%D in ("%TEMP%\*") do rd /s /q "%%D" 2>nul

echo === Deleting system TEMP files ===
del /q /f /s "C:\Windows\Temp\*" 2>nul
for /d %%D in ("C:\Windows\Temp\*") do rd /s /q "%%D" 2>nul

echo === Clearing Windows Update Download cache ===
net stop bits >nul 2>&1
net stop wuauserv >nul 2>&1
if exist "C:\Windows\SoftwareDistribution\Download\" (
    del /q /f /s "C:\Windows\SoftwareDistribution\Download\*" 2>nul
    for /d %%D in ("C:\Windows\SoftwareDistribution\Download\*") do rd /s /q "%%D" 2>nul
)
net start wuauserv >nul 2>&1
net start bits >nul 2>&1

echo.
echo WARNING: empties Recycle Bin for all users on %systemdrive% (permanent).
set /p CONFIRM_RB="Empty Recycle Bin? (y/N): "
if /i "%CONFIRM_RB%"=="y" (
    echo === Emptying Recycle Bin ===
    rd /s /q "%systemdrive%\$Recycle.Bin" 2>nul
) else (
    echo Skipped Recycle Bin.
)

echo.
echo Repair scans can take a long time and need network for DISM source files.
set /p CONFIRM_REPAIR="Run DISM /RestoreHealth then SFC /scannow? (y/N): "
if /i "%CONFIRM_REPAIR%"=="y" (
    echo === DISM: RestoreHealth ===
    dism.exe /Online /Cleanup-Image /RestoreHealth
    echo === SFC scan ===
    sfc /scannow
) else (
    echo Skipped DISM/SFC repair.
)

echo.
echo Removes superseded component versions (frees WinSxS space; no /ResetBase).
set /p CONFIRM_CC="Run DISM /StartComponentCleanup? (y/N): "
if /i "%CONFIRM_CC%"=="y" (
    echo === DISM: StartComponentCleanup ===
    dism.exe /Online /Cleanup-Image /StartComponentCleanup
) else (
    echo Skipped StartComponentCleanup.
)

echo.
echo WARNING: /ResetBase permanently removes ability to uninstall installed Windows updates.
set /p CONFIRM_RESET="Run DISM /StartComponentCleanup /ResetBase? (y/N): "
if /i "%CONFIRM_RESET%"=="y" (
    echo === DISM: StartComponentCleanup /ResetBase ===
    dism.exe /Online /Cleanup-Image /StartComponentCleanup /ResetBase
) else (
    echo Skipped /ResetBase.
)

echo === Done ===
endlocal
pause
