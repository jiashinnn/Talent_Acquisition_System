// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Update dashboard stats with real data
    updateDashboardStats();
    
    // Initialize charts with real data
    initScoreDistributionChart();
    initHiringByPositionChart();
    
    // Display recent uploads
    displayRecentUploads();
    
    // Display candidate status summary
    displayCandidateStatusSummary();
});

// Initialize the Score Distribution Chart
function initScoreDistributionChart() {
    const ctx = document.getElementById('scoreDistributionChart').getContext('2d');
    
    // Get real data from localStorage
    const analysisResults = JSON.parse(localStorage.getItem('analysisResults')) || [];
    
    // Count resumes by score range
    let highScoreCount = 0;
    let mediumScoreCount = 0;
    let lowScoreCount = 0;
    
    analysisResults.forEach(result => {
        const score = result.score || 0;
        if (score >= 80) {
            highScoreCount++;
        } else if (score >= 50) {
            mediumScoreCount++;
        } else {
            lowScoreCount++;
        }
    });
    
    const data = {
        labels: ['High (80-100%)', 'Medium (50-79%)', 'Low (0-49%)'],
        datasets: [{
            label: 'Resume Count by Score',
            data: [highScoreCount, mediumScoreCount, lowScoreCount],
            backgroundColor: [
                'rgba(25, 135, 84, 0.7)',  // Green for high
                'rgba(253, 126, 20, 0.7)', // Orange for medium
                'rgba(220, 53, 69, 0.7)'   // Red for low
            ],
            borderColor: [
                'rgba(25, 135, 84, 1)',
                'rgba(253, 126, 20, 1)',
                'rgba(220, 53, 69, 1)'
            ],
            borderWidth: 1
        }]
    };

    new Chart(ctx, {
        type: 'bar',
        data: data,
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Count: ${context.raw}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Resumes'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Score Range'
                    }
                }
            }
        }
    });
}

// Initialize the Hiring by Position Chart with real data
function initHiringByPositionChart() {
    const ctx = document.getElementById('hiringByPositionChart').getContext('2d');
    
    // Get real data from localStorage
    const resumes = JSON.parse(localStorage.getItem('resumes')) || [];
    const jobs = JSON.parse(localStorage.getItem('jobs')) || [];
    
    // Count candidates by position
    const positionCounts = {};
    
    // First, initialize with job positions from jobs collection
    jobs.forEach(job => {
        positionCounts[job.title] = 0;
    });
    
    // Then count resumes by position
    resumes.forEach(resume => {
        const position = resume.positionText || 'Unspecified';
        if (positionCounts[position] === undefined) {
            positionCounts[position] = 1;
        } else {
            positionCounts[position]++;
        }
    });
    
    // Convert to arrays for Chart.js
    const labels = Object.keys(positionCounts);
    const counts = Object.values(positionCounts);
    
    // Generate colors
    const backgroundColors = [];
    const borderColors = [];
    
    const colorPalette = [
        'rgba(13, 110, 253, 0.7)', // blue
        'rgba(102, 16, 242, 0.7)', // purple
        'rgba(13, 202, 240, 0.7)', // cyan
        'rgba(25, 135, 84, 0.7)',  // green
        'rgba(255, 193, 7, 0.7)',  // yellow
        'rgba(220, 53, 69, 0.7)',  // red
        'rgba(108, 117, 125, 0.7)' // gray
    ];
    
    const borderPalette = [
        'rgba(13, 110, 253, 1)',
        'rgba(102, 16, 242, 1)',
        'rgba(13, 202, 240, 1)',
        'rgba(25, 135, 84, 1)',
        'rgba(255, 193, 7, 1)',
        'rgba(220, 53, 69, 1)',
        'rgba(108, 117, 125, 1)'
    ];
    
    labels.forEach((_, index) => {
        const colorIndex = index % colorPalette.length;
        backgroundColors.push(colorPalette[colorIndex]);
        borderColors.push(borderPalette[colorIndex]);
    });
    
    const data = {
        labels: labels,
        datasets: [{
            label: 'Candidates by Position',
            data: counts,
            backgroundColor: backgroundColors,
            borderColor: borderColors,
            borderWidth: 1
        }]
    };

    new Chart(ctx, {
        type: 'pie',
        data: data,
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((acc, data) => acc + data, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Function to update the dashboard stats with real data
function updateDashboardStats() {
    const resumes = JSON.parse(localStorage.getItem('resumes')) || [];
    const analysisResults = JSON.parse(localStorage.getItem('analysisResults')) || [];
    const jobs = JSON.parse(localStorage.getItem('jobs')) || [];
    
    const totalResumes = resumes.length;
    const analyzedResumes = analysisResults.length;
    const openPositions = jobs.length;
    
    document.querySelector('.card.bg-primary .card-text').textContent = totalResumes;
    document.querySelector('.card.bg-success .card-text').textContent = analyzedResumes;
    document.querySelector('.card.bg-info .card-text').textContent = openPositions;
}

// Display recent uploads
function displayRecentUploads() {
    const recentUploadsContainer = document.getElementById('recentUploadsContainer');
    const resumes = JSON.parse(localStorage.getItem('resumes')) || [];
    
    // Sort resumes by upload date (newest first)
    const sortedResumes = [...resumes].sort((a, b) => {
        const dateA = a.uploadDate ? new Date(a.uploadDate) : new Date(0);
        const dateB = b.uploadDate ? new Date(b.uploadDate) : new Date(0);
        return dateB - dateA;
    });
    
    // Take only the 5 most recent
    const recentResumes = sortedResumes.slice(0, 5);
    
    if (recentResumes.length === 0) {
        recentUploadsContainer.innerHTML = '<p class="text-muted">No recent uploads found.</p>';
        return;
    }
    
    let html = '<ul class="list-group">';
    
    recentResumes.forEach(resume => {
        // Format the date
        const uploadDate = resume.uploadDate ? new Date(resume.uploadDate) : new Date();
        const formattedDate = uploadDate.toLocaleDateString() + ' ' + uploadDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Determine badge class based on status
        let badgeClass = 'bg-warning';
        if (resume.status === 'Shortlisted') {
            badgeClass = 'bg-success';
        } else if (resume.status === 'Spam') {
            badgeClass = 'bg-secondary';
        }
        
        html += `
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                    <strong>${resume.candidateName || 'Unnamed'}</strong>
                    <br>
                    <small class="text-muted">${resume.fileName || 'No file'}</small>
                </div>
                <div class="text-end">
                    <span class="badge ${badgeClass}">${resume.status || 'Pending'}</span>
                    <br>
                    <small class="text-muted">${formattedDate}</small>
                </div>
            </li>
        `;
    });
    
    html += '</ul>';
    recentUploadsContainer.innerHTML = html;
}

// Display candidate status summary
function displayCandidateStatusSummary() {
    const shortlistedCount = document.getElementById('shortlistedCount');
    const pendingCount = document.getElementById('pendingCount');
    const spamCount = document.getElementById('spamCount');
    
    const resumes = JSON.parse(localStorage.getItem('resumes')) || [];
    
    // Count resumes by status
    let shortlisted = 0;
    let pending = 0;
    let spam = 0;
    
    resumes.forEach(resume => {
        if (resume.status === 'Shortlisted') {
            shortlisted++;
        } else if (resume.status === 'Pending' || !resume.status) {
            pending++;
        } else if (resume.status === 'Spam') {
            spam++;
        }
    });
    
    // Update the counters
    shortlistedCount.textContent = shortlisted;
    pendingCount.textContent = pending;
    spamCount.textContent = spam;
}