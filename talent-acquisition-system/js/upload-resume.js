document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    loadJobPositions();
    loadResumes();
    checkNerServiceStatus();
});

const OCR_API_KEY = 'K85692213988957';
const OCR_API_URL = 'https://api.ocr.space/parse/image';
const NER_API_URL = 'http://localhost:5000/api/process-text';

function initializeEventListeners() {
    const uploadResumeForm = document.getElementById('uploadResumeForm');
    if (uploadResumeForm) {
        uploadResumeForm.addEventListener('submit', function(e) {
            e.preventDefault();
            uploadResume();
        });
    }
    
    const confirmBulkUpload = document.getElementById('confirmBulkUpload');
    if (confirmBulkUpload) {
        confirmBulkUpload.addEventListener('click', function() {
            bulkUploadResumes();
        });
    }
    
    const resumeSearchButton = document.getElementById('resumeSearchButton');
    const resumeSearchInput = document.getElementById('resumeSearchInput');
    
    if (resumeSearchButton && resumeSearchInput) {
        resumeSearchButton.addEventListener('click', function() {
            searchResumes(resumeSearchInput.value);
        });
        
        resumeSearchInput.addEventListener('keyup', function(e) {
            if (e.key === 'Enter') {
                searchResumes(resumeSearchInput.value);
            }
        });
    }
    
    const downloadResumeBtn = document.getElementById('downloadResume');
    if (downloadResumeBtn) {
        downloadResumeBtn.addEventListener('click', function() {
            alert('In a real application, this would download the resume file.');
        });
    }
}

function loadJobPositions() {
    const jobs = JSON.parse(localStorage.getItem('jobs')) || [];
    const positionDropdown = document.getElementById('positionApplied');
    const bulkPositionDropdown = document.getElementById('bulkPositionApplied');
    
    while (positionDropdown.options.length > 1) {
        positionDropdown.remove(1);
    }
    
    while (bulkPositionDropdown.options.length > 1) {
        bulkPositionDropdown.remove(1);
    }
    
    jobs.forEach(job => {
        const option = new Option(job.title, job.id);
        const bulkOption = new Option(job.title, job.id);
        
        positionDropdown.add(option);
        bulkPositionDropdown.add(bulkOption);
    });
    
    if (jobs.length === 0) {
        const option = new Option('No positions available', '');
        const bulkOption = new Option('No positions available', '');
        
        option.disabled = true;
        bulkOption.disabled = true;
        
        positionDropdown.add(option);
        bulkPositionDropdown.add(bulkOption);
    }
}

function uploadResume() {
    const positionApplied = document.getElementById('positionApplied');
    const positionId = positionApplied.value || '';
    const positionText = positionApplied.value ? positionApplied.options[positionApplied.selectedIndex].text : 'Unspecified';
    const resumeFile = document.getElementById('resumeFile').files[0];
    
    if (!resumeFile) {
        showAlert('Please select a resume file to upload.', 'danger');
        return;
    }
    
    if (resumeFile.size > 5 * 1024 * 1024) {
        showAlert('File size exceeds 5MB limit.', 'danger');
        return;
    }
    
    const resumeId = 'RESUME-' + new Date().getFullYear() + '-' + Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    const resume = {
        id: resumeId,
        candidateName: 'Pending OCR',
        candidateEmail: 'pending@ocr-processing.com',
        positionId: positionId,
        positionText: positionText,
        fileName: resumeFile.name,
        fileSize: resumeFile.size,
        fileType: resumeFile.type,
        uploadDate: new Date().toISOString().split('T')[0],
        additionalNotes: 'Pending OCR processing',
        status: 'Processing',
        analyzed: false,
        ocrProcessed: false
    };
    
    saveResume(resume);
    addResumeToTable(resume);
    document.getElementById('uploadResumeForm').reset();
    showAlert('Resume uploaded successfully! OCR processing started.', 'success');
    addRecentActivity(`Resume "${resumeFile.name}" uploaded for processing`);
    processResumeWithOCR(resumeFile, resumeId);
}

