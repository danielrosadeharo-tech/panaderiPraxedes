@echo off
REM Script para ejecutar auto-commit.ps1 en PowerShell

echo ========================================
echo Auto-commit for panaderiPraxedes
echo ========================================
echo.

cd /d "C:\Users\Daniel\Desktop\pagina web panaderia\panaderiPraxedes"

REM Ejecutar el script PowerShell
powershell -ExecutionPolicy Bypass -File "auto-commit.ps1"

pause
