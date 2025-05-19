@echo off
cd /d "%~dp0"
echo Initializing Git in %CD%
git init
git add .
git commit -m "Initial commit from local ZIP export"
pause