function bulkUploadResumes() {
    const bulkPositionApplied = document.getElementById('bulkPositionApplied');
    const positionId = bulkPositionApplied.value || '';
    const positionText = bulkPositionApplied.value ? bulkPositionApplied.options[bulkPositionApplied.selectedIndex].text : 'Unspecified';
    const resumeFiles = document.getElementById('bulkResumeFiles').files;
    
    if (resumeFiles.length === 0) {
        showAlert('Please select at least one resume file to upload.', 'danger');
        return;
    }
    
    if (resumeFiles.length > 10) {
        showAlert('You can upload a maximum of 10 files at once.', 'danger');
        return;
    }
    
    let uploadedCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < resumeFiles.length; i++) {
        const file = resumeFiles[i];
        
        if (file.size > 5 * 1024 * 1024) {
            errorCount++;
            continue;
        }
        
        const resumeId = 'RESUME-' + new Date().getFullYear() + '-' + Math.floor(Math.random() * 10000).toString().padStart(4, '0') + '-' + i;
        
        const resume = {
            id: resumeId,
            candidateName: 'Pending OCR',
            candidateEmail: 'pending@ocr-processing.com',
            positionId: positionId,
            positionText: positionText,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            uploadDate: new Date().toISOString().split('T')[0],
            additionalNotes: 'Pending OCR processing',
            status: 'Processing',
            analyzed: false,
            ocrProcessed: false
        };
        
        saveResume(resume);
        addResumeToTable(resume);
        uploadedCount++;
        
        setTimeout(() => {
            processResumeWithOCR(file, resumeId);
        }, i * 1500);
    }
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('bulkUploadModal'));
    modal.hide();
    document.getElementById('bulkUploadForm').reset();
    
    if (errorCount > 0) {
        showAlert(`${uploadedCount} resumes uploaded successfully. ${errorCount} files were skipped due to size limit. OCR processing started.`, 'warning');
    } else {
        showAlert(`${uploadedCount} resumes uploaded successfully! OCR processing started.`, 'success');
    }
    
    addRecentActivity(`Bulk upload: ${uploadedCount} resumes uploaded for processing`);
}

function processResumeWithOCR(file, resumeId) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('apikey', OCR_API_KEY);
    formData.append('language', 'eng');
    formData.append('isOverlayRequired', 'false');
    formData.append('filetype', file.type.split('/')[1]);
    formData.append('detectOrientation', 'true');
    formData.append('scale', 'true');
    formData.append('OCREngine', '2');

    updateResumeStatus(resumeId, 'Processing OCR');

    fetch(OCR_API_URL, {
        method: 'POST',
        body: formData,
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('OCR API request failed');
        }
        return response.json();
    })
    .then(data => {
        processOCRResults(data, resumeId, file.name);
    })
    .catch(error => {
        console.error('Error processing OCR:', error);
        simulateOcrProcessing(resumeId);
        showAlert(`OCR API error: ${error.message}. Using simulated data instead.`, 'warning');
    });
}

function processOCRResults(ocrData, resumeId, fileName) {
    const resumes = JSON.parse(localStorage.getItem('resumes')) || [];
    const resumeIndex = resumes.findIndex(r => r.id === resumeId);

    if (resumeIndex !== -1) {
        let extractedText = '';
        let candidateName = '';
        let candidateEmail = '';

        if (ocrData && ocrData.ParsedResults && ocrData.ParsedResults.length > 0) {
            extractedText = ocrData.ParsedResults[0].ParsedText || '';

            extractedText = makeLinksClickable(extractedText);

            const lines = extractedText.split('\n').filter(line => line.trim() !== '');
            if (lines.length > 0) {
                candidateName = lines[0].trim();

                const emailRegex = /[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}/g;
                const emailMatches = extractedText.match(emailRegex);

                if (emailMatches && emailMatches.length > 0) {
                    candidateEmail = emailMatches[0];
                } else {
                    candidateEmail = generateEmailFromName(candidateName);
                }
            } else {
                candidateName = generateNameFromFileName(fileName);
                candidateEmail = generateEmailFromName(candidateName);
            }
        } else {
            candidateName = generateNameFromFileName(fileName);
            candidateEmail = generateEmailFromName(candidateName);
        }

        resumes[resumeIndex].candidateName = candidateName;
        resumes[resumeIndex].candidateEmail = candidateEmail;
        resumes[resumeIndex].additionalNotes = extractedText ? 'OCR processing completed' : 'OCR processing completed with limited results';
        resumes[resumeIndex].status = 'Processing NER';
        resumes[resumeIndex].ocrProcessed = true;
        resumes[resumeIndex].extractedText = extractedText;
        resumes[resumeIndex].ocrText = extractedText; // Also store in ocrText for compatibility

        localStorage.setItem('resumes', JSON.stringify(resumes));
        updateResumeRow(resumes[resumeIndex]);
        showAlert(`OCR processing completed for "${fileName}". Now performing NER analysis...`, 'info');

        if (extractedText) {
            processTextWithNER(extractedText, resumeId);
        } else {
            finalizeResumeProcessing(resumeId, {}, 'No text extracted for NER analysis');
        }
    }
}

