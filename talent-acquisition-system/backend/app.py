from flask import Flask, request, jsonify
from flask_cors import CORS
import spacy
import json
import os
import requests
import logging

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS to allow requests from our frontend

# Load spaCy model
try:
    logger.info("Attempting to load spaCy model...")
    nlp = spacy.load("en_core_web_sm")
    logger.info("Successfully loaded spaCy model")
except Exception as e:
    logger.error(f"Failed to load spaCy model: {str(e)}")
    print("spaCy model not found. Please install it using:")
    print("python -m spacy download en_core_web_sm")
    nlp = None

# Gemini API settings
GEMINI_API_KEY = 'AIzaSyDoCEVrJllOvR_2-HoDUStsjewpvuQKoAA'
GEMINI_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

@app.route('/api/process-text', methods=['POST'])
def process_text():
    logger.info("Received text processing request")
    if nlp is None:
        logger.error("spaCy model not loaded")
        return jsonify({'error': 'spaCy model not loaded. Please install it first.'}), 500
    
    data = request.json
    if not data or 'text' not in data:
        logger.error("No text provided in request")
        return jsonify({'error': 'No text provided'}), 400
    
    text = data['text']
    logger.debug(f"Processing text of length: {len(text)}")
    
    # Process the text with spaCy
    doc = nlp(text)
    
    # Extract core entities (focus on standard NER types)
    entities = []
    for ent in doc.ents:
        entities.append({
            'text': ent.text,
            'label': ent.label_,
            'start': ent.start_char,
            'end': ent.end_char,
            'description': spacy.explain(ent.label_)
        })
    
    logger.info(f"Found {len(entities)} entities in text")
    
    # Extract statistics about entity types found
    entity_stats = {}
    for ent in doc.ents:
        if ent.label_ not in entity_stats:
            entity_stats[ent.label_] = 0
        entity_stats[ent.label_] += 1
    
    # Extract sentences
    sentences = [sent.text for sent in doc.sents]
    
    # Return processed data
    result = {
        'entities': entities,
        'entity_stats': entity_stats,
        'sentences': sentences,
        'spacy_version': spacy.__version__,
        'model_name': 'en_core_web_sm'
    }
    
    logger.info("Successfully processed text with spaCy")
    return jsonify(result)

