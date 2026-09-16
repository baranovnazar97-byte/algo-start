@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\stage-release.ps1" -Stage 1 %*