function processTextWithNER(text, resumeId) {
    // Update status
    updateResumeStatus(resumeId, 'Processing NER');
    
    // Check if Python backend is available
    fetch(NER_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: text })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('NER API request failed');
        }
        return response.json();
    })
    .then(data => {
        // Process real spaCy NER results
        const nerResults = {
            entities: [],
            entityStats: data.entity_stats || {},
            modelInfo: {
                version: data.spacy_version,
                modelName: data.model_name
            },
            rawResponse: data // Store full response for potential future use
        };
        
        // Process entities from spaCy
        if (data.entities && data.entities.length > 0) {
            data.entities.forEach(entity => {
                nerResults.entities.push({
                    text: entity.text,
                    label: entity.label,
                    description: entity.description
                });
            });
        }
        
        // Add email detection with regex (since spaCy might not catch all emails)
        const emailRegex = /[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}/g;
        const emails = text.match(emailRegex) || [];
        emails.forEach(email => {
            // Check if this email is already in entities
            if (!nerResults.entities.some(e => e.text === email)) {
                nerResults.entities.push({
                    text: email,
                    label: 'EMAIL',
                    description: 'Email address (regex detection)'
                });
            }
        });
        
        // Process results
        finalizeResumeProcessing(resumeId, nerResults);
    })
    .catch(error => {
        console.error('Error processing NER:', error);
        
        // Fall back to regex-based NER if the Python backend fails
        fallbackNERProcessing(text, resumeId);
    });
}

