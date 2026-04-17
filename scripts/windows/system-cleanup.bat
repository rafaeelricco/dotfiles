@echo off
net session >nul 2>&1 || (echo Run as Administrator. & pause & exit /b 1)

echo === Deleting TEMP files ===
del /q/f/s "%TEMP%\*" 2>nul

echo === Emptying Recycle Bin ===
rd /s /q "%systemdrive%\$Recycle.Bin" 2>nul

echo === SFC scan ===
sfc /scannow

echo === DISM: StartComponentCleanup ===
Dism.exe /Online /Cleanup-Image /StartComponentCleanup

echo === DISM: RestoreHealth ===
Dism.exe /Online /Cleanup-Image /RestoreHealth

echo === DISM: ResetBase ===
Dism.exe /Online /Cleanup-Image /StartComponentCleanup /ResetBase

echo === Opening Prefetch folder ===
start "" explorer "C:\Windows\prefetch"

echo === Done ===
pause
