@echo off
echo Installing dependencies...
pnpm install

echo Building the production app...
pnpm run build

echo Exporting static files if applicable...
pnpm run export

pause