// Fallback NER processing using regex
function fallbackNERProcessing(text, resumeId) {
    setTimeout(() => {
        const resumes = JSON.parse(localStorage.getItem('resumes')) || [];
        const resumeIndex = resumes.findIndex(r => r.id === resumeId);

        if (resumeIndex === -1) return;

        const nerResults = {
            entities: [],
            usedFallback: true,
            entityStats: {}
        };
        
        // Helper function to add entities and track stats
        const addEntity = (text, label, description = '') => {
            nerResults.entities.push({
                text,
                label,
                description
            });
            
            // Track entity type counts
            if (!nerResults.entityStats[label]) {
                nerResults.entityStats[label] = 0;
            }
            nerResults.entityStats[label]++;
        };

        // Find PERSON entities
        const nameRegex = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g;
        const possibleNames = text.match(nameRegex) || [];
        possibleNames.slice(0, 3).forEach(name => {
            addEntity(name, 'PERSON', 'People, including fictional');
        });

        // Find EMAIL entities
        const emailRegex = /[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}/g;
        const emails = text.match(emailRegex) || [];
        emails.forEach(email => {
            addEntity(email, 'EMAIL', 'Email address (regex detection)');
        });

        // Find ORG entities
        const orgRegex = /\b([A-Z]{2,}(?:\s+[A-Z]{2,})*)\b/g;
        const possibleOrgs = text.match(orgRegex) || [];
        possibleOrgs.slice(0, 5).forEach(org => {
            addEntity(org, 'ORG', 'Companies, agencies, institutions, etc.');
        });

        // Find DATE entities
        const dateRegex = /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}\s+(?:to\s+(?:present|current|now)|[-–—]\s+(?:(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}|present|current|now))?/gi;
        const dates = text.match(dateRegex) || [];
        dates.forEach(date => {
            addEntity(date, 'DATE', 'Absolute or relative dates or periods');
        });
        
        // Find GPE (cities, countries, states) entities - simplified list
        const locationRegex = /\b(?:New York|Los Angeles|Chicago|Houston|London|Paris|Tokyo|Beijing|Sydney|Toronto|Mexico City|Berlin|Rome|Moscow|Dubai|Singapore|Hong Kong|San Francisco|Boston|Seattle|Miami|United States|Canada|UK|France|Germany|Japan|China|India|Australia|Brazil|Italy|Spain|Russia)\b/gi;
        const locations = text.match(locationRegex) || [];
        locations.forEach(location => {
            addEntity(location, 'GPE', 'Countries, cities, states');
        });
        
        // Find MONEY entities
        const moneyRegex = /\$\s?\d+(?:[.,]\d+)*(?:\.\d+)?|\d+(?:[.,]\d+)*(?:\.\d+)?\s?(?:USD|dollars|EUR|GBP)/gi;
        const moneyMatches = text.match(moneyRegex) || [];
        moneyMatches.forEach(money => {
            addEntity(money, 'MONEY', 'Monetary values, including unit');
        });

        // Add note that we used fallback
        showAlert('Using fallback NER processing as Python backend is not available', 'warning');
        
        finalizeResumeProcessing(resumeId, nerResults);
    }, 1000);
}

function finalizeResumeProcessing(resumeId, nerResults, message = '') {
    const resumes = JSON.parse(localStorage.getItem('resumes')) || [];
    const resumeIndex = resumes.findIndex(r => r.id === resumeId);

    if (resumeIndex !== -1) {
        const resume = resumes[resumeIndex];

        resume.nerResults = nerResults;
        resume.status = 'Pending';
        resume.nerProcessed = true;

        if (nerResults.entities && nerResults.entities.length > 0) {
            // Extract person names
            const personEntities = nerResults.entities.filter(e => e.label === 'PERSON');
            if (personEntities.length > 0) {
                            // Just use the first person entity found
            const bestPerson = personEntities[0];
                resume.candidateName = bestPerson.text;
            }

            // Extract email
            const emailEntities = nerResults.entities.filter(e => e.label === 'EMAIL');
            if (emailEntities.length > 0) {
                resume.candidateEmail = emailEntities[0].text;
            }
            
            // Extract organizations
            const orgEntities = nerResults.entities.filter(e => e.label === 'ORG');
            if (orgEntities.length > 0) {
                resume.organizations = orgEntities.map(e => e.text);
            }
            
            // Extract locations
            const locEntities = nerResults.entities.filter(e => e.label === 'GPE' || e.label === 'LOC');
            if (locEntities.length > 0) {
                resume.locations = locEntities.map(e => e.text);
            }
            
            // Extract dates
            const dateEntities = nerResults.entities.filter(e => e.label === 'DATE');
            if (dateEntities.length > 0) {
                resume.dates = dateEntities.map(e => e.text);
            }
        }

        localStorage.setItem('resumes', JSON.stringify(resumes));
        updateResumeRow(resume);

        let notification;
        if (nerResults.usedFallback) {
            notification = message || `NER processing completed for "${resume.fileName}" using fallback method. Entities extracted.`;
        } else {
            notification = message || `NER processing completed for "${resume.fileName}" using spaCy ${nerResults.modelInfo?.version || ''}. Entities verified.`;
        }
        
        showAlert(notification, 'info');
        addRecentActivity(`NER processing completed for "${resume.fileName}" - ${resume.candidateName}`);
    }
}

