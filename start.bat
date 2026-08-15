@echo off
setlocal EnableExtensions

cd /d "%~dp0"
title RpenProof

set "NODE_EXE="
for %%I in (node.exe) do if not "%%~$PATH:I"=="" set "NODE_EXE=%%~$PATH:I"

if not defined NODE_EXE (
  set "BUNDLED_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
  if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" set "NODE_EXE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
)

if not defined NODE_EXE (
  echo.
  echo ERROR: Node.js was not found.
  echo Install the Node.js LTS version from https://nodejs.org/
  echo Then run start.bat again.
  echo.
  pause
  exit /b 1
)

for %%I in ("%NODE_EXE%") do set "NODE_DIR=%%~dpI"
set "PATH=%NODE_DIR%;%PATH%"

if not exist "node_modules\vite\bin\vite.js" (
  echo.
  echo Installing dependencies for the first launch...

  set "PNPM_EXE="
  for %%I in (pnpm.cmd) do if not "%%~$PATH:I"=="" set "PNPM_EXE=%%~$PATH:I"
  if not defined PNPM_EXE if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd" set "PNPM_EXE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd"

  if defined PNPM_EXE (
    call "%PNPM_EXE%" install
  ) else (
    where npm.cmd >nul 2>&1
    if errorlevel 1 (
      echo ERROR: npm or pnpm was not found.
      pause
      exit /b 1
    )
    call npm.cmd install
  )

  if errorlevel 1 (
    echo.
    echo ERROR: Dependency installation failed.
    pause
    exit /b 1
  )
)

echo.
echo Starting RpenProof...
echo The browser will open automatically.
echo Press Ctrl+C in this window to stop the app.
echo.

"%NODE_EXE%" "node_modules\vite\bin\vite.js" --host 127.0.0.1 --open
set "APP_EXIT=%ERRORLEVEL%"

if not "%APP_EXIT%"=="0" (
  echo.
  echo ERROR: RpenProof could not be started. Exit code: %APP_EXIT%
  pause
)

exit /b %APP_EXIT%
