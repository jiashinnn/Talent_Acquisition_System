// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize event listeners
    initializeEventListeners();
    
    // Load any existing jobs from localStorage
    loadJobs();
});

// Initialize event listeners
function initializeEventListeners() {
    // Add job form submission
    const addJobForm = document.getElementById('addJobForm');
    if (addJobForm) {
        addJobForm.addEventListener('submit', function(e) {
            e.preventDefault();
            addNewJob();
        });
    }
    
    // Job search functionality
    const jobSearchButton = document.getElementById('jobSearchButton');
    const jobSearchInput = document.getElementById('jobSearchInput');
    
    if (jobSearchButton && jobSearchInput) {
        jobSearchButton.addEventListener('click', function() {
            searchJobs(jobSearchInput.value);
        });
        
        jobSearchInput.addEventListener('keyup', function(e) {
            if (e.key === 'Enter') {
                searchJobs(jobSearchInput.value);
            }
        });
    }
    
    // Save changes button in edit modal
    const saveJobChanges = document.getElementById('saveJobChanges');
    if (saveJobChanges) {
        saveJobChanges.addEventListener('click', function() {
            saveEditedJob();
        });
    }
    
    // Setup delete job buttons
    setupDeleteButtons();
}

// Add a new job
function addNewJob() {
    // Get form values
    const jobTitle = document.getElementById('jobTitle').value;
    const jobDescription = document.getElementById('jobDescription').value;
    
    // Generate a unique job ID
    const jobId = 'JOB-' + new Date().getFullYear() + '-' + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    // Create job object
    const job = {
        id: jobId,
        title: jobTitle,
        description: jobDescription,
        datePosted: new Date().toISOString().split('T')[0]
    };
    
    // Save to localStorage
    saveJob(job);
    
    // Add to table
    addJobToTable(job);
    
    // Reset form
    document.getElementById('addJobForm').reset();
    
    // Show success message
    showAlert('Job position added successfully!', 'success');
    
    // Add to recent activities
    addRecentActivity(`New job position added: ${jobTitle}`);
}

// Save job to localStorage
function saveJob(job) {
    let jobs = JSON.parse(localStorage.getItem('jobs')) || [];
    jobs.push(job);
    localStorage.setItem('jobs', JSON.stringify(jobs));
}

// Add job to the table
function addJobToTable(job) {
    const tableBody = document.querySelector('#jobsTable tbody');
    
    // Remove "No jobs" message if it exists
    if (tableBody.querySelector('tr td[colspan]')) {
        tableBody.innerHTML = '';
    }
    
    const row = document.createElement('tr');
    row.setAttribute('data-job-id', job.id);
    
    row.innerHTML = `
        <td>${job.title}</td>
        <td>${job.datePosted}</td>
        <td>
            <button class="btn btn-sm btn-info me-1 view-job" data-bs-toggle="modal" data-bs-target="#viewJobModal">
                <i class="bi bi-eye"></i>
            </button>
            <button class="btn btn-sm btn-warning me-1 edit-job" data-bs-toggle="modal" data-bs-target="#editJobModal">
                <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-sm btn-danger delete-job">
                <i class="bi bi-trash"></i>
            </button>
        </td>
    `;
    
    tableBody.appendChild(row);
    
    // Setup event listeners for the new buttons
    setupRowButtons(row);
}