function updateResumeStatus(resumeId, status) {
    const resumes = JSON.parse(localStorage.getItem('resumes')) || [];
    const resumeIndex = resumes.findIndex(r => r.id === resumeId);

    if (resumeIndex !== -1) {
        resumes[resumeIndex].status = status;
        localStorage.setItem('resumes', JSON.stringify(resumes));

        const statusBadge = document.querySelector(`tr[data-resume-id="${resumeId}"] td:nth-child(4) .badge`);
        if (statusBadge) {
            statusBadge.textContent = status;
            statusBadge.className = `badge ${getStatusBadgeClass(status)}`;
        }
    }
}

function simulateOcrProcessing(resumeId) {
    const resumes = JSON.parse(localStorage.getItem('resumes')) || [];
    const resumeIndex = resumes.findIndex(r => r.id === resumeId);
    
    if (resumeIndex !== -1) {
        const fileName = resumes[resumeIndex].fileName;
        const candidateName = generateNameFromFileName(fileName);
        const candidateEmail = generateEmailFromName(candidateName);
        
        resumes[resumeIndex].candidateName = candidateName;
        resumes[resumeIndex].candidateEmail = candidateEmail;
        resumes[resumeIndex].additionalNotes = 'OCR processing completed (simulated)';
        resumes[resumeIndex].status = 'Pending';
        resumes[resumeIndex].ocrProcessed = true;
        
        // Create simulated resume text for testing
        const simulatedText = `${candidateName}\n${candidateEmail}\n\nExperience:\n- Software Developer at Example Corp\n- Web Developer at Tech Solutions\n\nSkills:\n- JavaScript\n- HTML/CSS\n- React\n- Node.js`;
        
        // Set both extractedText and ocrText for compatibility
        resumes[resumeIndex].extractedText = simulatedText;
        resumes[resumeIndex].ocrText = simulatedText;

        localStorage.setItem('resumes', JSON.stringify(resumes));
        updateResumeRow(resumes[resumeIndex]);
        showAlert(`OCR processing completed for "${fileName}". Candidate information extracted.`, 'info');
        addRecentActivity(`OCR processing completed for "${fileName}" - Extracted candidate: ${candidateName}`);
    }
}

function generateNameFromFileName(fileName) {
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
    let name = nameWithoutExt.replace(/[_-]/g, ' ');
    name = name.replace(/\b\w/g, l => l.toUpperCase());
    return name;
}

function generateEmailFromName(name) {
    const emailName = name.toLowerCase().replace(/\s+/g, '.');
    const domains = ['example.com', 'mail.com', 'domain.com', 'email.com'];
    const randomDomain = domains[Math.floor(Math.random() * domains.length)];
    return `${emailName}@${randomDomain}`;
}

function saveResume(resume) {
    let resumes = JSON.parse(localStorage.getItem('resumes')) || [];
    resumes.push(resume);
    localStorage.setItem('resumes', JSON.stringify(resumes));
}

function addResumeToTable(resume) {
    const tableBody = document.querySelector('#resumesTable tbody');
    
    if (tableBody.querySelector('tr td[colspan="5"]')) {
        tableBody.innerHTML = '';
    }
    
    const row = document.createElement('tr');
    row.setAttribute('data-resume-id', resume.id);
    
    let statusBadgeClass = 'bg-warning';
    if (resume.status === 'Approved') {
        statusBadgeClass = 'bg-success';
    } else if (resume.status === 'Rejected') {
        statusBadgeClass = 'bg-danger';
    } else if (resume.status === 'Under Review') {
        statusBadgeClass = 'bg-info';
    } else if (resume.status === 'Spam') {
        statusBadgeClass = 'bg-secondary';
    } else if (resume.status === 'Processing') {
        statusBadgeClass = 'bg-primary';
    }
    
    row.innerHTML = `
        <td>${resume.fileName}</td>
        <td>${resume.positionText}</td>
        <td>${resume.uploadDate}</td>
        <td><span class="badge ${statusBadgeClass}">${resume.status}</span></td>
        <td>
            <button class="btn btn-sm btn-info me-1 view-resume" data-bs-toggle="modal" data-bs-target="#viewResumeModal">
                <i class="bi bi-eye"></i>
            </button>
            <button class="btn btn-sm btn-danger delete-resume">
                <i class="bi bi-trash"></i>
            </button>
        </td>
    `;
    
    tableBody.appendChild(row);
    setupResumeButtons(row);
}

