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

// Function to generate sequential resume filename
function generateSequentialResumeName(fileExtension) {
    const resumes = JSON.parse(localStorage.getItem('resumes')) || [];
    
    // Find the highest number in existing resume_X filenames
    let maxNumber = 0;
    resumes.forEach(resume => {
        const match = resume.fileName.match(/^resume_(\d+)\./i);
        if (match && match[1]) {
            const num = parseInt(match[1], 10);
            if (num > maxNumber) {
                maxNumber = num;
            }
        }
    });
    
    // Generate the next number in sequence
    const nextNumber = maxNumber + 1;
    return `resume_${nextNumber}${fileExtension}`;
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
    
    // Generate sequential filename
    const fileExtension = resumeFile.name.substring(resumeFile.name.lastIndexOf('.'));
    const sequentialFileName = generateSequentialResumeName(fileExtension);
    
    // Store both original filename and sequential filename
    const resume = {
        id: resumeId,
        candidateName: 'Pending OCR',
        candidateEmail: 'pending@ocr-processing.com',
        positionId: positionId,
        positionText: positionText,
        originalFileName: resumeFile.name, // Store original filename
        fileName: sequentialFileName, // Use sequential filename
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
    showAlert(`Resume uploaded successfully as "${sequentialFileName}"! OCR processing started.`, 'success');
    addRecentActivity(`Resume "${resumeFile.name}" uploaded as "${sequentialFileName}" for processing`);
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
        
        // Generate sequential filename
        const fileExtension = file.name.substring(file.name.lastIndexOf('.'));
        const sequentialFileName = generateSequentialResumeName(fileExtension);
        
        const resume = {
            id: resumeId,
            candidateName: 'Pending OCR',
            candidateEmail: 'pending@ocr-processing.com',
            positionId: positionId,
            positionText: positionText,
            originalFileName: file.name, // Store original filename
            fileName: sequentialFileName, // Use sequential filename
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

        // Get original filename if available
        const nameSource = resumes[resumeIndex].originalFileName || fileName;

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
                candidateName = generateNameFromFileName(nameSource);
                candidateEmail = generateEmailFromName(candidateName);
            }
        } else {
            candidateName = generateNameFromFileName(nameSource);
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
        showAlert(`OCR processing completed for "${resumes[resumeIndex].fileName}". Now performing NER analysis...`, 'info');

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

// Improved fallback NER processing using regex
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

        // Known location patterns to avoid misidentifying as names
        const knownLocations = [
            "kuala lumpur", "singapore", "new york", "london", "tokyo", 
            "beijing", "shanghai", "hong kong", "bangkok", "jakarta", 
            "seoul", "taipei", "delhi", "mumbai", "sydney", "melbourne",
            "paris", "berlin", "madrid", "rome", "amsterdam", "brussels",
            "canada", "australia", "malaysia", "indonesia", "philippines",
            "vietnam", "thailand", "china", "japan", "korea", "india",
            "lorong", "jalan", "street", "avenue", "boulevard", "road", "lane",
            "taman", "kg", "kampung", "ipoh", "penang", "johor", "melaka"
        ];
        
        // Convert to regex pattern for case-insensitive matching
        const locationPattern = new RegExp('\\b(' + knownLocations.join('|') + ')\\b', 'i');

        // Find PERSON entities - improved pattern to better match names
        // Improved regex for capturing proper names with 2-3 words
        const nameRegex = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})(?!\s+(?:road|street|avenue|boulevard|lane|jalan|lorong))/g;
        const possibleNames = [];
        
        // Extract all potential name matches
        let nameMatch;
        while ((nameMatch = nameRegex.exec(text)) !== null) {
            const name = nameMatch[0].trim();
            
            // Skip if it's a known location
            if (!locationPattern.test(name.toLowerCase())) {
                possibleNames.push(name);
            }
        }

        // Use the filename to help identify which name is likely correct
        const fileName = resumes[resumeIndex].fileName;
        const fileNameParts = fileName.replace(/\.[^/.]+$/, "").replace(/[_-]/g, ' ').toLowerCase();
        
        // Try to find a matching name in the text based on the filename
        let bestNameMatch = null;
        
        if (possibleNames.length > 0) {
            // First try to find a name that appears in the filename
            for (const name of possibleNames) {
                const nameLower = name.toLowerCase();
                if (fileNameParts.includes(nameLower) || 
                    nameLower.split(' ').some(part => fileNameParts.includes(part))) {
                    bestNameMatch = name;
                    break;
                }
            }
            
            // If no match found, use the first name in the document
            if (!bestNameMatch) {
                bestNameMatch = possibleNames[0];
            }
            
            addEntity(bestNameMatch, 'PERSON', 'People, including fictional');
        }
        
        // If no names found yet, try another approach for Asian names that might not follow Western capitalization
        if (possibleNames.length === 0) {
            // Look for patterns like "Name: John Doe" or "Full Name: Jane Smith"
            const labeledNameMatch = text.match(/(?:name|full name|candidate)[\s:]+([\w\s]+)/i);
            if (labeledNameMatch && labeledNameMatch[1]) {
                const labeledName = labeledNameMatch[1].trim();
                if (labeledName.length > 3 && !locationPattern.test(labeledName.toLowerCase())) {
                    addEntity(labeledName, 'PERSON', 'People, identified by label');
                }
            }
        }

        // Find EMAIL entities
        const emailRegex = /[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}/g;
        const emails = text.match(emailRegex) || [];
        emails.forEach(email => {
            addEntity(email, 'EMAIL', 'Email address (regex detection)');
        });

        // Find ORG entities
        const orgRegex = /\b([A-Z][a-z]*(?:\s+[A-Z][a-z]*)*(?:\s+(?:Inc|LLC|Ltd|Co|Corp|Corporation|Company|Technologies|Solutions|Systems|Group|International|Enterprises)))\b/g;
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
        
        // Find GPE (cities, countries, states) entities
        const locations = [];
        for (const location of knownLocations) {
            const locationRegex = new RegExp('\\b' + location + '\\b', 'i');
            if (locationRegex.test(text)) {
                // Capitalize location properly
                const properLocation = location.split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                    .join(' ');
                locations.push(properLocation);
            }
        }
        
        // Add unique locations only
        [...new Set(locations)].slice(0, 5).forEach(location => {
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
            } else {
                // If no person entity found, try to extract from filename
                resume.candidateName = extractNameFromFileName(resume.fileName);
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
            
            // Validate that candidate name is not a location
            if (resume.candidateName && resume.locations && resume.locations.length > 0) {
                const lowerName = resume.candidateName.toLowerCase();
                const isLocation = resume.locations.some(loc => 
                    lowerName.includes(loc.toLowerCase()) || 
                    loc.toLowerCase().includes(lowerName)
                );
                
                if (isLocation) {
                    // Name is likely a location, extract from filename instead
                    resume.candidateName = extractNameFromFileName(resume.fileName);
                }
            }
        } else {
            // If no entities found at all, extract name from filename
            resume.candidateName = extractNameFromFileName(resume.fileName);
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

// Improved function to extract name from filename
function extractNameFromFileName(fileName) {
    // Remove file extension
    let nameBase = fileName.replace(/\.[^/.]+$/, "");
    
    // Replace underscores and hyphens with spaces
    nameBase = nameBase.replace(/[_-]/g, " ");
    
    // Remove common prefixes
    const prefixes = [
        'resume', 'cv', 'curriculum vitae', 'application', 
        'document', 'candidate', 'job application'
    ];
    
    for (const prefix of prefixes) {
        // Remove prefix followed by space, underscore, or dash
        const prefixRegex = new RegExp(`^${prefix}[\\s_-]*`, 'i');
        nameBase = nameBase.replace(prefixRegex, '');
        
        // Also remove prefix if it's at the end
        const suffixRegex = new RegExp(`[\\s_-]*${prefix}$`, 'i');
        nameBase = nameBase.replace(suffixRegex, '');
    }
    
    // Capitalize each word
    nameBase = nameBase.split(" ")
        .filter(word => word.trim() !== '') // Remove empty parts
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
    
    // If still empty or just whitespace, use a generic name
    if (!nameBase.trim()) {
        return "Candidate";
    }
    
    return nameBase.trim();
}

// Replace the old function with the improved one
function generateNameFromFileName(fileName) {
    return extractNameFromFileName(fileName);
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
        // Use original filename for candidate name generation if available
        const nameSource = resumes[resumeIndex].originalFileName || fileName;
        const candidateName = generateNameFromFileName(nameSource);
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
        
        // Since OCR is complete, try to extract candidate info
        extractCandidateInfo(resumeId);
    }
}

// Add new function to extract candidate info
function extractCandidateInfo(resumeId) {
    const resumes = JSON.parse(localStorage.getItem('resumes')) || [];
    const resumeIndex = resumes.findIndex(r => r.id === resumeId);
    
    if (resumeIndex !== -1 && resumes[resumeIndex].extractedText) {
        // Ensure the resume is marked as having OCR processed
        resumes[resumeIndex].ocrProcessed = true;
        localStorage.setItem('resumes', JSON.stringify(resumes));
        
        // Process with NER if we have extracted text
        processTextWithNER(resumes[resumeIndex].extractedText, resumeId);
    }
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
    if (resume.status === 'Shortlisted') {
        statusBadgeClass = 'bg-success';
    } else if (resume.status === 'Pending') {
        statusBadgeClass = 'bg-warning';
    } else if (resume.status === 'Spam') {
        statusBadgeClass = 'bg-secondary';
    } else if (resume.status === 'Processing') {
        statusBadgeClass = 'bg-primary';
    } else if (resume.status === 'Approved') { // For backward compatibility
        statusBadgeClass = 'bg-success';
    } else if (resume.status === 'Rejected') { // For backward compatibility
        statusBadgeClass = 'bg-danger';
    } else if (resume.status === 'Under Review') { // For backward compatibility
        statusBadgeClass = 'bg-info';
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
        
        if (resume.status === 'Shortlisted') {
            statusBadgeClass = 'bg-success';
        } else if (resume.status === 'Pending') {
            statusBadgeClass = 'bg-warning';
        } else if (resume.status === 'Spam') {
            statusBadgeClass = 'bg-secondary';
        } else if (resume.status === 'Processing') {
            statusBadgeClass = 'bg-primary';
        } else if (resume.status === 'Approved') { // For backward compatibility
            statusBadgeClass = 'bg-success';
        } else if (resume.status === 'Rejected') { // For backward compatibility
            statusBadgeClass = 'bg-danger';
        } else if (resume.status === 'Under Review') { // For backward compatibility
            statusBadgeClass = 'bg-info';
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
    const resume = resumes.find(r => r.id === resumeId);
    
    if (resume) {
        const modalTitle = document.getElementById('viewResumeModalLabel');
        const resumeDetails = document.getElementById('resumeDetails');
        
        modalTitle.textContent = `Resume: ${resume.candidateName}`;
        
        let statusClass = getStatusBadgeClass(resume.status);
        
        let fileInfo = `<p><strong>File:</strong> ${resume.fileName}`;
        // Add original filename if it exists and is different
        if (resume.originalFileName && resume.originalFileName !== resume.fileName) {
            fileInfo += ` <small class="text-muted">(Original: ${resume.originalFileName})</small>`;
        }
        fileInfo += `</p>`;
        
        let detailsHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h5>Candidate Information</h5>
                    <p><strong>Name:</strong> ${resume.candidateName}</p>
                    <p><strong>Email:</strong> ${resume.candidateEmail || 'Not available'}</p>
                    ${fileInfo}
                    <p><strong>Upload Date:</strong> ${resume.uploadDate}</p>
                    <p><strong>Position Applied:</strong> ${resume.positionText || 'Unspecified'}</p>
                    <p><strong>Status:</strong> <span class="badge ${statusClass}">${resume.status}</span></p>
                </div>
                <div class="col-md-6">
                    <h5>Processing Information</h5>
                    <p><strong>OCR Processed:</strong> ${resume.ocrProcessed ? 'Yes' : 'No'}</p>
                    <p><strong>Analysis Status:</strong> ${resume.analyzed ? 'Completed' : 'Pending'}</p>
                    <p><strong>Notes:</strong> ${resume.additionalNotes || 'None'}</p>
                </div>
            </div>
        `;
        
        // If we have extracted text, show it
        if (resume.extractedText) {
            detailsHTML += `
                <div class="mt-4">
                    <h5>Extracted Content</h5>
                    <div class="card">
                        <div class="card-body bg-light">
                            <pre class="mb-0" style="white-space: pre-wrap;">${resume.extractedText}</pre>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // If we have NER results, show them
        if (resume.nerResults && resume.nerResults.entities && resume.nerResults.entities.length > 0) {
            detailsHTML += `
                <div class="mt-4">
                    <h5>Identified Entities</h5>
                    <div class="entity-tags mb-3">
            `;
            
            // Group entities by type
            const entityGroups = {};
            resume.nerResults.entities.forEach(entity => {
                if (!entityGroups[entity.label]) {
                    entityGroups[entity.label] = [];
                }
                entityGroups[entity.label].push(entity);
            });
            
            // Display entities by group
            Object.keys(entityGroups).forEach(label => {
                const badgeClass = getEntityBadgeColor(label);
                detailsHTML += `<div class="mb-2"><strong>${label}:</strong> `;
                
                // Determine if we need text-dark class based on the badge color
                const textClass = needsDarkText(badgeClass) ? ' text-dark' : '';
                
                entityGroups[label].forEach(entity => {
                    detailsHTML += `<span class="badge bg-${badgeClass}${textClass} me-1" title="${entity.description || ''}">${entity.text}</span>`;
                });
                
                detailsHTML += `</div>`;
            });
            
            detailsHTML += `
                    </div>
                </div>
            `;
        }
        
        resumeDetails.innerHTML = detailsHTML;
        
        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('viewResumeModal'));
        modal.show();
    } else {
        showAlert('Resume not found.', 'danger');
    }
}

// Helper function to determine if a badge needs dark text based on its background color
function needsDarkText(badgeClass) {
    // Colors that need dark text for better contrast
    const needsDark = ['light', 'warning', 'info'];
    return needsDark.includes(badgeClass);
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
        case 'Shortlisted':
            return 'bg-success';
        case 'Pending':
            return 'bg-warning';
        case 'Spam':
            return 'bg-secondary';
        case 'Processing':
            return 'bg-primary';
        // Keep these for backward compatibility
        case 'Approved':
            return 'bg-success';
        case 'Rejected':
            return 'bg-danger';
        case 'Under Review':
            return 'bg-info';
        default:
            return 'bg-warning';
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