@app.route('/api/analyze-resume', methods=['POST'])
def analyze_resume():
    """Analyze a resume against a job description using Gemini Pro"""
    logger.info("Received resume analysis request")
    
    data = request.json
    if not data or 'resume_text' not in data or 'job_description' not in data:
        logger.error("Missing required fields in request")
        return jsonify({'error': 'Both resume text and job description must be provided'}), 400
    
    resume_text = data['resume_text']
    job_description = data['job_description']
    
    logger.debug(f"Resume text length: {len(resume_text)}")
    logger.debug(f"Job description length: {len(job_description)}")
    
    # Create prompt for Gemini
    prompt = f"""Hey Act Like a skilled or very experience ATS(Application Tracking System)
with a deep understanding of tech field,software engineering,data science ,data analyst
and big data engineer. Your task is to evaluate the resume based on the given job description.
You must consider the job market is very competitive and you should provide 
best assistance for improving the resumes. Assign the percentage Matching based 
on JD and the missing keywords with high accuracy
resume:{resume_text}
description:{job_description}

I want the response as per below structure
{{"JD Match": "%", "MissingKeywords": [], "Profile Summary": ""}}"""

    try:
        logger.info("Sending request to Gemini API")
        logger.debug(f"API Endpoint: {GEMINI_API_ENDPOINT}")
        
        # Call Gemini API with updated request format
        response = requests.post(
            f"{GEMINI_API_ENDPOINT}?key={GEMINI_API_KEY}",
            json={
                "contents": [{
                    "role": "user",
                    "parts": [{
                        "text": prompt
                    }]
                }],
                "generationConfig": {
                    "temperature": 0.7,
                    "topK": 40,
                    "topP": 0.95,
                    "maxOutputTokens": 1024,
                }
            }
        )
        
        logger.debug(f"Gemini API Response Status: {response.status_code}")
        logger.debug(f"Gemini API Response Headers: {dict(response.headers)}")
        
        if response.status_code != 200:
            logger.error(f"Gemini API request failed: {response.text}")
            return jsonify({
                'error': f'Gemini API request failed with status {response.status_code}',
                'details': response.text
            }), 500
        
        response_data = response.json()
        logger.debug(f"Gemini API Response Data: {json.dumps(response_data, indent=2)}")
        
        # Extract the generated text from the updated response format
        if 'candidates' in response_data and len(response_data['candidates']) > 0:
            generated_text = response_data['candidates'][0]['content']['parts'][0]['text']
            logger.info("Successfully extracted generated text from response")
        else:
            logger.error("Invalid response format from Gemini API")
            return jsonify({
                'error': 'Invalid response format from Gemini API',
                'details': response_data
            }), 500
        
        # Try to extract JSON from the response
        try:
            # First try to find a JSON pattern in the text
            import re
            json_match = re.search(r'\{[\s\S]*\}', generated_text)
            if json_match:
                analysis_result = json.loads(json_match.group(0))
                logger.info("Successfully parsed JSON from response")
            else:
                # If that fails, try parsing the whole text
                analysis_result = json.loads(generated_text)
                logger.info("Successfully parsed entire text as JSON")
                
            # Add the raw response for debugging
            analysis_result['raw_response'] = generated_text
            
            logger.info("Successfully completed resume analysis")
            return jsonify(analysis_result)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON from response: {str(e)}")
            return jsonify({
                'error': 'Could not parse JSON from Gemini response',
                'raw_response': generated_text
            }), 500
            
    except Exception as e:
        logger.error(f"Unexpected error during resume analysis: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/entity-types', methods=['GET'])
def entity_types():
    """Return all possible entity types with explanations"""
    logger.info("Received request for entity types")
    entity_types = {
        'PERSON': 'People, including fictional',
        'NORP': 'Nationalities or religious or political groups',
        'FAC': 'Buildings, airports, highways, bridges, etc.',
        'ORG': 'Companies, agencies, institutions, etc.',
        'GPE': 'Countries, cities, states',
        'LOC': 'Non-GPE locations, mountain ranges, bodies of water',
        'PRODUCT': 'Objects, vehicles, foods, etc. (not services)',
        'EVENT': 'Named hurricanes, battles, wars, sports events, etc.',
        'WORK_OF_ART': 'Titles of books, songs, etc.',
        'LAW': 'Named documents made into laws',
        'LANGUAGE': 'Any named language',
        'DATE': 'Absolute or relative dates or periods',
        'TIME': 'Times smaller than a day',
        'PERCENT': 'Percentage, including "%"',
        'MONEY': 'Monetary values, including unit',
        'QUANTITY': 'Measurements, as of weight or distance',
        'ORDINAL': '"first", "second", etc.',
        'CARDINAL': 'Numerals that do not fall under another type'
    }
    logger.info("Successfully returned entity types")
    return jsonify(entity_types)

@app.route('/', methods=['GET'])
def index():
    """Root endpoint to check if API is running"""
    logger.info("Received health check request")
    return jsonify({
        'status': 'running',
        'endpoints': {
            '/api/process-text': 'POST - Process text with spaCy NER',
            '/api/analyze-resume': 'POST - Analyze resume against job description with Gemini Pro',
            '/api/entity-types': 'GET - List all entity types'
        },
        'spacy_loaded': nlp is not None,
        'spacy_version': spacy.__version__ if nlp else 'Not loaded',
        'gemini_api_key': 'Configured' if GEMINI_API_KEY else 'Not configured'
    })

if __name__ == '__main__':
    logger.info("Starting Flask application")
    app.run(debug=True, port=5000) 