function updateResumeRow(resume) {
    const row = document.querySelector(`tr[data-resume-id="${resume.id}"]`);
    
    if (row) {
        const statusBadge = row.querySelector('td:nth-child(4) .badge');
        let statusBadgeClass = 'bg-warning';
        
        if (resume.status === 'Approved') {
            statusBadgeClass = 'bg-success';
        } else if (resume.status === 'Rejected') {
            statusBadgeClass = 'bg-danger';
        } else if (resume.status === 'Under Review') {
            statusBadgeClass = 'bg-info';
        } else if (resume.status === 'Spam') {
            statusBadgeClass = 'bg-secondary';
        } else if (resume.status === 'Processing') {
            statusBadgeClass = 'bg-primary';
        }
        
        statusBadge.className = `badge ${statusBadgeClass}`;
        statusBadge.textContent = resume.status;
    }
}

function loadResumes() {
    const resumes = JSON.parse(localStorage.getItem('resumes')) || [];
    const tableBody = document.querySelector('#resumesTable tbody');
    
    tableBody.innerHTML = '';
    
    resumes.forEach(resume => {
        addResumeToTable(resume);
    });
    
    if (resumes.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">No resumes uploaded yet.</td>
            </tr>
        `;
    }
}

function setupResumeButtons(row) {
    row.querySelector('.view-resume').addEventListener('click', function() {
        const resumeId = row.getAttribute('data-resume-id');
        viewResume(resumeId);
    });
    
    row.querySelector('.delete-resume').addEventListener('click', function() {
        const resumeId = row.getAttribute('data-resume-id');
        
        if (confirm('Are you sure you want to delete this resume?')) {
            deleteResume(resumeId);
            row.remove();
            
            const tableBody = document.querySelector('#resumesTable tbody');
            if (tableBody.children.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center">No resumes uploaded yet.</td>
                    </tr>
                `;
            }
            
            showAlert('Resume deleted successfully!', 'danger');
        }
    });
}

