document.addEventListener('DOMContentLoaded', function() {
    const chatMessages = document.getElementById('chatMessages');
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');
    const clearButton = document.getElementById('clearButton');
    const jobPositionSelect = document.getElementById('jobPositionSelect');
    
    // API endpoint
    const API_ENDPOINT = 'http://localhost:5000/api/ai-assistant';
    
    // Store conversation history and state
    let conversationHistory = [];
    let pendingShortlistCandidates = []; // Store candidates pending shortlisting
    let awaitingConfirmation = false; // Flag to track if we're waiting for confirmation
    let hasShownShortlistHelp = false; // Flag to track if we've shown the shortlist help message
    let selectedJobPosition = null; // Store selected job position
    
    // Add event listeners
    sendButton.addEventListener('click', handleUserMessage);
    userInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleUserMessage();
        }
    });
    clearButton.addEventListener('click', clearChat);
    
    // Add job position selection listener
    jobPositionSelect.addEventListener('change', function() {
        const selectedValue = this.value;
        const selectedText = this.options[this.selectedIndex].text;
        
        if (selectedValue) {
            selectedJobPosition = {
                id: selectedValue,
                title: selectedText
            };
            
            // Add system message about position change
            addBotMessage(`🔍 I'll now focus on finding candidates for the "${selectedText}" position.`);
            
            // Update conversation context
            conversationHistory.push({
                role: 'system',
                content: `User has selected job position: ${selectedText}`
            });
        } else {
            selectedJobPosition = null;
            addBotMessage("I'll now consider candidates for all positions.");
        }
    });
    
    // Load job positions
    loadJobPositions();
    
    // Initialize with welcome message
    addBotMessage("👋 Hello! I'm your AI Resume Assistant. I can help you find suitable candidates for your positions. Tell me what position you're looking for, or ask about specific candidates.");
    
    // Load job positions from localStorage
    function loadJobPositions() {
        const jobs = JSON.parse(localStorage.getItem('jobs')) || [];
        
        // Clear existing options (except the first one)
        while (jobPositionSelect.options.length > 1) {
            jobPositionSelect.remove(1);
        }
        
        // Add job positions to dropdown
        jobs.forEach(job => {
            const option = document.createElement('option');
            option.value = job.id;
            option.textContent = job.title;
            jobPositionSelect.appendChild(option);
        });
    }
    
    // Handle user message
    function handleUserMessage() {
        const message = userInput.value.trim();
        if (message === '') return;
        
        // Add user message to chat
        addUserMessage(message);
        userInput.value = '';
        
        // Add to conversation history
        conversationHistory.push({
            role: 'user',
            content: message
        });
        
        // Check if we're awaiting confirmation for shortlisting
        if (awaitingConfirmation && pendingShortlistCandidates.length > 0) {
            const lowerMessage = message.toLowerCase();
            if (isConfirmationMessage(lowerMessage)) {
                // User confirmed, shortlist the candidates
                shortlistCandidates(pendingShortlistCandidates);
                return;
            } else if (isDenialMessage(lowerMessage)) {
                // User denied, clear pending shortlist
                addBotMessage("Okay, I won't shortlist those candidates.");
                pendingShortlistCandidates = [];
                awaitingConfirmation = false;
                return;
            }
        }
        
        // Process the message
        processUserMessage(message);
    }
    
    // Check if message is a confirmation
    function isConfirmationMessage(message) {
        const confirmationKeywords = ['yes', 'yeah', 'yep', 'sure', 'ok', 'okay', 'confirm', 'do it', 'proceed', 'go ahead'];
        return confirmationKeywords.some(keyword => message.toLowerCase().includes(keyword));
    }
    
    // Check if message is a denial
    function isDenialMessage(message) {
        const denialKeywords = ['no', 'nope', 'don\'t', 'do not', 'cancel', 'stop', 'nevermind'];
        return denialKeywords.some(keyword => message.toLowerCase().includes(keyword));
    }
    
    // Process user message and generate response
    function processUserMessage(message) {
        // Show typing indicator
        showTypingIndicator();
        
        // Get resume data from localStorage
        const resumeData = getResumesFromLocalStorage();
        
        if (resumeData.length === 0) {
            // If no resumes in localStorage, show a message
            setTimeout(() => {
                removeTypingIndicator();
                addBotMessage("I don't see any resumes in the system. Please upload some resumes first using the 'Upload Resume' page.");
            }, 1000);
            return;
        }
        
        // Check for shortlisting requests
        const shortlistMatch = message.match(/(?:add|shortlist|move)\s+(?:candidate[s]?\s+)?([0-9](?:\s*,\s*[0-9])*)\s+(?:to\s+)?(?:shortlist|shortlisted)/i);
        if (shortlistMatch) {
            handleShortlistRequest(shortlistMatch[1], resumeData);
            return;
        }
        
        // Call AI Assistant API
        callAIAssistantAPI(message, resumeData)
            .then(response => {
                // Remove typing indicator and add AI response
                removeTypingIndicator();
                addBotMessage(response);
            })
            .catch(error => {
                console.error('API call failed, using fallback response:', error);
                
                // Use fallback response
                setTimeout(() => {
                    removeTypingIndicator();
                    generateFallbackResponse(message, resumeData);
                }, 1000);
            });
    }
    
    // Handle shortlist request
    function handleShortlistRequest(candidateNumbersStr, resumeData) {
        const candidateNumbers = candidateNumbersStr.split(/\s*,\s*/).map(Number);
        
        // Sort candidates by score
        const sortedCandidates = [...resumeData].sort((a, b) => b.score - a.score);
        
        // Get the selected candidates
        const selectedCandidates = candidateNumbers
            .filter(num => num > 0 && num <= sortedCandidates.length)
            .map(num => sortedCandidates[num - 1]);
        
        if (selectedCandidates.length === 0) {
            removeTypingIndicator();
            addBotMessage(`I couldn't find candidates with those numbers. Please provide valid candidate numbers.`);
            return;
        }
        
        // Store candidates for shortlisting
        pendingShortlistCandidates = selectedCandidates;
        awaitingConfirmation = true;
        
        // Ask for confirmation
        const candidateNames = selectedCandidates.map(c => c.name).join(', ');
        removeTypingIndicator();
        
        let confirmationMessage = `⚠️ **Confirmation Required**\n\n`;
        confirmationMessage += `Are you sure you want to shortlist the following candidate(s)?\n`;
        confirmationMessage += `- ${candidateNames}\n\n`;
        confirmationMessage += `Please respond with "Yes" to confirm or "No" to cancel.`;
        
        addBotMessage(confirmationMessage);
    }
    
    // Function to add recent activity to localStorage
    function addRecentActivity(activity) {
        // Get existing activities
        let activities = JSON.parse(localStorage.getItem('recentActivities')) || [];
        
        // Add new activity
        const newActivity = {
            date: new Date().toISOString(),
            type: 'AI Assistant',
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
    
    // Shortlist candidates
    function shortlistCandidates(candidates) {
        // Get resumes and analysis results
        const resumes = JSON.parse(localStorage.getItem('resumes')) || [];
        const analysisResults = JSON.parse(localStorage.getItem('analysisResults')) || [];
        
        // Update status for each candidate
        const shortlistedNames = [];
        candidates.forEach(candidate => {
            // Update in resumes
            const resumeIndex = resumes.findIndex(r => r.id === candidate.id);
            if (resumeIndex !== -1) {
                resumes[resumeIndex].status = 'Shortlisted';
                shortlistedNames.push(candidate.name);
                
                // If we've corrected the name, update it in the original data too
                if (candidate.originalName && candidate.name !== candidate.originalName) {
                    resumes[resumeIndex].candidateName = candidate.name;
                }
            }
            
            // Update in analysis results
            const resultIndex = analysisResults.findIndex(r => r.resumeId === candidate.id);
            if (resultIndex !== -1) {
                analysisResults[resultIndex].status = 'Shortlisted';
            }
        });
        
        // Save updated data
        localStorage.setItem('resumes', JSON.stringify(resumes));
        localStorage.setItem('analysisResults', JSON.stringify(analysisResults));
        
        // Reset state
        pendingShortlistCandidates = [];
        awaitingConfirmation = false;
        
        // Confirm to user
        const message = shortlistedNames.length === 1
            ? `✅ Great! I've added ${shortlistedNames[0]} to your shortlist.`
            : `✅ Great! I've added the following candidates to your shortlist: ${shortlistedNames.join(', ')}.`;
        
        addBotMessage(`${message} You can view and manage all shortlisted candidates in the Candidate Management section.`);
        
        // Add to recent activities
        const activityMessage = shortlistedNames.length === 1
            ? `AI Assistant shortlisted candidate: ${shortlistedNames[0]}`
            : `AI Assistant shortlisted ${shortlistedNames.length} candidates: ${shortlistedNames.join(', ')}`;
        
        addRecentActivity(activityMessage);
    }
    
    // Get resumes from localStorage with analysis results
    function getResumesFromLocalStorage() {
        // Get resumes from localStorage
        const resumes = JSON.parse(localStorage.getItem('resumes')) || [];
        const analysisResults = JSON.parse(localStorage.getItem('analysisResults')) || [];
        
        // Get all resumes that have completed OCR processing (not just analyzed ones)
        let enhancedResumes = resumes.filter(resume => resume.ocrProcessed).map(resume => {
            // Check if this resume has been analyzed
            const analysis = analysisResults.find(a => a.resumeId === resume.id);
            
            if (analysis) {
                // This resume has been analyzed, use the analysis data
                // Clean up candidate name if it appears to be a location
                const cleanName = cleanCandidateName(resume.candidateName, resume.fileName);
                
                return {
                    id: resume.id,
                    name: cleanName,
                    originalName: resume.candidateName,
                    email: resume.candidateEmail,
                    phone: resume.candidatePhone,
                    position: analysis.positionTitle,
                    positionText: resume.positionText || analysis.positionTitle,
                    score: analysis.score,
                    status: resume.status,
                    extractedText: resume.extractedText,
                    details: analysis.details,
                    fileName: resume.fileName,
                    analyzed: true
                };
            } else {
                // This resume has not been analyzed yet, create a simulated analysis
                const cleanName = cleanCandidateName(resume.candidateName, resume.fileName);
                
                // Extract skills from resume text using simple keyword matching
                const skills = extractSkillsFromText(resume.extractedText);
                
                return {
                    id: resume.id,
                    name: cleanName,
                    originalName: resume.candidateName,
                    email: resume.candidateEmail,
                    phone: resume.candidatePhone || 'Not provided',
                    position: resume.positionText || 'Not specified',
                    positionText: resume.positionText || 'Not specified',
                    score: estimateMatchScore(resume.extractedText, skills),
                    status: resume.status,
                    extractedText: resume.extractedText,
                    details: {
                        skills: skills,
                        explanation: generateExplanationFromSkills(skills, cleanName),
                        recommendationLevel: 'Auto-generated analysis'
                    },
                    fileName: resume.fileName,
                    analyzed: false
                };
            }
        });
        
        // Filter by selected job position if one is selected
        if (selectedJobPosition) {
            enhancedResumes = enhancedResumes.filter(resume => {
                // Case insensitive position text matching
                const resumePosition = (resume.positionText || '').toLowerCase();
                const selectedPosition = selectedJobPosition.title.toLowerCase();
                
                // Check for exact match or if position contains the selected position
                return resumePosition === selectedPosition || 
                       resumePosition.includes(selectedPosition) ||
                       selectedPosition.includes(resumePosition);
            });
        }
        
        return enhancedResumes;
    }
    
    // Extract skills from resume text
    function extractSkillsFromText(text) {
        if (!text) return [];
        
        const skillKeywords = [
            // Programming languages
            'JavaScript', 'Python', 'Java', 'C#', 'C++', 'Ruby', 'PHP', 'Swift', 'Kotlin', 'Go',
            'TypeScript', 'Rust', 'Scala', 'Perl', 'R', 'Dart', 'Objective-C', 'Shell', 'Bash',
            
            // Web technologies
            'HTML', 'CSS', 'React', 'Angular', 'Vue', 'Node.js', 'Express', 'jQuery', 'Bootstrap',
            'Sass', 'Less', 'Webpack', 'Babel', 'Redux', 'GraphQL', 'REST API', 'JSON', 'XML',
            
            // Databases
            'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Oracle', 'SQLite', 'Redis', 'Firebase',
            'DynamoDB', 'Cassandra', 'MariaDB', 'Elasticsearch', 'NoSQL',
            
            // Cloud platforms
            'AWS', 'Azure', 'Google Cloud', 'Heroku', 'Docker', 'Kubernetes', 'Terraform',
            'Serverless', 'CI/CD', 'Jenkins', 'Git', 'GitHub', 'GitLab', 'Bitbucket',
            
            // Data science
            'Machine Learning', 'Deep Learning', 'Data Analysis', 'Data Visualization',
            'TensorFlow', 'PyTorch', 'Pandas', 'NumPy', 'SciPy', 'Scikit-learn', 'Tableau',
            'Power BI', 'Statistics', 'AI', 'NLP', 'Computer Vision',
            
            // Mobile
            'iOS', 'Android', 'Flutter', 'React Native', 'Xamarin', 'Mobile Development',
            
            // Business skills
            'Project Management', 'Agile', 'Scrum', 'Product Management', 'Business Analysis',
            'Leadership', 'Team Management', 'Communication', 'Problem Solving', 'Critical Thinking',
            
            // Design
            'UI Design', 'UX Design', 'Graphic Design', 'Wireframing', 'Prototyping',
            'Figma', 'Sketch', 'Adobe XD', 'Photoshop', 'Illustrator',
            
            // Finance and accounting
            'Financial Analysis', 'Accounting', 'Bookkeeping', 'Taxation', 'Auditing',
            'Financial Reporting', 'Budgeting', 'Forecasting', 'Excel', 'QuickBooks',
            'SAP', 'Financial Modeling', 'Risk Management',
            
            // Marketing
            'Digital Marketing', 'Content Marketing', 'SEO', 'SEM', 'Social Media Marketing',
            'Email Marketing', 'Analytics', 'CRM', 'Market Research', 'Brand Management'
        ];
        
        const foundSkills = [];
        const lowerText = text.toLowerCase();
        
        skillKeywords.forEach(skill => {
            if (lowerText.includes(skill.toLowerCase())) {
                foundSkills.push(skill);
            }
        });
        
        return foundSkills.slice(0, 15); // Limit to 15 skills
    }
    
    // Estimate match score based on skills
    function estimateMatchScore(text, skills) {
        if (!text || !skills || skills.length === 0) return 50; // Default score
        
        // More skills = higher score, max out at 10 skills
        const skillScore = Math.min(skills.length * 5, 50);
        
        // Longer resume text = slightly higher score (more detailed)
        const lengthScore = Math.min(Math.floor(text.length / 500), 20);
        
        // Random variation to avoid all scores being the same
        const randomVariation = Math.floor(Math.random() * 10);
        
        // Combine scores with cap at 95
        return Math.min(50 + skillScore + lengthScore + randomVariation, 95);
    }
    
    // Generate explanation from skills
    function generateExplanationFromSkills(skills, name) {
        if (!skills || skills.length === 0) {
            return `${name} has a resume in our system, but no specific skills were identified automatically.`;
        }
        
        const topSkills = skills.slice(0, 5).join(', ');
        const remainingCount = Math.max(0, skills.length - 5);
        
        let explanation = `${name} has experience with ${topSkills}`;
        
        if (remainingCount > 0) {
            explanation += ` and ${remainingCount} other relevant skills`;
        }
        
        explanation += `. This is an auto-generated analysis based on resume keywords. For a more detailed analysis, please use the "Analyze Resume" feature.`;
        
        return explanation;
    }
    
    // Clean up candidate name if it appears to be a location or is invalid
    function cleanCandidateName(name, fileName) {
        // List of known locations that might be incorrectly identified as names
        const knownLocations = [
            "kuala lumpur", "singapore", "new york", "london", "tokyo", 
            "beijing", "shanghai", "hong kong", "bangkok", "jakarta", 
            "seoul", "taipei", "delhi", "mumbai", "sydney", "melbourne",
            "paris", "berlin", "madrid", "rome", "amsterdam", "brussels",
            "canada", "australia", "malaysia", "indonesia", "philippines",
            "vietnam", "thailand", "china", "japan", "korea", "india"
        ];
        
        // Check if name is a known location (case insensitive)
        if (!name || name.trim() === '' || knownLocations.some(loc => name.toLowerCase().includes(loc.toLowerCase()))) {
            // Try to extract a name from the file name
            return generateNameFromFileName(fileName);
        }
        
        // Check if name looks like a valid person name (at least 2 characters, not all uppercase or lowercase)
        if (name.length < 2 || name === name.toUpperCase() || name === name.toLowerCase()) {
            return generateNameFromFileName(fileName);
        }
        
        return name;
    }
    
    // Generate a name from file name
    function generateNameFromFileName(fileName) {
        // Remove file extension
        let nameBase = fileName.replace(/\.[^/.]+$/, "");
        
        // Replace underscores and hyphens with spaces
        nameBase = nameBase.replace(/[_-]/g, " ");
        
        // If filename is like "resume_john_doe.pdf", extract the name part
        if (nameBase.toLowerCase().includes("resume")) {
            nameBase = nameBase.replace(/resume[_\s]*/i, "");
        }
        if (nameBase.toLowerCase().includes("cv")) {
            nameBase = nameBase.replace(/cv[_\s]*/i, "");
        }
        
        // Capitalize each word
        nameBase = nameBase.split(" ")
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(" ");
        
        // If still empty or just whitespace, use a generic name
        if (!nameBase.trim()) {
            return "Candidate";
        }
        
        return nameBase.trim();
    }
    
    // Call the AI Assistant API
    async function callAIAssistantAPI(message, resumeData) {
        try {
            // Prepare request body
            const requestBody = {
                message: message,
                conversation_history: conversationHistory,
                resume_data: resumeData
            };
            
            // Add selected job position if available
            if (selectedJobPosition) {
                requestBody.selected_position = selectedJobPosition;
            }
            
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
            
            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success && data.response) {
                return data.response;
            } else {
                throw new Error('Invalid API response format');
            }
        } catch (error) {
            console.error('Error calling AI Assistant API:', error);
            throw error;
        }
    }
    
    // Generate fallback response when API call fails
    function generateFallbackResponse(message, resumeData) {
        // Basic fallback based on message content
        const lowerMessage = message.toLowerCase();
        
        if (resumeData.length === 0) {
            addBotMessage("I don't see any resumes in the system. Please upload some resumes first using the 'Upload Resume' page.");
            return;
        }
        
        // Sort candidates by score
        const sortedCandidates = [...resumeData].sort((a, b) => b.score - a.score);
        
        // Check for position requests
        const positionKeywords = [
            'software engineer', 'developer', 'programmer',
            'project manager', 'product manager',
            'designer', 'ui designer', 'ux designer',
            'data scientist', 'data analyst',
            'marketing specialist', 'marketing manager',
            'sales representative', 'sales manager',
            'customer support', 'customer service',
            'finance intern', 'finance', 'accounting',
            'hr', 'human resources', 'recruiter'
        ];
        
        // Check if message contains a position
        const positionMatch = positionKeywords.find(position => 
            lowerMessage.includes(position.toLowerCase())
        );
        
        if (positionMatch || 
            lowerMessage.includes('position') || 
            lowerMessage.includes('job') ||
            lowerMessage.includes('looking for') ||
            lowerMessage.includes('find') ||
            lowerMessage.includes('recommend') ||
            lowerMessage.includes('suggest')) {
            
            // Respond with candidate recommendations
            let response = `Here are the top candidates I found based on your request:\n\n`;
            
            // Take top 5 candidates
            const topCandidates = sortedCandidates.slice(0, 5);
            
            topCandidates.forEach((candidate, index) => {
                // Include candidate file name in small text if name was corrected
                const nameInfo = (candidate.originalName && candidate.name !== candidate.originalName) 
                    ? `**${candidate.name}** (From: ${candidate.fileName})`
                    : `**${candidate.name}**`;
                
                const analysisTag = !candidate.analyzed ? ' (Auto-analyzed)' : '';
                
                response += `${index + 1}. ${nameInfo} (Match Score: ${candidate.score}%${analysisTag})\n`;
                if (candidate.details && candidate.details.explanation) {
                    response += `   - ${candidate.details.explanation.split('.')[0]}.\n`;
                }
                response += `   - Status: ${candidate.status}\n\n`;
            });
            
            response += `You can ask for more details about any of these candidates or say "Add candidates 1, 2 to shortlist" to shortlist them.`;
            
            // Add shortlist tip for first time
            if (!hasShownShortlistHelp) {
                response += `\n\n💡 **Shortlisting Tip:** To move candidates to the Shortlisted status, just say "Add candidate 1 to shortlist" or "Shortlist candidates 2 and 3". I'll ask for confirmation before making changes.`;
                hasShownShortlistHelp = true;
            }
            
            addBotMessage(response);
            return;
        }
        
        // Check for candidate number mentions
        const candidateNumberMatch = message.match(/\b([1-9](?:\s*,\s*[1-9])*)\b/);
        if (candidateNumberMatch) {
            const candidateNumbers = candidateNumberMatch[1].split(/\s*,\s*/).map(Number);
            
            // Get the selected candidates
            const selectedCandidates = candidateNumbers
                .filter(num => num > 0 && num <= sortedCandidates.length)
                .map(num => sortedCandidates[num - 1]);
            
            if (selectedCandidates.length > 0) {
                let response = selectedCandidates.length === 1 
                    ? `Here are the details for the candidate you requested:\n\n` 
                    : `Here are the details for the candidates you requested:\n\n`;
                
                selectedCandidates.forEach((candidate, index) => {
                    const candidateNumber = sortedCandidates.indexOf(candidate) + 1;
                    
                    // Include candidate file name in small text if name was corrected
                    const nameInfo = (candidate.originalName && candidate.name !== candidate.originalName) 
                        ? `**Candidate ${candidateNumber}: ${candidate.name}** (From: ${candidate.fileName})`
                        : `**Candidate ${candidateNumber}: ${candidate.name}**`;
                    
                    response += `${nameInfo}\n`;
                    response += `- Match Score: ${candidate.score}%\n`;
                    response += `- Status: ${candidate.status}\n`;
                    response += `- Position: ${candidate.position || 'Not specified'}\n`;
                    
                    if (candidate.details) {
                        if (candidate.details.skills) {
                            response += `\n**Skills:**\n${candidate.details.skills.join(', ')}\n\n`;
                        }
                        
                        if (candidate.details.explanation) {
                            response += `**Analysis:**\n${candidate.details.explanation}\n\n`;
                        }
                    }
                    
                    if (index < selectedCandidates.length - 1) {
                        response += `---\n\n`;
                    }
                });
                
                response += `\n📌 **Action:** To shortlist any of these candidates, just say "Add candidate [number] to shortlist".`;
                
                addBotMessage(response);
                return;
            }
        }
        
        // Generic fallback
        addBotMessage("I'm here to help you find suitable candidates. Tell me what position you're looking for, or ask about specific candidates by number or name.");
    }
    
    // Add user message to chat
    function addUserMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.className = 'chat-message user-message';
        messageElement.innerHTML = `
            <div class="message-content">
                ${message}
            </div>
        `;
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Add bot message to chat
    function addBotMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.className = 'chat-message bot-message';
        messageElement.innerHTML = `
            <div class="avatar">
                <i class="bi bi-robot"></i>
            </div>
            <div class="message-content">
                ${formatMessage(message)}
            </div>
        `;
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Add to conversation history
        conversationHistory.push({
            role: 'assistant',
            content: message
        });
    }
    
    // Show typing indicator
    function showTypingIndicator() {
        const indicatorElement = document.createElement('div');
        indicatorElement.className = 'chat-message bot-message typing-indicator';
        indicatorElement.id = 'typingIndicator';
        indicatorElement.innerHTML = `
            <div class="avatar">
                <i class="bi bi-robot"></i>
            </div>
            <div class="message-content">
                <div class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        chatMessages.appendChild(indicatorElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Remove typing indicator
    function removeTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) {
            indicator.remove();
        }
    }
    
    // Format message with markdown-like syntax
    function formatMessage(message) {
        // Convert line breaks to <br>
        let formatted = message.replace(/\n/g, '<br>');
        
        // Bold text (surrounded by **)
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Italic text (surrounded by *)
        formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        return formatted;
    }
    
    // Clear chat
    function clearChat() {
        chatMessages.innerHTML = '';
        conversationHistory = [];
        pendingShortlistCandidates = [];
        awaitingConfirmation = false;
        hasShownShortlistHelp = false;
        addBotMessage("👋 Hello! I'm your AI Resume Assistant. I can help you find suitable candidates for your positions. Tell me what position you're looking for, or ask about specific candidates.");
    }
}); 