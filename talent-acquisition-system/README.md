# Talent Acquisition System

A comprehensive web application for talent acquisition professionals to manage, analyze, and match resumes against job descriptions using AI-powered tools.

## Features

- **Resume Upload & Management**: Upload and manage resume files with automatic OCR text extraction
- **OCR (Optical Character Recognition)**: Extract text from resume PDFs and images using OCR.space API
- **Named Entity Recognition (NER)**: Identify entities like names, organizations, dates, and locations using spaCy
- **Resume Analysis**: Analyze resumes against job descriptions using Google's Gemini 2.0 Flash LLM
  - Get match percentage scores
  - Identify missing keywords/skills
  - Receive AI-generated profile summaries
- **AI Resume Assistant**: Interact with an AI chatbot to find the best candidates for positions
  - Describe the position and candidate requirements
  - Get AI-powered recommendations of suitable candidates
  - Ask follow-up questions about specific candidates
  - Understand why certain candidates weren't recommended
  - Filter candidates by job position
- **Candidate Management System**: Comprehensive candidate tracking
  - Sort and filter candidates by status, position, and score
  - View candidates in organized tabs (Shortlisted, Pending, Spam)
  - Track candidate status and analysis history
  - Manage candidate information and contact details
- **Dashboard**: View analytics and track the talent acquisition process
  - Resume score distribution charts
  - Hiring by position visualization
  - Candidate status summary
  - Recent uploads tracking
- **Job Description Management**: Create and manage job descriptions

## Technology Stack

- **Frontend**: HTML, CSS, JavaScript with Bootstrap 5
- **Backend**: Python with Flask
- **AI/ML Services**:
  - OCR.space API for text extraction
  - spaCy for Named Entity Recognition (NER)
  - Google Gemini 2.0 Flash LLM for resume analysis and matching
  - Google Gemini AI chatbot for resume assistant

## Setup and Installation

### Prerequisites

- Python 3.7 or higher
- pip (Python package manager)
- Web browser (Chrome, Firefox, etc.)

### Installation

1. Clone the repository
2. Navigate to the project directory
3. Run the `start.bat` script (Windows) to start both the backend and frontend services

```
start.bat
```

This will:
- Check for Python and required packages
- Install necessary Python dependencies
- Start the Flask backend server
- Provide instructions to access the web application

### Manual Setup (Alternative)

If you prefer to set up the application manually:

1. Install Python dependencies:
```
cd backend
pip install -r requirements.txt
python -m spacy download en_core_web_sm
```

2. Start the backend server:
```
cd backend
python app.py
```

3. Open the frontend in your browser:
```
file:///path/to/talent-acquisition-system/index.html
```

## Configuration

### API Keys

The application uses the following API keys:

- **OCR.space API**: For text extraction from resume files (configured in `js/upload-resume.js`)
- **Google Gemini API**: For AI-powered resume analysis (configured in `backend/app.py`)

You can replace these with your own API keys if needed.

## Usage

1. **Upload Resumes**: 
   - Use the Upload Resume page to add candidate resumes
   - Wait for OCR processing to complete

2. **Manage Job Descriptions**: 
   - Create and edit job descriptions with required skills and responsibilities

3. **Analyze Resumes**: 
   - Select resumes that have completed OCR processing
   - Choose a job description to match against
   - View match scores, missing keywords, and profile summaries
   - Change candidate status based on analysis results

4. **Use AI Resume Assistant**:
   - Select a specific job position to focus on (optional)
   - Describe the position and candidate requirements
   - Review AI-recommended candidates
   - Ask follow-up questions about specific candidates
   - Compare candidates and understand selection reasoning

5. **Manage Candidates**:
   - Filter candidates by status, position, and score
   - Sort candidates by various criteria
   - View candidates in organized tabs (Shortlisted, Pending, Spam)
   - Update candidate status and information

6. **View Dashboard**: 
   - See analytics and track the talent acquisition process
   - Monitor resume score distribution
   - Track hiring by position
   - View candidate status summary

## Workflow

1. Upload resume files (PDF, DOC, DOCX, etc.)
2. System automatically extracts text using OCR
3. Create job descriptions with required skills
4. Select resumes and job description to analyze
5. AI evaluates match percentage and provides recommendations
6. Use AI Resume Assistant for interactive candidate selection
7. Manage and track candidates through the hiring process
8. Monitor progress through the dashboard analytics

## Backend API Endpoints

- `/api/process-text`: Process text with spaCy NER
- `/api/analyze-resume`: Analyze resume against job description with Gemini 2.0 Flash
- `/api/ai-assistant`: Process user messages for the AI Resume Assistant chatbot
- `/api/entity-types`: List all entity types

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- OCR.space for text extraction API
- spaCy for natural language processing
- Google for Gemini 2.0 Flash LLM API
- Bootstrap for UI components 