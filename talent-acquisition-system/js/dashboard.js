// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize charts
    initScoreDistributionChart();
    initHiringByPositionChart();
});

// Initialize the Score Distribution Chart
function initScoreDistributionChart() {
    const ctx = document.getElementById('scoreDistributionChart').getContext('2d');
    
    // Sample data - in a real application, this would come from your backend
    const data = {
        labels: ['High (80-100%)', 'Medium (50-79%)', 'Low (0-49%)'],
        datasets: [{
            label: 'Resume Count by Score',
            data: [5, 12, 8],
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

// Initialize the Hiring by Position Chart
function initHiringByPositionChart() {
    const ctx = document.getElementById('hiringByPositionChart').getContext('2d');
    
    // Sample data - in a real application, this would come from your backend
    const data = {
        labels: ['Software Engineer', 'Data Scientist', 'UX Designer', 'Product Manager', 'Marketing Specialist'],
        datasets: [{
            label: 'Candidates by Position',
            data: [10, 7, 5, 3, 6],
            backgroundColor: [
                'rgba(13, 110, 253, 0.7)',
                'rgba(102, 16, 242, 0.7)',
                'rgba(13, 202, 240, 0.7)',
                'rgba(25, 135, 84, 0.7)',
                'rgba(255, 193, 7, 0.7)'
            ],
            borderColor: [
                'rgba(13, 110, 253, 1)',
                'rgba(102, 16, 242, 1)',
                'rgba(13, 202, 240, 1)',
                'rgba(25, 135, 84, 1)',
                'rgba(255, 193, 7, 1)'
            ],
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

// Function to update the dashboard stats (would be called after data changes)
function updateDashboardStats(totalResumes, analyzedResumes, openPositions) {
    document.querySelector('.card.bg-primary .card-text').textContent = totalResumes;
    document.querySelector('.card.bg-success .card-text').textContent = analyzedResumes;
    document.querySelector('.card.bg-info .card-text').textContent = openPositions;
}

// Example function to add recent activity (would be called when new activities occur)
function addRecentActivity(date, activity, details) {
    const tableBody = document.querySelector('.table tbody');
    
    // Remove "No recent activity" row if it exists
    const noActivityRow = tableBody.querySelector('tr td[colspan="3"]');
    if (noActivityRow) {
        tableBody.innerHTML = '';
    }
    
    // Create new row
    const newRow = document.createElement('tr');
    newRow.innerHTML = `
        <td>${date}</td>
        <td>${activity}</td>
        <td>${details}</td>
    `;
    
    // Add to top of table
    tableBody.insertBefore(newRow, tableBody.firstChild);
}