// Load jobs from localStorage
function loadJobs() {
    const jobs = JSON.parse(localStorage.getItem('jobs')) || [];
    const tableBody = document.querySelector('#jobsTable tbody');
    
    // Clear existing sample data
    tableBody.innerHTML = '';
    
    // Add jobs to table
    jobs.forEach(job => {
        addJobToTable(job);
    });
    
    // If no jobs, show message
    if (jobs.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="3" class="text-center">No job positions found. Add your first job position above.</td>
            </tr>
        `;
    }
}

// Setup delete buttons
function setupDeleteButtons() {
    document.querySelectorAll('.delete-job').forEach(button => {
        button.addEventListener('click', function() {
            const row = this.closest('tr');
            const jobId = row.getAttribute('data-job-id');
            
            if (confirm('Are you sure you want to delete this job position?')) {
                deleteJob(jobId);
                row.remove();
                showAlert('Job position deleted successfully!', 'danger');
                
                // Check if table is empty
                const tableBody = document.querySelector('#jobsTable tbody');
                if (tableBody.children.length === 0) {
                    tableBody.innerHTML = `
                        <tr>
                            <td colspan="3" class="text-center">No job positions found. Add your first job position above.</td>
                        </tr>
                    `;
                }
            }
        });
    });
}

// Setup row buttons (view, edit, delete)
function setupRowButtons(row) {
    // View button
    row.querySelector('.view-job').addEventListener('click', function() {
        const jobId = row.getAttribute('data-job-id');
        viewJob(jobId);
    });
    
    // Edit button
    row.querySelector('.edit-job').addEventListener('click', function() {
        const jobId = row.getAttribute('data-job-id');
        editJob(jobId);
    });
    
    // Delete button
    row.querySelector('.delete-job').addEventListener('click', function() {
        const jobId = row.getAttribute('data-job-id');
        
        if (confirm('Are you sure you want to delete this job position?')) {
            const jobTitle = row.cells[0].textContent;
            deleteJob(jobId);
            row.remove();
            showAlert('Job position deleted successfully!', 'danger');
            addRecentActivity(`Job position deleted: ${jobTitle}`);
            
            // Check if table is empty
            const tableBody = document.querySelector('#jobsTable tbody');
            if (tableBody.children.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="3" class="text-center">No job positions found. Add your first job position above.</td>
                    </tr>
                `;
            }
        }
    });
}

// Delete job from localStorage
function deleteJob(jobId) {
    let jobs = JSON.parse(localStorage.getItem('jobs')) || [];
    jobs = jobs.filter(job => job.id !== jobId);
    localStorage.setItem('jobs', JSON.stringify(jobs));
}

// View job details
function viewJob(jobId) {
    const jobs = JSON.parse(localStorage.getItem('jobs')) || [];
    const job = jobs.find(job => job.id === jobId);
    
    if (job) {
        // Update modal content
        document.getElementById('viewJobModalLabel').textContent = job.title;
        
        const modalBody = document.querySelector('#viewJobModal .modal-body');
        
        modalBody.innerHTML = `
            <div class="mb-3">
                <h6>Job Description</h6>
                <p>${job.description}</p>
            </div>
        `;
    }
}

// Edit job
function editJob(jobId) {
    const jobs = JSON.parse(localStorage.getItem('jobs')) || [];
    const job = jobs.find(job => job.id === jobId);
    
    if (job) {
        // Set form values
        document.getElementById('editJobTitle').value = job.title;
        document.getElementById('editJobDescription').value = job.description;
        
        // Store the job ID for saving
        document.getElementById('editJobForm').setAttribute('data-job-id', job.id);
    }
}

// Save edited job
function saveEditedJob() {
    const jobId = document.getElementById('editJobForm').getAttribute('data-job-id');
    let jobs = JSON.parse(localStorage.getItem('jobs')) || [];
    const jobIndex = jobs.findIndex(job => job.id === jobId);
    
    if (jobIndex !== -1) {
        // Get form values
        const jobTitle = document.getElementById('editJobTitle').value;
        const jobDescription = document.getElementById('editJobDescription').value;
        
        // Update job object
        jobs[jobIndex] = {
            ...jobs[jobIndex],
            title: jobTitle,
            description: jobDescription
        };
        
        // Save to localStorage
        localStorage.setItem('jobs', JSON.stringify(jobs));
        
        // Update table
        const row = document.querySelector(`tr[data-job-id="${jobId}"]`);
        row.cells[0].textContent = jobTitle;
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('editJobModal'));
        modal.hide();
        
        // Show success message
        showAlert('Job position updated successfully!', 'success');
        
        // Add to recent activities
        addRecentActivity(`Job position updated: ${jobTitle}`);
    }
}

// Search jobs
function searchJobs(query) {
    query = query.toLowerCase();
    const rows = document.querySelectorAll('#jobsTable tbody tr');
    
    rows.forEach(row => {
        // Skip the "No jobs" row
        if (row.querySelector('td[colspan="3"]')) {
            return;
        }
        
        const text = row.textContent.toLowerCase();
        if (text.includes(query)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Add recent activity to localStorage
function addRecentActivity(activity) {
    // Get existing activities or create new array
    let activities = JSON.parse(localStorage.getItem('recentActivities')) || [];
    
    // Create activity object
    const activityObj = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        activity: activity,
        type: 'job'
    };
    
    // Add to beginning of array
    activities.unshift(activityObj);
    
    // Keep only the most recent 50 activities
    if (activities.length > 50) {
        activities = activities.slice(0, 50);
    }
    
    // Save back to localStorage
    localStorage.setItem('recentActivities', JSON.stringify(activities));
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