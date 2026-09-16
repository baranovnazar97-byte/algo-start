@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\setup-domain.ps1" %*
