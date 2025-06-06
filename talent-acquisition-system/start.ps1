Write-Host "Starting Talent Acquisition System..." -ForegroundColor Green
Write-Host

# Check if Python is installed
try {
    $pythonVersion = python --version
    Write-Host "Found Python: $pythonVersion"
} catch {
    Write-Host "Python is not installed or not in the PATH. Backend services won't be available." -ForegroundColor Yellow
    Write-Host "Resume analysis using Gemini Pro may not work properly." -ForegroundColor Yellow
    Write-Host
    goto start_frontend
}

# Check if required Python packages are installed
Write-Host "Checking required Python packages..." -ForegroundColor Cyan
Set-Location -Path "backend"
try {
    python -c "import flask, flask_cors, spacy, requests" | Out-Null
    Write-Host "All required Python packages are installed." -ForegroundColor Green
} catch {
    Write-Host "Installing required Python packages..." -ForegroundColor Yellow
    pip install -r requirements.txt
}

# Check if spaCy model is installed
try {
    python -c "import spacy; spacy.load('en_core_web_sm')" | Out-Null
    Write-Host "spaCy language model is installed." -ForegroundColor Green
} catch {
    Write-Host "Installing spaCy language model..." -ForegroundColor Yellow
    python -m spacy download en_core_web_sm
}

# Start Flask backend in a new window
Write-Host "Starting backend services..." -ForegroundColor Green
Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd backend && python app.py" -WindowStyle Normal

# Wait a moment for the backend to start
Start-Sleep -Seconds 2
Write-Host "Backend running at http://localhost:5000" -ForegroundColor Cyan

# Return to the main directory
Set-Location -Path ".."

# Start frontend
:start_frontend
Write-Host "Starting frontend..." -ForegroundColor Green
Write-Host
Write-Host "Talent Acquisition System is now running!" -ForegroundColor Green
Write-Host
Write-Host "Frontend available at:" -ForegroundColor Cyan
Write-Host "file://$(Get-Location)/index.html" -ForegroundColor Cyan
Write-Host
Write-Host "Please open the above URL in your browser." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the services." -ForegroundColor Cyan
Write-Host

# Keep the window open
Read-Host "Press Enter to exit" 