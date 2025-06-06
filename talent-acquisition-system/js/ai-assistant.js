document.addEventListener('DOMContentLoaded', function() {
    const chatMessages = document.getElementById('chatMessages');
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');
    const clearButton = document.getElementById('clearButton');
    const jobPositionSelect = document.getElementById('jobPositionSelect');
    
    // API endpoint
    const API_ENDPOINT = 'http://localhost:5000/api/ai-assistant';
    
    // Store conversation history
    let conversationHistory = [];
    
    // Store selected job position
    let selectedJobPosition = null;
    
    // Initialize
    loadJobPositions();
    addWelcomeMessage();
    
    // Add event listeners
    sendButton.addEventListener('click', handleUserMessage);
    userInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleUserMessage();
        }
    });
    
    clearButton.addEventListener('click', function() {
        clearChat();
    });
    
    jobPositionSelect.addEventListener('change', function() {
        const selectedValue = this.value;
        const selectedText = this.options[this.selectedIndex].text;
        
        if (selectedValue) {
            selectedJobPosition = {
                id: selectedValue,
                title: selectedText
            };
            
            // Add system message about position change
            addMessageToChat('system', `Focus changed to position: ${selectedText}. The AI will prioritize candidates for this role.`);
            
            // Update conversation context
            conversationContext.position = selectedText;
            
            // Re-analyze resumes with the new position
            const resumes = getResumesFromLocalStorage();
            if (resumes.length > 0) {
                analyzeResumes(resumes);
            }
        } else {
            selectedJobPosition = null;
            addMessageToChat('system', 'Position filter cleared. The AI will consider all candidates for all positions.');
        }
    });
    
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
    
    // Add welcome message
    function addWelcomeMessage() {
        const welcomeMessage = "Welcome to the AI Resume Assistant powered by Gemini. I can help you find the best candidates for your open positions by analyzing all available resumes. You can select a specific job position from the dropdown above to focus on candidates for that role, or you can ask me about any position.";
        addMessageToChat('system', welcomeMessage);
    }
    
    // Clear chat
    function clearChat() {
        chatMessages.innerHTML = '';
        conversationHistory = [];
        addWelcomeMessage();
    }
    
    // Get real resumes from localStorage
    function getResumesFromLocalStorage() {
        // Get resumes from localStorage
        const resumes = JSON.parse(localStorage.getItem('resumes')) || [];
        
        // Get analysis results if available
        const analysisResults = JSON.parse(localStorage.getItem('analysisResults')) || [];
        
        // Enhance resumes with analysis results if available
        const enhancedResumes = resumes.map(resume => {
            const analysis = analysisResults.find(a => a.resumeId === resume.id);
            if (analysis) {
                return {
                    ...resume,
                    matchScore: analysis.score,
                    status: analysis.status,
                    details: analysis.details
                };
            }
            return resume;
        });
        
        // If a job position is selected, filter resumes by position
        if (selectedJobPosition) {
            return enhancedResumes.filter(resume => {
                // Match by position title (case insensitive)
                if (resume.positionText && resume.positionText.toLowerCase() === selectedJobPosition.title.toLowerCase()) {
                    return true;
                }
                
                // Match by position ID if available
                if (resume.positionId && resume.positionId === selectedJobPosition.id) {
                    return true;
                }
                
                return false;
            });
        }
        
        return enhancedResumes;
    }
    
    // Mock data for fallback if no resumes in localStorage
    const mockResumes = [
        {
            id: 1,
            name: "John Smith",
            position: "Frontend Developer",
            skills: ["JavaScript", "React", "HTML", "CSS", "TypeScript"],
            experience: "5 years",
            education: "Bachelor's in Computer Science",
            strengths: ["UI/UX expertise", "Performance optimization", "Team collaboration"],
            weaknesses: ["Backend development", "DevOps"]
        },
        {
            id: 2,
            name: "Jane Doe",
            position: "Full Stack Developer",
            skills: ["JavaScript", "React", "Node.js", "MongoDB", "Express"],
            experience: "3 years",
            education: "Master's in Software Engineering",
            strengths: ["Full stack capabilities", "Quick learner", "Problem solving"],
            weaknesses: ["Limited enterprise experience", "UI design"]
        },
        {
            id: 3,
            name: "Michael Johnson",
            position: "Senior Frontend Developer",
            skills: ["JavaScript", "Angular", "Vue", "React", "TypeScript", "Webpack"],
            experience: "7 years",
            education: "Bachelor's in Information Technology",
            strengths: ["Framework versatility", "Technical leadership", "Code optimization"],
            weaknesses: ["Documentation", "Work-life balance"]
        },
        {
            id: 4,
            name: "Emily Chen",
            position: "UI/UX Developer",
            skills: ["JavaScript", "React", "Figma", "Adobe XD", "CSS", "SASS"],
            experience: "4 years",
            education: "Bachelor's in Design & Computer Science",
            strengths: ["Design thinking", "User research", "Prototyping"],
            weaknesses: ["Backend integration", "Testing"]
        },
        {
            id: 5,
            name: "David Wilson",
            position: "Backend Developer",
            skills: ["Node.js", "Express", "MongoDB", "PostgreSQL", "Docker"],
            experience: "6 years",
            education: "Master's in Computer Engineering",
            strengths: ["API design", "Database optimization", "Microservices"],
            weaknesses: ["Frontend development", "UI design"]
        }
    ];
    
    // Handle user message
    function handleUserMessage() {
        const message = userInput.value.trim();
        
        if (!message) {
            return;
        }
        
        // Add user message to chat
        addMessageToChat('user', message);
        
        // Clear input
        userInput.value = '';
        
        // Store message in conversation history
        conversationHistory.push({
            role: 'user',
            content: message
        });
        
        // Add typing indicator
        addTypingIndicator();
        
        // Get real resumes from localStorage
        const resumeData = getResumesFromLocalStorage();
        
        // If no resumes in localStorage, show a message
        if (resumeData.length === 0) {
            removeTypingIndicator();
            addMessageToChat('ai', "I don't see any resumes in the system. Please upload some resumes first using the 'Upload Resume' page.");
            return;
        }
        
        // If position is selected but no matching resumes, show a message
        if (selectedJobPosition && resumeData.length === 0) {
            removeTypingIndicator();
            addMessageToChat('ai', `I don't see any resumes for the "${selectedJobPosition.title}" position. Please upload resumes for this position or select a different position.`);
            return;
        }
        
        // Include selected job position in the API call if available
        let apiData = {
            message: message,
            conversation_history: conversationHistory,
            resume_data: resumeData
        };
        
        if (selectedJobPosition) {
            apiData.selected_position = selectedJobPosition;
        }
        
        // Call AI Assistant API
        callAIAssistantAPI(apiData)
            .then(response => {
                // Remove typing indicator and add AI response
                removeTypingIndicator();
                addMessageToChat('ai', response);
                
                // Store response in conversation history
                conversationHistory.push({
                    role: 'assistant',
                    content: response
                });
                
                // Scroll to bottom of chat
                chatMessages.scrollTop = chatMessages.scrollHeight;
            })
            .catch(error => {
                console.error('API call failed, using mock implementation:', error);
                
                // Process with mock implementation as fallback
                setTimeout(() => {
                    const aiResponse = processUserMessageMock(message, resumeData.length > 0 ? resumeData : mockResumes);
                    
                    // Remove typing indicator and add AI response
                    removeTypingIndicator();
                    addMessageToChat('ai', aiResponse);
                    
                    // Store response in conversation history
                    conversationHistory.push({
                        role: 'assistant',
                        content: aiResponse
                    });
                    
                    // Scroll to bottom of chat
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }, 1000);
            });
    }
    
    // Call the AI Assistant API
    async function callAIAssistantAPI(apiData) {
        try {
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(apiData)
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
    
    // Mock implementation for processing user messages (fallback if API fails)
    function processUserMessageMock(message, resumes) {
        // Update conversation context based on user message
        updateConversationContext(message, resumes);
        
        // Generate AI response based on the updated context
        return generateAIResponse();
    }
    
    // Store conversation context for mock implementation
    let conversationContext = {
        position: null,
        requirements: null,
        analyzedCandidates: [],
        recommendedCandidates: [],
        eliminatedCandidates: [],
        currentQuery: null
    };
    
    // Update conversation context based on user message (for mock implementation)
    function updateConversationContext(message, resumes) {
        conversationContext.currentQuery = message.toLowerCase();
        
        // Check if user is defining a position
        if (message.toLowerCase().includes('position') || 
            message.toLowerCase().includes('looking for') || 
            message.toLowerCase().includes('need') || 
            message.toLowerCase().includes('hiring')) {
            
            // Extract position and requirements
            if (message.toLowerCase().includes('developer') || 
                message.toLowerCase().includes('engineer') ||
                message.toLowerCase().includes('designer')) {
                
                conversationContext.position = extractPosition(message);
                conversationContext.requirements = extractRequirements(message);
                
                // Analyze candidates based on position and requirements
                analyzeResumes(resumes);
            }
        }
    }
    
    // Analyze resumes based on position and requirements (for mock implementation)
    function analyzeResumes(resumes) {
        conversationContext.analyzedCandidates = [];
        conversationContext.recommendedCandidates = [];
        conversationContext.eliminatedCandidates = [];
        
        // For each resume, calculate match score
        resumes.forEach(resume => {
            const candidate = { ...resume };
            
            // If resume already has a matchScore from analysis, use it
            if (candidate.matchScore) {
                // Use existing analysis data
                conversationContext.analyzedCandidates.push(candidate);
                
                if (candidate.matchScore >= 70) {
                    conversationContext.recommendedCandidates.push(candidate);
                } else {
                    conversationContext.eliminatedCandidates.push(candidate);
                }
                return;
            }
            
            // Otherwise, calculate match score
            let matchScore = 0;
            let matchReasons = [];
            let missingRequirements = [];
            
            // Extract skills from resume
            const skills = [];
            if (resume.extractedText) {
                const skillKeywords = ["JavaScript", "React", "Angular", "Vue", "Node.js", 
                                       "Python", "Java", "C#", "TypeScript", "HTML", "CSS",
                                       "SQL", "MongoDB", "Express", "Docker", "AWS", "Azure"];
                
                skillKeywords.forEach(skill => {
                    if (resume.extractedText.toLowerCase().includes(skill.toLowerCase())) {
                        skills.push(skill);
                    }
                });
            }
            
            // Position match - check if position is mentioned in resume
            if (resume.extractedText && resume.extractedText.toLowerCase().includes(conversationContext.position.toLowerCase())) {
                matchScore += 30;
                matchReasons.push(`Position matches the requirement (${conversationContext.position})`);
            } else {
                missingRequirements.push(`Position mismatch (vs ${conversationContext.position})`);
            }
            
            // Skills match
            if (conversationContext.requirements && conversationContext.requirements.length > 0) {
                const matchedSkills = [];
                const missingSkills = [];
                
                conversationContext.requirements.forEach(req => {
                    if (req.includes('years of experience')) {
                        // We can't reliably extract years of experience from resume text
                        // So we'll just assume it's a neutral factor
                    } else {
                        const hasSkill = skills.some(skill => 
                            skill.toLowerCase().includes(req.toLowerCase())
                        );
                        
                        if (hasSkill) {
                            matchedSkills.push(req);
                        } else {
                            missingSkills.push(req);
                        }
                    }
                });
                
                // Add score for matched skills
                if (matchedSkills.length > 0) {
                    const skillScore = 50 * (matchedSkills.length / conversationContext.requirements.length);
                    matchScore += skillScore;
                    matchReasons.push(`Matched ${matchedSkills.length} out of ${conversationContext.requirements.length} required skills`);
                }
                
                // Add missing skills to requirements
                if (missingSkills.length > 0) {
                    missingRequirements.push(`Missing skills: ${missingSkills.join(', ')}`);
                }
            }
            
            // Store analysis results
            candidate.matchScore = Math.min(Math.round(matchScore), 100);
            candidate.matchReasons = matchReasons;
            candidate.missingRequirements = missingRequirements;
            candidate.skills = skills;
            
            conversationContext.analyzedCandidates.push(candidate);
            
            // Categorize as recommended or eliminated
            if (candidate.matchScore >= 70) {
                conversationContext.recommendedCandidates.push(candidate);
            } else {
                conversationContext.eliminatedCandidates.push(candidate);
            }
        });
        
        // Sort candidates by match score
        conversationContext.recommendedCandidates.sort((a, b) => b.matchScore - a.matchScore);
        conversationContext.eliminatedCandidates.sort((a, b) => b.matchScore - a.matchScore);
    }
    
    // Generate AI response based on conversation context (for mock implementation)
    function generateAIResponse() {
        const query = conversationContext.currentQuery;
        
        // Initial position and requirements query
        if (conversationContext.position && 
            (query.includes('position') || query.includes('looking for') || 
             query.includes('need') || query.includes('hiring'))) {
            
            if (conversationContext.recommendedCandidates.length > 0) {
                let response = `Based on your requirements for a ${conversationContext.position} position `;
                
                if (conversationContext.requirements.length > 0) {
                    response += `with skills in ${conversationContext.requirements.join(', ')}, `;
                }
                
                response += `I've analyzed ${conversationContext.analyzedCandidates.length} candidates and found ${conversationContext.recommendedCandidates.length} suitable matches.\n\n`;
                
                // Add top 3 candidates
                const topCandidates = conversationContext.recommendedCandidates.slice(0, 3);
                topCandidates.forEach((candidate, index) => {
                    response += `${index + 1}. ${candidate.name} (${candidate.matchScore}% match): ${candidate.experience} of experience as ${candidate.position}. `;
                    response += `Key strengths: ${candidate.strengths.join(', ')}.\n`;
                    
                    // Add top 2 reasons for recommendation
                    if (candidate.matchReasons.length > 0) {
                        response += `   Reasons for recommendation: ${candidate.matchReasons.slice(0, 2).join('; ')}.\n\n`;
                    }
                });
                
                response += `Would you like more details about any of these candidates? Or would you like to see other candidates as well?`;
                return response;
            } else {
                return `I couldn't find any candidates matching your requirements for a ${conversationContext.position} position. Would you like to adjust your requirements or see all available candidates?`;
            }
        }
        
        // Query about specific candidate
        for (const candidate of conversationContext.analyzedCandidates) {
            if (query.includes(candidate.name.toLowerCase())) {
                let response = `${candidate.name} (${candidate.matchScore}% match):\n\n`;
                response += `• Position: ${candidate.position}\n`;
                response += `• Experience: ${candidate.experience}\n`;
                response += `• Education: ${candidate.education}\n`;
                response += `• Skills: ${candidate.skills.join(', ')}\n\n`;
                
                response += `Strengths: ${candidate.strengths.join(', ')}\n`;
                response += `Areas for improvement: ${candidate.weaknesses.join(', ')}\n\n`;
                
                if (candidate.matchScore >= 70) {
                    response += `Recommendation: This candidate is a good match because:\n`;
                    candidate.matchReasons.forEach(reason => {
                        response += `• ${reason}\n`;
                    });
                } else {
                    response += `This candidate was not recommended because:\n`;
                    candidate.missingRequirements.forEach(reason => {
                        response += `• ${reason}\n`;
                    });
                }
                
                return response;
            }
        }
        
        // Query about eliminated candidates
        if (query.includes('eliminated') || query.includes('not recommended') || query.includes('rejected')) {
            if (conversationContext.eliminatedCandidates.length > 0) {
                let response = `The following candidates were not recommended for the ${conversationContext.position} position:\n\n`;
                
                conversationContext.eliminatedCandidates.forEach((candidate, index) => {
                    response += `${index + 1}. ${candidate.name} (${candidate.matchScore}% match): ${candidate.position}\n`;
                    response += `   Primary reasons: ${candidate.missingRequirements.slice(0, 2).join('; ')}\n\n`;
                });
                
                response += `Would you like more details about any of these candidates?`;
                return response;
            } else {
                return `All candidates were recommended for the position. Would you like to see the full list again?`;
            }
        }
        
        // Compare candidates
        if (query.includes('compare')) {
            if (conversationContext.recommendedCandidates.length >= 2) {
                const candidates = conversationContext.recommendedCandidates.slice(0, 3);
                let response = `Here's a comparison of the top ${candidates.length} candidates:\n\n`;
                
                candidates.forEach(candidate => {
                    response += `${candidate.name} (${candidate.matchScore}% match):\n`;
                    response += `• Position: ${candidate.position}\n`;
                    response += `• Experience: ${candidate.experience}\n`;
                    response += `• Key skills: ${candidate.skills.slice(0, 5).join(', ')}\n`;
                    response += `• Strengths: ${candidate.strengths.join(', ')}\n\n`;
                });
                
                if (candidates[0].matchScore > candidates[1].matchScore + 10) {
                    response += `Based on the requirements, ${candidates[0].name} appears to be the strongest candidate with a significant lead in the match score.`;
                } else {
                    response += `The top candidates are quite close in match scores. You may want to consider interviewing both ${candidates[0].name} and ${candidates[1].name} to make a final decision.`;
                }
                
                return response;
            } else {
                return `There aren't enough recommended candidates to compare. Would you like to adjust your requirements to find more matches?`;
            }
        }
        
        // Missing skills query
        if (query.includes('missing') || query.includes('skills') || query.includes('gap')) {
            if (conversationContext.recommendedCandidates.length > 0) {
                const topCandidate = conversationContext.recommendedCandidates[0];
                
                if (topCandidate.missingRequirements.length > 0) {
                    let response = `Even the top candidate (${topCandidate.name}) has some gaps:\n\n`;
                    topCandidate.missingRequirements.forEach(req => {
                        response += `• ${req}\n`;
                    });
                    
                    response += `\nYou might want to consider providing training in these areas or adjusting your requirements if these skills aren't critical.`;
                    return response;
                } else {
                    return `The top candidate (${topCandidate.name}) meets all the key requirements you specified. They would be an excellent match for the position.`;
                }
            } else {
                return `Since no candidates fully match your requirements, you might want to consider candidates with transferable skills or provide training for the missing skills.`;
            }
        }
        
        // Default response for unrecognized queries
        return `I'm here to help you find the best candidates for your positions. You can ask me to:\n\n` +
               `• Find candidates for specific positions and requirements\n` +
               `• Get details about specific candidates\n` +
               `• Compare top candidates\n` +
               `• Understand why certain candidates weren't recommended\n` +
               `• Identify skill gaps in the candidate pool`;
    }
    
    // Add message to chat
    function addMessageToChat(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message';
        
        if (role === 'user') {
            messageDiv.classList.add('user-message');
            
            // Format message content with line breaks
            const formattedContent = content.replace(/\n/g, '<br>');
            messageDiv.innerHTML = `
                <div class="message-content">${formattedContent}</div>
            `;
        } else if (role === 'ai') {
            messageDiv.classList.add('bot-message');
            
            // Format message content with line breaks
            const formattedContent = content.replace(/\n/g, '<br>');
            messageDiv.innerHTML = `
                <div class="avatar"><i class="bi bi-robot"></i></div>
                <div class="message-content">${formattedContent}</div>
            `;
        } else if (role === 'system') {
            messageDiv.classList.add('bot-message');
            
            // Format message content with line breaks
            const formattedContent = content.replace(/\n/g, '<br>');
            messageDiv.innerHTML = `
                <div class="avatar"><i class="bi bi-info-circle"></i></div>
                <div class="message-content"><em>${formattedContent}</em></div>
            `;
        }
        
        chatMessages.appendChild(messageDiv);
        
        // Scroll to bottom of chat
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Add typing indicator
    function addTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'chat-message bot-message typing-indicator';
        typingDiv.innerHTML = `
            <div class="avatar"><i class="bi bi-robot"></i></div>
            <div class="message-content">
                <div class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        typingDiv.id = 'typingIndicator';
        
        chatMessages.appendChild(typingDiv);
        
        // Scroll to bottom of chat
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Remove typing indicator
    function removeTypingIndicator() {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }
    
    // Extract position from message
    function extractPosition(message) {
        const positionKeywords = [
            'developer', 'engineer', 'designer', 'manager', 'analyst', 
            'specialist', 'coordinator', 'assistant', 'director', 'lead'
        ];
        
        for (const keyword of positionKeywords) {
            if (message.toLowerCase().includes(keyword)) {
                // Extract the position with surrounding context
                const words = message.split(' ');
                const keywordIndex = words.findIndex(w => w.toLowerCase().includes(keyword));
                
                if (keywordIndex !== -1) {
                    // Look for position modifiers before the keyword
                    let startIndex = Math.max(0, keywordIndex - 2);
                    let endIndex = keywordIndex + 1;
                    
                    return words.slice(startIndex, endIndex).join(' ');
                }
            }
        }
        
        return 'Developer'; // Default position
    }
    
    // Extract requirements from message
    function extractRequirements(message) {
        const requirements = [];
        
        // Check for skills
        const skillKeywords = [
            'JavaScript', 'React', 'Angular', 'Vue', 'Node.js', 
            'Python', 'Java', 'C#', 'TypeScript', 'HTML', 'CSS',
            'SQL', 'MongoDB', 'Express', 'Docker', 'AWS', 'Azure'
        ];
        
        for (const skill of skillKeywords) {
            if (message.toLowerCase().includes(skill.toLowerCase())) {
                requirements.push(skill);
            }
        }
        
        // Check for years of experience
        const expMatch = message.match(/(\d+)\+?\s*years?/i);
        if (expMatch) {
            requirements.push(`${expMatch[1]} years of experience`);
        }
        
        return requirements;
    }
}); 