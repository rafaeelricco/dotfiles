@echo off
setlocal
net session >nul 2>&1 || (echo Run as Administrator. & pause & exit /b 1)

echo === Deleting user TEMP files ===
del /q /f /s "%TEMP%\*" 2>nul
for /d %%D in ("%TEMP%\*") do rd /s /q "%%D" 2>nul

echo === Deleting system TEMP files ===
del /q /f /s "C:\Windows\Temp\*" 2>nul
for /d %%D in ("C:\Windows\Temp\*") do rd /s /q "%%D" 2>nul

echo === Clearing Windows Update cache ===
net stop wuauserv >nul 2>&1
rd /s /q "C:\Windows\SoftwareDistribution\Download" 2>nul
net start wuauserv >nul 2>&1

echo === Emptying Recycle Bin ===
rd /s /q "%systemdrive%\$Recycle.Bin" 2>nul

echo === DISM: RestoreHealth ===
dism.exe /Online /Cleanup-Image /RestoreHealth

echo === SFC scan ===
sfc /scannow

echo.
echo WARNING: /ResetBase permanently removes the ability to uninstall installed Windows updates.
set /p CONFIRM="Run DISM /StartComponentCleanup /ResetBase? (y/N): "
if /i "%CONFIRM%"=="y" (
    echo === DISM: StartComponentCleanup /ResetBase ===
    dism.exe /Online /Cleanup-Image /StartComponentCleanup /ResetBase
) else (
    echo Skipped /ResetBase.
)

echo === Done ===
endlocal
pause