function viewResume(resumeId) {
    const resumes = JSON.parse(localStorage.getItem('resumes')) || [];
    const resume = resumes.find(resume => resume.id === resumeId);
    
    if (resume) {
        document.getElementById('viewResumeModalLabel').textContent = resume.ocrProcessed ? 
            `Resume: ${resume.candidateName}` : 
            `Resume: ${resume.fileName}`;
        
        const resumeDetails = document.getElementById('resumeDetails');
        
        if (resume.ocrProcessed) {
            resumeDetails.innerHTML = `
                <div class="row mb-3">
                    <div class="col-md-6">
                        <p><strong>Candidate Name:</strong> ${resume.candidateName}</p>
                        <p><strong>Email:</strong> ${resume.candidateEmail}</p>
                        <p><strong>Position Applied:</strong> ${resume.positionText}</p>
                    </div>
                    <div class="col-md-6">
                        <p><strong>Upload Date:</strong> ${resume.uploadDate}</p>
                        <p><strong>Status:</strong> <span class="badge ${getStatusBadgeClass(resume.status)}">${resume.status}</span></p>
                    </div>
                </div>
                <div class="mb-3">
                    <h6>File Information</h6>
                    <p><strong>File Name:</strong> ${resume.fileName}</p>
                    <p><strong>File Type:</strong> ${resume.fileType}</p>
                    <p><strong>File Size:</strong> ${formatFileSize(resume.fileSize)}</p>
                </div>
            `;
            
            if (resume.extractedText) {
                resumeDetails.innerHTML += `
                    <div class="mb-3">
                        <h6>Extracted Text</h6>
                        <div class="border p-3 bg-light" style="max-height: 200px; overflow-y: auto;">
                            <div class="extracted-text" style="white-space: pre-wrap;">${resume.extractedText}</div>
                        </div>
                    </div>
                `;
            }
            
            // Add NER entities if available
            if (resume.nerResults && resume.nerResults.entities && resume.nerResults.entities.length > 0) {
                // Add entity summary by category
                let entitySummaryHtml = '';
                
                // Add organizations if available
                if (resume.organizations && resume.organizations.length > 0) {
                    entitySummaryHtml += `
                        <div class="mb-2">
                            <strong>Organizations:</strong> ${resume.organizations.join(', ')}
                        </div>
                    `;
                }
                
                // Add locations if available
                if (resume.locations && resume.locations.length > 0) {
                    entitySummaryHtml += `
                        <div class="mb-2">
                            <strong>Locations:</strong> ${resume.locations.join(', ')}
                        </div>
                    `;
                }
                
                // Add dates if available
                if (resume.dates && resume.dates.length > 0) {
                    entitySummaryHtml += `
                        <div class="mb-2">
                            <strong>Dates:</strong> ${resume.dates.join(', ')}
                        </div>
                    `;
                }
                
                // Add entity statistics if available
                let entityStatsHtml = '';
                if (resume.nerResults.entityStats && Object.keys(resume.nerResults.entityStats).length > 0) {
                    entityStatsHtml += '<div class="mb-2"><strong>Entity Types Found:</strong> ';
                    entityStatsHtml += Object.entries(resume.nerResults.entityStats)
                        .map(([type, count]) => `${type} (${count})`)
                        .join(', ');
                    entityStatsHtml += '</div>';
                }
                
                // Add the processed method info
                let processMethod = '';
                if (resume.nerResults.usedFallback) {
                    processMethod = '<span class="badge bg-warning">Regex Fallback</span>';
                } else if (resume.nerResults.modelInfo) {
                    processMethod = `<span class="badge bg-success">spaCy ${resume.nerResults.modelInfo.version || ''}</span>`;
                    if (resume.nerResults.modelInfo.modelName) {
                        processMethod += ` <small class="text-muted">(${resume.nerResults.modelInfo.modelName})</small>`;
                    }
                } else {
                    processMethod = '<span class="badge bg-success">spaCy NLP</span>';
                }
                
                resumeDetails.innerHTML += `
                    <div class="mb-3">
                        <h6>Named Entity Recognition ${processMethod}</h6>
                        ${entitySummaryHtml || entityStatsHtml ? `<div class="card mb-3"><div class="card-body">${entitySummaryHtml}${entityStatsHtml}</div></div>` : ''}
                        <div class="table-responsive">
                            <table class="table table-sm">
                                <thead>
                                    <tr>
                                        <th>Entity</th>
                                        <th>Type</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${resume.nerResults.entities.map(entity => `
                                        <tr>
                                            <td>${entity.text}</td>
                                            <td><span class="badge bg-${getEntityBadgeColor(entity.label)}">${entity.label}</span> ${entity.description ? `<small class="text-muted">${entity.description}</small>` : ''}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            }

            resumeDetails.innerHTML += `
                <div class="mb-3">
                    <h6>Analysis Status</h6>
                    <p>${resume.analyzed ? 'This resume has been analyzed.' : 'This resume has not been analyzed yet.'}</p>
                </div>
            `;
        } else {
            resumeDetails.innerHTML = `
                <div class="text-center text-muted mb-4">
                    <div class="spinner-border text-primary mb-3" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p><i class="bi bi-info-circle me-1"></i> OCR processing in progress. Candidate details will be available soon.</p>
                </div>
                <div class="mb-3">
                    <h6>File Information</h6>
                    <p><strong>File Name:</strong> ${resume.fileName}</p>
                    <p><strong>File Type:</strong> ${resume.fileType}</p>
                    <p><strong>File Size:</strong> ${formatFileSize(resume.fileSize)}</p>
                    <p><strong>Upload Date:</strong> ${resume.uploadDate}</p>
                    <p><strong>Position Applied:</strong> ${resume.positionText}</p>
                </div>
            `;
        }
    }
}

function deleteResume(resumeId) {
    let resumes = JSON.parse(localStorage.getItem('resumes')) || [];
    resumes = resumes.filter(resume => resume.id !== resumeId);
    localStorage.setItem('resumes', JSON.stringify(resumes));
}

