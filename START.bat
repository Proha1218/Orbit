@echo off
setlocal
pushd "%~dp0" || goto :badpath
if not exist "dist\index.html" goto :missing
if not exist "dist\app.js" goto :missing
if not exist "server.mjs" goto :missing

where node.exe >nul 2>&1
if not errorlevel 1 (
  node.exe --version >nul 2>&1
  if not errorlevel 1 (
    node.exe server.mjs --launch
    goto :finished
  )
)

if not exist "server.py" goto :missing
where py.exe >nul 2>&1
if not errorlevel 1 (
  py.exe -3 -c "import sys; sys.exit(sys.version_info < (3, 8))" >nul 2>&1
  if not errorlevel 1 (
    py.exe -3 server.py --launch
    goto :finished
  )
)

for %%I in (python.exe) do set "ORBITA_PYTHON=%%~$PATH:I"
if defined ORBITA_PYTHON if /i not "%ORBITA_PYTHON%"=="%LOCALAPPDATA%\Microsoft\WindowsApps\python.exe" (
  "%ORBITA_PYTHON%" -c "import sys; sys.exit(sys.version_info < (3, 8))" >nul 2>&1
  if not errorlevel 1 (
    "%ORBITA_PYTHON%" server.py --launch
    goto :finished
  )
)
echo Install Node.js from https://nodejs.org/ or Python 3.8+ from https://python.org/.
echo Then double-click START.bat again.
goto :error

:finished
if errorlevel 1 goto :error
popd
exit /b 0

:missing
echo Project files are missing. Extract the entire ZIP, then run START.bat inside the extracted folder.
:error
popd
:badpath
pause
exit /b 1
