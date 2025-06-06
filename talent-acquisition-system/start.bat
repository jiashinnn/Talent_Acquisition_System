@echo off
echo Starting Talent Acquisition System...
echo.

REM Check if PowerShell exists
where powershell >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Found PowerShell, using PowerShell script...
    powershell -ExecutionPolicy Bypass -File "%~dp0start.ps1"
    goto end
)

REM If PowerShell is not available, use the CMD version
echo PowerShell not found, using CMD script...

REM Check if Python is installed
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Python is not installed or not in the PATH. Backend services won't be available.
    echo Resume analysis using Gemini Pro may not work properly.
    echo.
    goto start_frontend
)

REM Check if required Python packages are installed
echo Checking required Python packages...
cd backend
python -c "import flask, flask_cors, spacy, requests" >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Installing required Python packages...
    pip install -r requirements.txt
)

REM Check if spaCy model is installed
python -c "import spacy; spacy.load('en_core_web_sm')" >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Installing spaCy language model...
    python -m spacy download en_core_web_sm
)

REM Start Flask backend in a new window
echo Starting backend services...
start "Talent Acquisition System - Backend" cmd /c "cd backend && python app.py"
echo Backend running at http://localhost:5000

:start_frontend
REM Start frontend
echo Starting frontend...
echo.
echo Talent Acquisition System is now running!
echo.
echo Frontend available at:
echo file://%cd%/index.html
echo.
echo Please open the above URL in your browser.
echo Press Ctrl+C to stop the services.
echo.

REM Keep the window open
pause

:end 