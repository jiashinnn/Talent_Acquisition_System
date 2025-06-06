document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const statusFilter = document.getElementById('statusFilter');
    const positionFilter = document.getElementById('positionFilter');
    const scoreFilter = document.getElementById('scoreFilter');
    const sortBy = document.getElementById('sortBy');
    
    const shortlistedTable = document.getElementById('shortlistedTable').querySelector('tbody');
    const pendingTable = document.getElementById('pendingTable').querySelector('tbody');
    const spamTable = document.getElementById('spamTable').querySelector('tbody');
    
    const shortlistedCount = document.getElementById('shortlistedCount');
    const pendingCount = document.getElementById('pendingCount');
    const spamCount = document.getElementById('spamCount');
    
    const candidateDetailContent = document.getElementById('candidateDetailContent');
    
    // Current candidate being viewed
    let currentCandidate = null;
    
    // Initialize the page
    initializeFilters();
    loadCandidates();
    
    // Add event listeners
    statusFilter.addEventListener('change', loadCandidates);
    positionFilter.addEventListener('change', loadCandidates);
    scoreFilter.addEventListener('change', loadCandidates);
    sortBy.addEventListener('change', loadCandidates);
    
    document.querySelectorAll('.change-candidate-status').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            if (currentCandidate) {
                changeStatus(currentCandidate.resumeId, this.getAttribute('data-status'));
            }
        });
    });
    
    document.getElementById('contactCandidateBtn').addEventListener('click', function() {
        if (currentCandidate) {
            showContactModal(currentCandidate);
        }
    });
    
    document.getElementById('sendEmailBtn').addEventListener('click', function() {
        sendEmail();
    });
    
    // Initialize filters
    function initializeFilters() {
        // Load positions from job descriptions
        const jobDescriptions = JSON.parse(localStorage.getItem('jobDescriptions')) || [];
        
        jobDescriptions.forEach(job => {
            const option = document.createElement('option');
            option.value = job.id;
            option.textContent = job.title;
            positionFilter.appendChild(option);
        });
    }
    
    // Load candidates from localStorage
    function loadCandidates() {
        // Get filters
        const statusValue = statusFilter.value;
        const positionValue = positionFilter.value;
        const scoreValue = scoreFilter.value;
        const sortValue = sortBy.value;
        
        // Get resumes and analysis results
        const resumes = JSON.parse(localStorage.getItem('resumes')) || [];
        const analysisResults = JSON.parse(localStorage.getItem('analysisResults')) || [];
        
        console.log('Analysis results loaded:', analysisResults);
        
        // Filter and combine data
        const candidates = [];
        
        // First approach: Add candidates based on analyzed flag in resumes
        resumes.forEach(resume => {
            // Check if this resume has been analyzed
            if (resume.analyzed) {
                // Find analysis result for this resume
                const analysis = analysisResults.find(a => a.resumeId === resume.id);
                
                if (analysis) {
                    const candidate = {
                        resumeId: resume.id,
                        name: resume.candidateName,
                        position: analysis.positionTitle,
                        positionId: analysis.positionId,
                        score: analysis.score,
                        status: resume.status,
                        email: resume.candidateEmail,
                        phone: resume.phone || 'Not provided',
                        date: analysis.analyzedDate,
                        details: analysis.details,
                        fileName: resume.fileName,
                        uploadDate: resume.uploadDate,
                        extractedText: resume.extractedText || resume.ocrText
                    };
                    
                    candidates.push(candidate);
                }
            }
        });
        
        // Second approach: Add candidates based on analysis results
        // This ensures we don't miss any analyzed resumes
        analysisResults.forEach(analysis => {
            // Check if we already added this candidate based on the resume
            const alreadyAdded = candidates.some(c => c.resumeId === analysis.resumeId);
            
            // If not already added, add it now
            if (!alreadyAdded) {
                // Get the resume data
                const resume = resumes.find(r => r.id === analysis.resumeId);
                
                if (resume) {
                    // Update the resume to mark it as analyzed
                    if (!resume.analyzed) {
                        resume.analyzed = true;
                        
                        // Update in localStorage
                        const resumeIndex = resumes.findIndex(r => r.id === analysis.resumeId);
                        if (resumeIndex !== -1) {
                            resumes[resumeIndex].analyzed = true;
                            localStorage.setItem('resumes', JSON.stringify(resumes));
                        }
                    }
                    
                    // Create the candidate object
                    const candidate = {
                        resumeId: resume.id,
                        name: resume.candidateName,
                        position: analysis.positionTitle || resume.positionText || 'Unspecified',
                        positionId: analysis.positionId,
                        score: analysis.score,
                        status: resume.status || 'Pending', // Default to Pending if no status
                        email: resume.candidateEmail,
                        phone: resume.phone || 'Not provided',
                        date: analysis.analyzedDate || 'Unknown',
                        details: analysis.details,
                        fileName: resume.fileName,
                        uploadDate: resume.uploadDate,
                        extractedText: resume.extractedText || resume.ocrText
                    };
                    
                    candidates.push(candidate);
                }
            }
        });
        
        console.log('Found candidates:', candidates);
        
        // Apply filters
        let filteredCandidates = candidates;
        
        // Status filter
        if (statusValue !== 'all') {
            filteredCandidates = filteredCandidates.filter(c => c.status === statusValue);
        }
        
        // Position filter
        if (positionValue !== 'all') {
            filteredCandidates = filteredCandidates.filter(c => c.positionId === positionValue);
        }
        
        // Score filter
        if (scoreValue !== 'all') {
            if (scoreValue === 'high') {
                filteredCandidates = filteredCandidates.filter(c => c.score >= 80);
            } else if (scoreValue === 'medium') {
                filteredCandidates = filteredCandidates.filter(c => c.score >= 50 && c.score < 80);
            } else if (scoreValue === 'low') {
                filteredCandidates = filteredCandidates.filter(c => c.score < 50);
            }
        }
        
        // Apply sorting
        switch (sortValue) {
            case 'score_desc':
                filteredCandidates.sort((a, b) => b.score - a.score);
                break;
            case 'score_asc':
                filteredCandidates.sort((a, b) => a.score - b.score);
                break;
            case 'name_asc':
                filteredCandidates.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'name_desc':
                filteredCandidates.sort((a, b) => b.name.localeCompare(a.name));
                break;
            case 'date_desc':
                filteredCandidates.sort((a, b) => new Date(b.date) - new Date(a.date));
                break;
            case 'date_asc':
                filteredCandidates.sort((a, b) => new Date(a.date) - new Date(b.date));
                break;
        }
        
        // Separate candidates by status
        const shortlisted = filteredCandidates.filter(c => c.status === 'Shortlisted');
        const pending = filteredCandidates.filter(c => c.status === 'Pending');
        const spam = filteredCandidates.filter(c => c.status === 'Spam');
        
        // Update counters
        shortlistedCount.textContent = shortlisted.length;
        pendingCount.textContent = pending.length;
        spamCount.textContent = spam.length;
        
        // Display candidates in tables
        displayCandidates(shortlistedTable, shortlisted);
        displayCandidates(pendingTable, pending);
        displayCandidates(spamTable, spam);
    }
    
    // Display candidates in a table
    function displayCandidates(tableBody, candidates) {
        tableBody.innerHTML = '';
        
        if (candidates.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="6" class="text-center">No candidates found.</td>`;
            tableBody.appendChild(row);
            return;
        }
        
        candidates.forEach(candidate => {
            const row = document.createElement('tr');
            row.setAttribute('data-candidate-id', candidate.resumeId);
            
            // Determine score class
            let scoreClass = 'score-medium';
            if (candidate.score >= 80) {
                scoreClass = 'score-high';
            } else if (candidate.score < 50) {
                scoreClass = 'score-low';
            }
            
            row.innerHTML = `
                <td>${candidate.name}</td>
                <td>${candidate.position}</td>
                <td>
                    <div class="progress" style="height: 20px;">
                        <div class="progress-bar ${getScoreBarClass(candidate.score)}" 
                            role="progressbar" style="width: ${candidate.score}%;" 
                            aria-valuenow="${candidate.score}" aria-valuemin="0" 
                            aria-valuemax="100">${candidate.score}%</div>
                    </div>
                </td>
                <td>${candidate.email}</td>
                <td>${candidate.date}</td>
                <td>
                    <button class="btn btn-sm btn-info view-candidate" data-bs-toggle="modal" data-bs-target="#candidateDetailModal">
                        <i class="bi bi-eye"></i> View
                    </button>
                </td>
            `;
            
            tableBody.appendChild(row);
            
            // Add event listener
            row.querySelector('.view-candidate').addEventListener('click', function() {
                showCandidateDetails(candidate);
            });
        });
    }
    
    // Show candidate details in modal
    function showCandidateDetails(candidate) {
        currentCandidate = candidate;
        
        // Set modal title
        document.getElementById('candidateDetailModalLabel').textContent = `${candidate.name} - ${candidate.position}`;
        
        // Build HTML for candidate details
        let html = `
            <div class="row mb-4">
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0">Candidate Information</h5>
                        </div>
                        <div class="card-body">
                            <p><strong>Name:</strong> ${candidate.name}</p>
                            <p><strong>Email:</strong> ${candidate.email}</p>
                            <p><strong>Phone:</strong> ${candidate.phone}</p>
                            <p><strong>Position Applied:</strong> ${candidate.position}</p>
                            <p><strong>Status:</strong> <span class="badge ${getStatusBadgeClass(candidate.status)}">${candidate.status}</span></p>
                            <p><strong>Score:</strong> <span class="${getScoreTextClass(candidate.score)}">${candidate.score}%</span></p>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0">Analysis Results</h5>
                        </div>
                        <div class="card-body">
                            <p><strong>Analysis Date:</strong> ${candidate.date}</p>
                            <p><strong>File Name:</strong> ${candidate.fileName}</p>
                            <p><strong>Upload Date:</strong> ${candidate.uploadDate}</p>
                            <div class="mt-3">
                                <h6>Match Score</h6>
                                <div class="progress mb-3" style="height: 25px;">
                                    <div class="progress-bar ${getScoreBarClass(candidate.score)}" 
                                        role="progressbar" style="width: ${candidate.score}%;" 
                                        aria-valuenow="${candidate.score}" aria-valuemin="0" 
                                        aria-valuemax="100">${candidate.score}%</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="row">
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0">Analysis Summary</h5>
                        </div>
                        <div class="card-body">
                            <p>${candidate.details.explanation || 'No summary available.'}</p>
                            
                            <h6 class="mt-4">Missing Skills/Keywords</h6>
                            ${candidate.details.missingSkills && candidate.details.missingSkills.length > 0 ? 
                                `<ul>${candidate.details.missingSkills.map(skill => `<li>${skill}</li>`).join('')}</ul>` : 
                                '<p>No missing skills identified.</p>'}
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0">Resume Text</h5>
                        </div>
                        <div class="card-body">
                            <div class="resume-text-container" style="max-height: 300px; overflow-y: auto;">
                                <pre class="text-muted" style="white-space: pre-wrap;">${candidate.extractedText || 'No text available.'}</pre>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        candidateDetailContent.innerHTML = html;
    }
    
    // Show contact modal
    function showContactModal(candidate) {
        document.getElementById('contactEmail').value = candidate.email;
        document.getElementById('contactPhone').value = candidate.phone;
        
        // Prepare default message
        const defaultMessage = `Dear ${candidate.name},\n\nThank you for applying for the ${candidate.position} position at our company. We have reviewed your resume and would like to discuss your application further.\n\nBest regards,\nRecruitment Team`;
        
        document.getElementById('contactMessage').value = defaultMessage;
        
        // Show modal
        const contactModal = new bootstrap.Modal(document.getElementById('contactCandidateModal'));
        contactModal.show();
    }
    
    // Send email (mock function)
    function sendEmail() {
        const email = document.getElementById('contactEmail').value;
        const subject = document.getElementById('contactSubject').value;
        const message = document.getElementById('contactMessage').value;
        
        // In a real application, this would send an email
        // For now, just show an alert
        alert(`Email would be sent to ${email} with subject: ${subject}`);
        
        // Close modal
        const contactModal = bootstrap.Modal.getInstance(document.getElementById('contactCandidateModal'));
        contactModal.hide();
    }
    
    // Function to add recent activity to localStorage
    function addRecentActivity(activity) {
        // Get existing activities
        let activities = JSON.parse(localStorage.getItem('recentActivities')) || [];
        
        // Add new activity
        const newActivity = {
            date: new Date().toISOString(),
            type: 'Candidate Management',
            details: activity
        };
        
        activities.push(newActivity);
        
        // Limit to 50 most recent activities
        if (activities.length > 50) {
            activities = activities.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 50);
        }
        
        // Save back to localStorage
        localStorage.setItem('recentActivities', JSON.stringify(activities));
    }
    
    // Change candidate status
    function changeStatus(resumeId, newStatus) {
        // Get resumes and analysis results
        const resumes = JSON.parse(localStorage.getItem('resumes')) || [];
        const analysisResults = JSON.parse(localStorage.getItem('analysisResults')) || [];
        
        // Update status in resumes
        const resumeIndex = resumes.findIndex(r => r.id === resumeId);
        if (resumeIndex !== -1) {
            const oldStatus = resumes[resumeIndex].status;
            resumes[resumeIndex].status = newStatus;
            localStorage.setItem('resumes', JSON.stringify(resumes));
            
            // Update status in analysis results
            const analysisIndex = analysisResults.findIndex(a => a.resumeId === resumeId);
            if (analysisIndex !== -1) {
                analysisResults[analysisIndex].status = newStatus;
                localStorage.setItem('analysisResults', JSON.stringify(analysisResults));
            }
            
            // Update current candidate if it's the one being viewed
            if (currentCandidate && currentCandidate.resumeId === resumeId) {
                currentCandidate.status = newStatus;
                showCandidateDetails(currentCandidate);
            }
            
            // Show success message
            showAlert(`Candidate status changed from ${oldStatus || 'Pending'} to ${newStatus}`, 'success');
            
            // Add to recent activities
            const candidateName = resumes[resumeIndex].candidateName || 'Unknown candidate';
            addRecentActivity(`Changed status of ${candidateName} from ${oldStatus || 'Pending'} to ${newStatus}`);
            
            // Reload candidates
            loadCandidates();
        } else {
            showAlert('Error: Resume not found', 'danger');
        }
    }
    
    // Helper function to get score bar class
    function getScoreBarClass(score) {
        if (score >= 70) {
            return 'bg-success';
        } else if (score >= 30) {
            return 'bg-warning';
        } else {
            return 'bg-danger';
        }
    }
    
    // Helper function to get score text class
    function getScoreTextClass(score) {
        if (score >= 70) {
            return 'text-success fw-bold';
        } else if (score >= 30) {
            return 'text-warning fw-bold';
        } else {
            return 'text-danger fw-bold';
        }
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
            default:
                return 'bg-warning';
        }
    }
    
    // Show alert message
    function showAlert(message, type = 'info') {
        // Create alert element
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
        alertDiv.role = 'alert';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        // Add to document
        document.body.appendChild(alertDiv);
        
        // Remove after 3 seconds
        setTimeout(() => {
            alertDiv.classList.remove('show');
            setTimeout(() => alertDiv.remove(), 150);
        }, 3000);
    }
}); 