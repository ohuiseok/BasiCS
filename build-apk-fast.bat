@echo off
setlocal
cd /d "%~dp0"
node scripts\build-apk-fast.js
if errorlevel 1 (
  echo.
  echo Fast APK build failed.
  exit /b 1
)
echo.
echo Fast APK build complete.
