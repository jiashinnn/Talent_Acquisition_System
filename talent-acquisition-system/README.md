# Talent Acquisition System

A comprehensive web application for talent acquisition professionals to manage, analyze, and match resumes against job descriptions using AI-powered tools.

## Features

- **Resume Upload & Management**: Upload and manage resume files with automatic OCR text extraction
- **OCR (Optical Character Recognition)**: Extract text from resume PDFs and images using OCR.space API
- **Named Entity Recognition (NER)**: Identify entities like names, organizations, dates, and locations using spaCy
- **Resume Analysis**: Analyze resumes against job descriptions using Google's Gemini Pro LLM
  - Get match percentage scores
  - Identify missing keywords/skills
  - Receive AI-generated profile summaries
- **Dashboard**: View analytics and track the talent acquisition process
- **Job Description Management**: Create and manage job descriptions

## Technology Stack

- **Frontend**: HTML, CSS, JavaScript with Bootstrap 5
- **Backend**: Python with Flask
- **AI/ML Services**:
  - OCR.space API for text extraction
  - spaCy for Named Entity Recognition (NER)
  - Google Gemini Pro LLM for resume analysis and matching

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
- **Google Gemini Pro API**: For AI-powered resume analysis (configured in `backend/app.py`)

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

4. **View Dashboard**: 
   - See analytics and track the talent acquisition process

## Workflow

1. Upload resume files (PDF, DOC, DOCX, etc.)
2. System automatically extracts text using OCR
3. Create job descriptions with required skills
4. Select resumes and job description to analyze
5. AI evaluates match percentage and provides recommendations
6. Review analysis and update candidate status

## Backend API Endpoints

- `/api/process-text`: Process text with spaCy NER
- `/api/analyze-resume`: Analyze resume against job description with Gemini Pro
- `/api/entity-types`: List all entity types

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- OCR.space for text extraction API
- spaCy for natural language processing
- Google for Gemini Pro LLM API
- Bootstrap for UI components 