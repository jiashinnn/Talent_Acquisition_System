# Resume NER Backend

This is a Python backend service for the Talent Acquisition System that provides Named Entity Recognition (NER) for resume text using spaCy.

## Setup

1. Install Python 3.7+ if not already installed

2. Install required packages:
```
pip install -r requirements.txt
```

3. Download the spaCy English language model:
```
python -m spacy download en_core_web_sm
```

## Running the Server

Start the Flask server:
```
python app.py
```

The server will run on `http://localhost:5000` by default.

## API Endpoints

### Process Text

**URL:** `/api/process-text`
**Method:** `POST`
**Content-Type:** `application/json`

**Request Body:**
```json
{
  "text": "Your resume text here..."
}
```

**Response:**
```json
{
  "entities": [
    {
      "text": "Entity text",
      "label": "PERSON/ORG/etc",
      "start": 0,
      "end": 10,
      "description": "Description of entity type"
    }
  ],
  "tokens": [...],
  "noun_chunks": [...],
  "sentences": [...],
  "skills": [...]
}
```

## Entity Types

spaCy provides the following entity types:

- PERSON: People, including fictional
- NORP: Nationalities or religious or political groups
- FAC: Buildings, airports, highways, bridges, etc.
- ORG: Companies, agencies, institutions, etc.
- GPE: Countries, cities, states
- LOC: Non-GPE locations, mountain ranges, bodies of water
- PRODUCT: Objects, vehicles, foods, etc. (not services)
- EVENT: Named hurricanes, battles, wars, sports events, etc.
- WORK_OF_ART: Titles of books, songs, etc.
- LAW: Named documents made into laws
- LANGUAGE: Any named language
- DATE: Absolute or relative dates or periods
- TIME: Times smaller than a day
- PERCENT: Percentage, including "%"
- MONEY: Monetary values, including unit
- QUANTITY: Measurements, as of weight or distance
- ORDINAL: "first", "second", etc.
- CARDINAL: Numerals that do not fall under another type 