// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize event listeners
    initializeEventListeners();
    
    // Load job positions for dropdown
    loadJobPositions();
    
    // Load available resumes
    loadAvailableResumes();
});

// Backend API endpoints
const BACKEND_API_URL = 'http://localhost:5000';

// Initialize event listeners
function initializeEventListeners() {
    // Form submission for analysis
    const analyzeForm = document.getElementById('analyzeForm');
    if (analyzeForm) {
        analyzeForm.addEventListener('submit', function(e) {
            e.preventDefault();
            startAnalysis();
        });
    }
    
    // Select all resumes checkbox
    const selectAllCheckbox = document.getElementById('selectAllResumes');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            toggleSelectAllResumes(this.checked);
            updateStartAnalysisButton();
        });
    }
    
    // Resume selection checkboxes - add event delegation
    const resumeTable = document.getElementById('resumeSelectionTable');
    if (resumeTable) {
        resumeTable.addEventListener('change', function(e) {
            if (e.target && e.target.classList.contains('resume-checkbox')) {
                updateStartAnalysisButton();
            }
        });
    }
    
    // Export results button
    const exportResultsBtn = document.getElementById('exportResultsBtn');
    if (exportResultsBtn) {
        exportResultsBtn.addEventListener('click', exportResults);
    }
    
    // Contact candidate button
    const contactCandidateBtn = document.getElementById('contactCandidateBtn');
    if (contactCandidateBtn) {
        contactCandidateBtn.addEventListener('click', function() {
            openContactModal();
        });
    }
    
    // Send email button
    const sendEmailBtn = document.getElementById('sendEmailBtn');
    if (sendEmailBtn) {
        sendEmailBtn.addEventListener('click', function() {
            sendEmail();
        });
    }
    
    // Initialize button state
    updateStartAnalysisButton();
}

// Load job positions from localStorage
function loadJobPositions() {
    const jobs = JSON.parse(localStorage.getItem('jobs')) || [];
    const positionSelect = document.getElementById('positionSelect');
    
    // Clear existing options (except the first one)
    while (positionSelect.options.length > 1) {
        positionSelect.remove(1);
    }
    
    // Add job positions to dropdown
    jobs.forEach(job => {
        const option = new Option(job.title, job.id);
        positionSelect.add(option);
    });
    
    // If no jobs, add a default option
    if (jobs.length === 0) {
        const option = new Option('No positions available', '');
        option.disabled = true;
        positionSelect.add(option);
    }
}

