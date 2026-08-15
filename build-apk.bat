@echo off
setlocal
cd /d "%~dp0"
node scripts\build-apk.js
if errorlevel 1 (
  echo.
  echo APK build failed.
  exit /b 1
)
echo.
echo APK build complete.