function searchResumes(query) {
    query = query.toLowerCase();
    const rows = document.querySelectorAll('#resumesTable tbody tr');
    
    rows.forEach(row => {
        if (row.querySelector('td[colspan="5"]')) {
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

function getStatusBadgeClass(status) {
    switch (status) {
        case 'Approved':
            return 'bg-success';
        case 'Rejected':
            return 'bg-danger';
        case 'Under Review':
            return 'bg-info';
        case 'Spam':
            return 'bg-secondary';
        case 'Processing':
            return 'bg-primary';
        default:
            return 'bg-warning';
    }
}

// Get color for entity badge
function getEntityBadgeColor(entityType) {
    switch (entityType) {
        case 'PERSON':
            return 'primary';
        case 'EMAIL':
            return 'info';
        case 'ORG':
            return 'secondary';
        case 'GPE':
        case 'LOC':
            return 'success';
        case 'DATE':
        case 'TIME':
            return 'warning';
        case 'MONEY':
            return 'danger';
        case 'PRODUCT':
            return 'info';
        case 'EVENT':
            return 'dark';
        case 'WORK_OF_ART':
            return 'info';
        case 'LANGUAGE':
            return 'primary';
        case 'LAW':
            return 'secondary';
        case 'NORP': // Nationalities, religious or political groups
            return 'danger';
        case 'QUANTITY':
        case 'CARDINAL':
        case 'ORDINAL':
        case 'PERCENT':
            return 'dark';
        default:
            return 'light';
    }
}

function formatFileSize(bytes) {
    if (bytes < 1024) {
        return bytes + ' bytes';
    } else if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(2) + ' KB';
    } else {
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }
}

function showAlert(message, type, duration = 3000) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.setAttribute('role', 'alert');
    
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    const heading = document.querySelector('.border-bottom');
    if (heading) {
    heading.parentNode.insertBefore(alertDiv, heading.nextSibling);
    } else {
        // If heading not found, insert at the beginning of the main element
        const main = document.querySelector('main');
        if (main) {
            main.insertBefore(alertDiv, main.firstChild);
        } else {
            // Last resort - append to body
            document.body.appendChild(alertDiv);
        }
    }

    setTimeout(() => {
        alertDiv.classList.remove('show');
        setTimeout(() => {
            alertDiv.remove();
        }, 150);
    }, duration);
}

function addRecentActivity(activity) {
    let activities = JSON.parse(localStorage.getItem('recentActivities')) || [];
    
    const activityObj = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        activity: activity,
        type: 'resume'
    };
    
    activities.unshift(activityObj);
    
    if (activities.length > 50) {
        activities = activities.slice(0, 50);
    }
    
    localStorage.setItem('recentActivities', JSON.stringify(activities));
}

// Check if the NER service is available
function checkNerServiceStatus() {
    fetch(NER_API_URL.replace('/api/process-text', '/'))
        .then(response => {
            if (!response.ok) {
                throw new Error('NER service not available');
            }
            return response.json();
        })
        .then(data => {
            if (data.status === 'running') {
                console.log('NER service is available:', data);
                showAlert('NER service is available using spaCy ' + (data.spacy_version || ''), 'success', 3000);
            } else {
                console.warn('NER service reported non-running status:', data);
                showAlert('NER service is not running properly. Will use fallback processing.', 'warning');
            }
        })
        .catch(error => {
            console.error('NER service check failed:', error);
            showAlert('NER service is not available. Will use fallback processing.', 'warning');
        });
}

// Function to detect and make URLs clickable
function makeLinksClickable(text) {
    if (!text) return text;
    
    // URL regex pattern - matches http/https/www URLs
    const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+\.[^\s]+)/g;
    
    // Replace URLs with HTML anchor tags
    return text.replace(urlRegex, function(url) {
        // Add http:// prefix if it starts with www.
        const href = url.startsWith('www.') ? 'http://' + url : url;
        // Create the clickable link with target="_blank" to open in a new tab
        return `<a href="${href}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    });
}