// Load available resumes from localStorage
function loadAvailableResumes() {
    const resumes = JSON.parse(localStorage.getItem('resumes')) || [];
    const tableBody = document.querySelector('#resumeSelectionTable tbody');
    
    // Clear existing data
    tableBody.innerHTML = '';
    
    if (resumes.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">No resumes available for analysis. Please upload resumes first.</td>
            </tr>
        `;
        return;
    }
    
    // Add resumes to table
    resumes.forEach(resume => {
        const row = document.createElement('tr');
        
        // Set OCR status badge class
        let ocrStatusBadgeClass = 'bg-warning';
        let ocrStatusText = 'Pending';
        if (resume.ocrProcessed) {
            ocrStatusBadgeClass = 'bg-success';
            ocrStatusText = 'Completed';
        } else if (resume.status === 'Processing') {
            ocrStatusBadgeClass = 'bg-info';
            ocrStatusText = 'Processing';
        } else if (resume.status === 'Failed') {
            ocrStatusBadgeClass = 'bg-danger';
            ocrStatusText = 'Failed';
        }
        
        // Get analysis info if available
        const analysisResults = JSON.parse(localStorage.getItem('analysisResults')) || [];
        const analysis = analysisResults.find(a => a.resumeId === resume.id);
        
        // Analysis score and summary
        const scoreHtml = analysis ? 
            `<div class="progress" style="height: 20px;">
                <div class="progress-bar ${getScoreBarClass(analysis.score)}" role="progressbar" style="width: ${analysis.score}%;" 
                    aria-valuenow="${analysis.score}" aria-valuemin="0" aria-valuemax="100">${analysis.score}%</div>
            </div>` : 
            '<span class="text-muted">Not analyzed</span>';
            
        const summaryHtml = analysis ? 
            `<span class="d-inline-block text-truncate" style="max-width: 200px;">${analysis.details.explanation.substring(0, 80)}...</span>` : 
            '<span class="text-muted">Not available</span>';
        
        row.innerHTML = `
            <td>
                <div class="form-check">
                    <input class="form-check-input resume-checkbox" type="checkbox" value="${resume.id}" id="resume-${resume.id}" 
                        ${!resume.ocrProcessed ? 'disabled' : ''}>
                </div>
            </td>
            <td>${resume.fileName}</td>
            <td>${resume.positionText}</td>
            <td>${resume.uploadDate}</td>
            <td><span class="badge ${ocrStatusBadgeClass}">${ocrStatusText}</span></td>
            <td>${scoreHtml}</td>
            <td>${summaryHtml}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Toggle select all resumes
function toggleSelectAllResumes(checked) {
    const checkboxes = document.querySelectorAll('.resume-checkbox:not([disabled])');
    checkboxes.forEach(checkbox => {
        checkbox.checked = checked;
    });
}

// Start the analysis process
function startAnalysis() {
    // Get selected position
    const positionSelect = document.getElementById('positionSelect');
    const positionId = positionSelect.value;
    const positionText = positionSelect.options[positionSelect.selectedIndex].text;
    
    // Get selected resumes
    const selectedResumeIds = [];
    const checkboxes = document.querySelectorAll('.resume-checkbox:checked');
    
    checkboxes.forEach(checkbox => {
        selectedResumeIds.push(checkbox.value);
    });
    
    // Validate selections
    if (selectedResumeIds.length === 0) {
        showAlert('Please select at least one resume to analyze.', 'danger');
        return;
    }
    
    // Get job description for selected position
    const jobs = JSON.parse(localStorage.getItem('jobs')) || [];
    const selectedJob = jobs.find(job => job.id === positionId);
    
    if (!selectedJob) {
        showAlert('Could not find the selected job position.', 'danger');
        return;
    }
    
    // Get resumes
    const resumes = JSON.parse(localStorage.getItem('resumes')) || [];
    const selectedResumes = resumes.filter(resume => selectedResumeIds.includes(resume.id));
    
    // Check if all selected resumes have been OCR processed
    const unprocessedResumes = selectedResumes.filter(resume => !resume.ocrProcessed);
    if (unprocessedResumes.length > 0) {
        let message = 'The following resumes have not been OCR processed yet:';
        unprocessedResumes.forEach(resume => {
            message += `\n- ${resume.fileName}`;
        });
        message += '\n\nPlease wait for OCR processing to complete before analyzing.';
        showAlert(message, 'warning');
        return;
    }
    
    // Show progress modal
    const progressModal = new bootstrap.Modal(document.getElementById('analysisProgressModal'));
    progressModal.show();
    
    // Update progress text
    const progressText = document.getElementById('progressText');
    progressText.textContent = `0 of ${selectedResumes.length} resumes analyzed`;
    
    // Update progress bar
    const progressBar = document.querySelector('.progress-bar');
    progressBar.style.width = '0%';
    progressBar.setAttribute('aria-valuenow', 0);
    
    // Start real analysis process with backend
    analyzeResumesWithBackend(selectedResumes, selectedJob, progressModal);
}

// Analyze resumes using the backend API
async function analyzeResumesWithBackend(resumes, job, progressModal) {
    const results = [];
    let processed = 0;
    
    // Update progress bar function
    const updateProgress = () => {
        const percentage = Math.round((processed / resumes.length) * 100);
        const progressBar = document.querySelector('.progress-bar');
        const progressText = document.getElementById('progressText');
        
        progressBar.style.width = `${percentage}%`;
        progressBar.setAttribute('aria-valuenow', percentage);
        progressText.textContent = `${processed} of ${resumes.length} resumes analyzed`;
    };
    
    // Process each resume sequentially to avoid overwhelming the API
    for (let i = 0; i < resumes.length; i++) {
        const resume = resumes[i];
        try {
            // Analyze resume with backend API
            const result = await analyzeResumeWithBackend(resume, job);
            results.push(result);
        } catch (error) {
            console.error('Error analyzing resume:', error);
            // Create fallback result with error
            const fallbackResult = createFallbackResult(resume, job, error);
            results.push(fallbackResult);
        }
            
            // Update progress
            processed++;
            updateProgress();
    }
            
                // Hide progress modal
                    progressModal.hide();
                    
                    // Display results
                    displayResults(results);
                    
                    // Save results to localStorage
                    saveResults(results);
                    
                    // Show success message
                    showAlert('Resume analysis completed successfully!', 'success');
}

// Analyze a single resume with backend API
async function analyzeResumeWithBackend(resume, job) {
    // Check if resume has OCR text and has been processed
    if (!resume.ocrProcessed) {
        return createFallbackResult(
            resume, 
            job, 
            new Error('OCR processing not completed')
        );
    }

    // Fix for missing OCR text - use extractedText if ocrText is missing
    if (!resume.ocrText && resume.extractedText) {
        resume.ocrText = resume.extractedText;
        
        // Update the resume in localStorage to save this change
        const resumes = JSON.parse(localStorage.getItem('resumes')) || [];
        const resumeIndex = resumes.findIndex(r => r.id === resume.id);
        if (resumeIndex !== -1) {
            resumes[resumeIndex].ocrText = resume.extractedText;
            localStorage.setItem('resumes', JSON.stringify(resumes));
        }
    }
    
    // Check again after the fix attempt
    if (!resume.ocrText && !resume.extractedText) {
        return createFallbackResult(
            resume, 
            job, 
            new Error('No OCR text available')
        );
    }
    
    try {
        // Call backend API to analyze resume
        const response = await fetch(`${BACKEND_API_URL}/api/analyze-resume`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                resume_text: resume.ocrText || resume.extractedText,
                job_description: job.description
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `API request failed with status ${response.status}`);
        }

        const analysisResult = await response.json();
        
        // Extract the match percentage as a number
        const matchPercentage = extractPercentage(analysisResult["JD Match"]);
        
        // Create the result object
        const result = {
            resumeId: resume.id,
            candidateName: resume.candidateName,
            candidateEmail: resume.candidateEmail,
            positionId: job.id,
            positionTitle: job.title,
            score: matchPercentage,
            status: determineStatus(matchPercentage),
            details: {
                matchedSkills: [], // We don't have this from Gemini
                missingSkills: analysisResult["MissingKeywords"] || [],
                explanation: analysisResult["Profile Summary"] || '',
                entities: resume.entities || {},
                strengths: [],
                weaknesses: []
            },
            analyzedDate: new Date().toISOString().split('T')[0],
            geminiResponse: analysisResult // Store the full response
        };
        
        // Update resume in localStorage to mark as analyzed
        updateResumeAnalysisStatus(resume.id, result.status);
        
        return result;
    } catch (error) {
        console.error('Error in backend analysis:', error);
        return createFallbackResult(resume, job, error);
    }
}

// Extract percentage from string like "85%" and convert to number
function extractPercentage(percentStr) {
    if (!percentStr) return 50; // Default value
    
    const match = percentStr.match(/(\d+)/);
    if (match && match[1]) {
        const percent = parseInt(match[1], 10);
        return isNaN(percent) ? 50 : percent;
    }
    return 50; // Default value
}
    
    // Determine status based on score
function determineStatus(score) {
    if (score >= 70) {
        return 'Shortlisted';
    } else if (score >= 30) {
        return 'Pending';
    } else {
        return 'Spam'; // For scores below 30, mark as potential spam
    }
}

// Create fallback result when analysis fails
function createFallbackResult(resume, job, error) {
    console.warn('Creating fallback result due to error:', error.message);
    
    // Generate a score between 40-60 to indicate uncertainty
    const score = 40 + Math.floor(Math.random() * 21);
    
    return {
        resumeId: resume.id,
        candidateName: resume.candidateName,
        candidateEmail: resume.candidateEmail,
        positionId: job.id,
        positionTitle: job.title,
        score: score,
        status: 'Pending',
        details: {
            matchedSkills: [],
            missingSkills: [],
            entities: resume.entities || {},
            explanation: `Could not analyze resume with backend API. Error: ${error.message}. Please try again later.`,
            strengths: [],
            weaknesses: []
        },
        analyzedDate: new Date().toISOString().split('T')[0],
        error: error.message
    };
}

// Update resume analysis status
function updateResumeAnalysisStatus(resumeId, status) {
    const resumes = JSON.parse(localStorage.getItem('resumes')) || [];
    const resumeIndex = resumes.findIndex(r => r.id === resumeId);
    
    if (resumeIndex !== -1) {
        resumes[resumeIndex].analyzed = true;
        resumes[resumeIndex].status = status;
        localStorage.setItem('resumes', JSON.stringify(resumes));
    }
}

// Display analysis results
function displayResults(results) {
    // Show results card
    document.getElementById('analysisResultsCard').style.display = 'block';
    
    // Get results table
    const resultsTable = document.getElementById('analysisResultsTable');
    const tableBody = resultsTable.querySelector('tbody');
    
    // Clear existing results
    tableBody.innerHTML = '';
    
    // Add results to table
    results.forEach(result => {
        const row = document.createElement('tr');
        row.setAttribute('data-result-id', result.resumeId);
        
        // Determine score class
        let scoreClass = 'score-medium';
        if (result.score >= 80) {
            scoreClass = 'score-high';
        } else if (result.score < 50) {
            scoreClass = 'score-low';
        }
        
        // Determine status badge class
        let statusBadgeClass = 'bg-warning';
        if (result.status === 'Approved') {
            statusBadgeClass = 'bg-success';
        } else if (result.status === 'Rejected') {
            statusBadgeClass = 'bg-danger';
        } else if (result.status === 'Under Review') {
            statusBadgeClass = 'bg-info';
        } else if (result.status === 'Spam') {
            statusBadgeClass = 'bg-secondary';
        }
        
        // Get the resume from localStorage to display file name
        const resumes = JSON.parse(localStorage.getItem('resumes')) || [];
        const resume = resumes.find(r => r.id === result.resumeId);
        const fileName = resume ? resume.fileName : 'Unknown';
        
        // Format missing keywords
        const missingKeywords = result.details.missingSkills && result.details.missingSkills.length > 0 
            ? result.details.missingSkills.slice(0, 3).join(', ') + (result.details.missingSkills.length > 3 ? '...' : '')
            : 'None';
        
        // Get a shortened version of the explanation
        const shortExplanation = result.details.explanation.length > 100 
            ? result.details.explanation.substring(0, 100) + '...' 
            : result.details.explanation;
        
        row.innerHTML = `
            <td>${fileName}</td>
            <td>
                <div class="d-flex align-items-center">
                    <div class="progress flex-grow-1 me-2" style="height: 20px;">
                        <div class="progress-bar ${getScoreBarClass(result.score)}" role="progressbar" style="width: ${result.score}%;" aria-valuenow="${result.score}" aria-valuemin="0" aria-valuemax="100">${result.score}%</div>
                    </div>
                    <span class="${scoreClass}">${result.score}%</span>
                </div>
            </td>
            <td>${missingKeywords}</td>
            <td class="explanation-text">${shortExplanation}</td>
            <td><span class="badge ${statusBadgeClass}">${result.status}</span></td>
            <td>
                <button class="btn btn-sm btn-info me-1 view-details" data-bs-toggle="modal" data-bs-target="#resultDetailModal">
                    <i class="bi bi-eye"></i> Details
                </button>
                <div class="dropdown d-inline-block">
                    <button class="btn btn-sm btn-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">
                        Status
                    </button>
                    <ul class="dropdown-menu">
                        <li><a class="dropdown-item change-status" data-status="Shortlisted" href="#">Shortlisted</a></li>
                        <li><a class="dropdown-item change-status" data-status="Pending" href="#">Pending</a></li>
                        <li><a class="dropdown-item change-status" data-status="Spam" href="#">Spam</a></li>
                    </ul>
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
        
        // Add event listener for view details button
        row.querySelector('.view-details').addEventListener('click', function() {
            showResultDetails(result);
        });
        
        // Add event listeners for status change dropdown items
        row.querySelectorAll('.change-status').forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                const newStatus = this.getAttribute('data-status');
                changeResumeStatus(result.resumeId, newStatus);
                
                // Update status badge in this row
                const statusBadge = row.querySelector('td:nth-child(5) .badge');
                statusBadge.className = `badge ${getStatusBadgeClass(newStatus)}`;
                statusBadge.textContent = newStatus;
            });
        });
    });
    
    // Scroll to results
    document.getElementById('analysisResultsCard').scrollIntoView({ behavior: 'smooth' });
}

// Save analysis results to localStorage
function saveResults(results) {
    localStorage.setItem('analysisResults', JSON.stringify(results));
}

// Show result details in modal
function showResultDetails(result) {
    // Get the resume from localStorage to display file name
    const resumes = JSON.parse(localStorage.getItem('resumes')) || [];
    const resume = resumes.find(r => r.id === result.resumeId);
    const fileName = resume ? resume.fileName : 'Unknown';
    
    // Set modal title
    document.getElementById('resultDetailModalLabel').textContent = `Analysis: ${fileName}`;
    
    // Get modal content element
    const contentElement = document.getElementById('resultDetailContent');
    
    // Handle Gemini result vs fallback result differently
    let missingKeywordsHtml = '<p>No missing keywords identified.</p>';
    if (result.details.missingSkills && result.details.missingSkills.length > 0) {
        missingKeywordsHtml = `
            <ul class="list-group">
                ${result.details.missingSkills.map(skill => `<li class="list-group-item">${skill}</li>`).join('')}
            </ul>
        `;
    }
    
    // Format entities if available
    let entitiesHtml = '<p>No entities extracted.</p>';
    if (result.details.entities && Object.keys(result.details.entities).length > 0) {
        entitiesHtml = '';
        for (const [entityType, entities] of Object.entries(result.details.entities)) {
            if (Array.isArray(entities) && entities.length > 0) {
                entitiesHtml += `<h6>${entityType.charAt(0).toUpperCase() + entityType.slice(1)}</h6>`;
                entitiesHtml += '<ul class="list-group mb-3">';
                entities.forEach(entity => {
                    entitiesHtml += `<li class="list-group-item">${entity}</li>`;
                });
                entitiesHtml += '</ul>';
            }
        }
    }

    // Create content HTML with Gemini-specific information
    const html = `
        <div class="row mb-4">
            <div class="col-md-12">
                <div class="card border-primary">
                    <div class="card-header bg-primary text-white">
                        <h5 class="mb-0">Match Score: ${result.score}%</h5>
                    </div>
                    <div class="card-body">
                        <div class="progress mb-3" style="height: 25px;">
                            <div class="progress-bar ${getScoreBarClass(result.score)}" role="progressbar" style="width: ${result.score}%;" aria-valuenow="${result.score}" aria-valuemin="0" aria-valuemax="100">
                                ${result.score}%
                            </div>
                        </div>
                        <h6>Profile Summary:</h6>
                        <div class="alert alert-light">
                            ${result.details.explanation || 'No explanation available.'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="row mb-4">
            <div class="col-md-6">
                <div class="card h-100">
                    <div class="card-header">
                        <h5 class="mb-0">Missing Keywords</h5>
                    </div>
                    <div class="card-body">
                        ${missingKeywordsHtml}
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card h-100">
                    <div class="card-header">
                        <h5 class="mb-0">Extracted Entities</h5>
                    </div>
                    <div class="card-body">
                        ${entitiesHtml}
                </div>
                </div>
            </div>
        </div>
        
        <div class="row">
            <div class="col-md-12">
                <div class="card">
                    <div class="card-header">
                        <h5 class="mb-0">Resume Information</h5>
                    </div>
                    <div class="card-body">
            <div class="row">
                <div class="col-md-6">
                                <p><strong>File Name:</strong> ${fileName}</p>
                                <p><strong>Candidate:</strong> ${resume ? resume.candidateName : 'Unknown'}</p>
                                <p><strong>Email:</strong> ${result.candidateEmail}</p>
                                <p><strong>Position Applied:</strong> ${result.positionTitle}</p>
                </div>
                <div class="col-md-6">
                                <p><strong>Current Status:</strong> <span class="badge ${getStatusBadgeClass(result.status)}">${result.status}</span></p>
                                <p><strong>Analysis Date:</strong> ${result.analyzedDate}</p>
                                <p><strong>Upload Date:</strong> ${resume ? resume.uploadDate : 'Unknown'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Set the content
    contentElement.innerHTML = html;
    
    // Set email in the contact form
    const emailTo = document.getElementById('emailTo');
    if (emailTo) {
        emailTo.value = result.candidateEmail;
    }
}

// Change resume status
function changeResumeStatus(resumeId, newStatus) {
    // Update in resumes
    const resumes = JSON.parse(localStorage.getItem('resumes')) || [];
    const resumeIndex = resumes.findIndex(r => r.id === resumeId);
    
    if (resumeIndex !== -1) {
        resumes[resumeIndex].status = newStatus;
        localStorage.setItem('resumes', JSON.stringify(resumes));
    }
    
    // Update in analysis results
    const results = JSON.parse(localStorage.getItem('analysisResults')) || [];
    const resultIndex = results.findIndex(r => r.resumeId === resumeId);
    
    if (resultIndex !== -1) {
        results[resultIndex].status = newStatus;
        localStorage.setItem('analysisResults', JSON.stringify(results));
    }
    
    // Show success message
    showAlert(`Status updated to "${newStatus}" successfully!`, 'success');
}

// Open contact candidate modal
function openContactModal() {
    // Get resume ID from button
    const resumeId = document.getElementById('contactCandidateBtn').getAttribute('data-resume-id');
    
    // Get resume from localStorage
    const resumes = JSON.parse(localStorage.getItem('resumes')) || [];
    const resume = resumes.find(r => r.id === resumeId);
    
    if (resume) {
        // Set email recipient
        document.getElementById('emailTo').value = resume.candidateEmail;
        
        // Set default email body based on status
        let defaultMessage = '';
        
        switch (resume.status) {
            case 'Approved':
                defaultMessage = `Dear ${resume.candidateName},\n\nThank you for applying for the ${resume.positionText} position. We are pleased to inform you that your application has been reviewed and we would like to invite you for an interview.\n\nPlease let us know your availability for the coming week.\n\nBest regards,\nHR Team`;
                break;
            case 'Rejected':
                defaultMessage = `Dear ${resume.candidateName},\n\nThank you for applying for the ${resume.positionText} position. After careful consideration, we regret to inform you that we have decided to pursue other candidates whose qualifications better meet our needs at this time.\n\nWe appreciate your interest in our company and wish you success in your job search.\n\nBest regards,\nHR Team`;
                break;
            default:
                defaultMessage = `Dear ${resume.candidateName},\n\nThank you for applying for the ${resume.positionText} position. Your application is currently under review, and we will contact you soon with more information.\n\nBest regards,\nHR Team`;
        }
        
        document.getElementById('emailBody').value = defaultMessage;
        
        // Show contact modal
        const contactModal = new bootstrap.Modal(document.getElementById('contactCandidateModal'));
        contactModal.show();
    }
}

// Send email (simulated)
function sendEmail() {
    // In a real application, this would send an email via the backend
    // For this demo, we'll just show a success message
    
    // Hide contact modal
    const contactModal = bootstrap.Modal.getInstance(document.getElementById('contactCandidateModal'));
    contactModal.hide();
    
    // Show success message
    showAlert('Email sent successfully!', 'success');
}

// Export results to CSV (simulated)
function exportResults() {
    // In a real application, this would generate a CSV file
    // For this demo, we'll just show a success message
    showAlert('Results exported successfully!', 'success');
}

// Helper function to get status badge class
function getStatusBadgeClass(status) {
    switch (status) {
        case 'Shortlisted':
            return 'bg-success';
        case 'Pending':
            return 'bg-warning';
        case 'Spam':
            return 'bg-secondary';
        // Keep these for backward compatibility
        case 'Approved':
            return 'bg-success';
        case 'Rejected':
            return 'bg-danger';
        case 'Under Review':
            return 'bg-info';
        default:
            return 'bg-warning'; // Default to warning
    }
}

// Helper function to get score text class
function getScoreTextClass(score) {
    if (score >= 80) {
        return 'score-high';
    } else if (score >= 50) {
        return 'score-medium';
    } else {
        return 'score-low';
    }
}

// Helper function to get score progress bar class
function getScoreBarClass(score) {
    if (score >= 80) {
        return 'bg-success';
    } else if (score >= 50) {
        return 'bg-warning';
    } else {
        return 'bg-danger';
    }
}

// Show alert message
function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.setAttribute('role', 'alert');
    
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Insert after the heading
    const heading = document.querySelector('.border-bottom');
    heading.parentNode.insertBefore(alertDiv, heading.nextSibling);
    
    // Auto dismiss after 3 seconds
    setTimeout(() => {
        alertDiv.classList.remove('show');
        setTimeout(() => {
            alertDiv.remove();
        }, 150);
    }, 3000);
}

// Update Start Analysis button state based on selection
function updateStartAnalysisButton() {
    const startAnalysisBtn = document.getElementById('startAnalysisBtn');
    const checkboxes = document.querySelectorAll('.resume-checkbox:checked');
    
    if (startAnalysisBtn) {
        if (checkboxes.length > 0) {
            startAnalysisBtn.disabled = false;
        } else {
            startAnalysisBtn.disabled = true;
        }
    }
}