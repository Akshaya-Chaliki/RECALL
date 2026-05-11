import os
import json
import re
import math
import random
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
from dotenv import load_dotenv

load_dotenv()

import google.generativeai as genai

# --- Initialize FastAPI ---
app = FastAPI(
    title="RECALL AI Engine",
    description="AI microservice for generating assessments and calculating memory decay using HLR."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Gemini Configuration ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
model = None
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel(
        "gemini-2.0-flash",
        generation_config=genai.types.GenerationConfig(
            temperature=0.8,
            top_p=0.95,
        ),
    )
    print("[OK] Gemini 2.0 Flash configured (temperature=0.8, top_p=0.95).")
else:
    print("[WARN] GEMINI_API_KEY not set. AI engine will use fallback mock questions.")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Pydantic Models (Strict Validation)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class GenerateRequest(BaseModel):
    topic_name: str = Field(..., min_length=1, description="The topic to generate questions for")
    count: Optional[int] = Field(5, ge=1, le=10)

class QuestionItem(BaseModel):
    question: str
    options: List[str]
    correctAnswer: str

    @validator("options")
    def must_have_four_options(cls, v):
        if len(v) != 4:
            raise ValueError("Each question must have exactly 4 options")
        return v

    @validator("correctAnswer")
    def answer_must_be_in_options(cls, v, values):
        if "options" in values and v not in values["options"]:
            raise ValueError(f"correctAnswer '{v}' must be one of the options")
        return v

class GenerateResponse(BaseModel):
    topic: str
    questions: List[QuestionItem]

class FlashcardRequest(BaseModel):
    topic_name: str

class FlashcardItem(BaseModel):
    front: str
    back: str

class FlashcardResponse(BaseModel):
    topic: str
    flashcards: List[FlashcardItem]

class UpdateHalfLifeRequest(BaseModel):
    score: float
    current_half_life: float
    avg_latency: Optional[float] = 0
    avg_confidence: Optional[float] = 3

class RetentionRequest(BaseModel):
    half_life: float
    hours_passed: float

class ProjectionRequest(BaseModel):
    half_life: float
    m: Optional[float] = 100.0
    days: Optional[int] = 7

class ProjectionItem(BaseModel):
    day: int
    retention: float

class ProjectionResponse(BaseModel):
    projection: List[ProjectionItem]


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Endpoints
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@app.get("/")
def health():
    return {"status": "RECALL AI Engine is running", "gemini": GEMINI_API_KEY is not None}


@app.post("/generate-questions", response_model=GenerateResponse)
async def generate_questions(request: GenerateRequest):
    topic = request.topic_name
    count = request.count

    if model:
        # Inject a random seed to nudge the model toward fresh outputs each call
        seed = random.randint(1000, 9999)

        prompt = f"""You are an expert tutor and educational assessor with deep domain knowledge.
Generate exactly {count} COMPLETELY UNIQUE and challenging multiple-choice questions about the topic: "{topic}".

DIVERSITY REQUIREMENTS (mandatory):
- Do NOT repeat standard, textbook-definition, or basic recall questions.
- Cover a MIX of cognitive levels: recall, understanding, application, analysis, and evaluation.
- Explore edge cases, tricky misconceptions, practical/real-world applications, and advanced concepts.
- Vary question formats: "Which of the following is TRUE?", "What would happen if...?", "Which is NOT...", scenario-based, code-output, etc.
- Each question must test a DIFFERENT sub-concept within "{topic}". No two questions should test the same idea.

OUTPUT RULES (strict):
1. Return ONLY a raw JSON array. No markdown, no explanation, no code fences.
2. Each object MUST have exactly these 3 keys: "question", "options", "correctAnswer".
3. "options" MUST be an array of exactly 4 unique, plausible strings (avoid obviously wrong distractors).
4. "correctAnswer" MUST be one of the 4 options verbatim.

Example format:
[{{"question": "What is X?", "options": ["A", "B", "C", "D"], "correctAnswer": "B"}}]

(Variation seed: {seed})
Generate the {count} questions now:"""

        try:
            response = model.generate_content(prompt)
            raw_text = response.text.strip()
            raw_text = re.sub(r'^```(?:json)?\s*', '', raw_text)
            raw_text = re.sub(r'\s*```$', '', raw_text)
            questions_data = json.loads(raw_text)
            validated = [QuestionItem(**q) for q in questions_data]
            return GenerateResponse(topic=topic, questions=validated)
        except Exception as e:
            print(f"[ERROR] Gemini error: {e}")

    # Fallback
    mock_questions = [
        QuestionItem(
            question=f"Question {i+1} about {topic}?",
            options=["Option A", "Option B", "Option C", "Option D"],
            correctAnswer="Option A"
        ) for i in range(count)
    ]
    return GenerateResponse(topic=topic, questions=mock_questions)


@app.post("/generate-flashcards", response_model=FlashcardResponse)
async def generate_flashcards(request: FlashcardRequest):
    topic = request.topic_name

    if model:
        prompt = f"""Generate 10 flashcard pairs for the topic: "{topic}".
Each pair should have a 'front' (question/term) and a 'back' (answer/definition).
Return ONLY a raw JSON array of objects with 'front' and 'back' keys."""

        try:
            response = model.generate_content(prompt)
            raw_text = response.text.strip()
            raw_text = re.sub(r'^```(?:json)?\s*', '', raw_text)
            raw_text = re.sub(r'\s*```$', '', raw_text)
            cards_data = json.loads(raw_text)
            validated = [FlashcardItem(**c) for c in cards_data]
            return FlashcardResponse(topic=topic, flashcards=validated)
        except Exception as e:
            print(f"[ERROR] Gemini flashcard error: {e}")

    # Fallback
    mock_cards = [FlashcardItem(front=f"Term {i+1}", back=f"Definition {i+1}") for i in range(10)]
    return FlashcardResponse(topic=topic, flashcards=mock_cards)


@app.post("/update-half-life")
async def update_half_life(request: UpdateHalfLifeRequest):
    """
    HLR-inspired update logic.
    Score is 0-5.
    """
    score = request.score
    h = request.current_half_life
    
    # Basic HLR Multipliers
    if score >= 4.5: multiplier = 2.5
    elif score >= 4.0: multiplier = 2.0
    elif score >= 3.0: multiplier = 1.5
    elif score >= 2.0: multiplier = 1.0
    elif score >= 1.0: multiplier = 0.6
    else: multiplier = 0.3
    
    new_h = h * multiplier
    # Clamps
    new_h = max(1.0, min(new_h, 8760.0)) # Min 1 hour, max 1 year
    
    return {"new_half_life": new_h}


@app.post("/calculate-retention")
async def calculate_retention(request: RetentionRequest):
    """
    R = 2 ^ (-t / h)
    """
    h = max(0.1, float(request.half_life or 0.1))
    t = float(request.hours_passed or 0)
    
    try:
        retention = math.pow(2, -t / h)
        if math.isnan(retention) or math.isinf(retention):
            retention = 0.0
    except:
        retention = 0.0
        
    return {"retention_percentage": round(retention * 100, 2)}
    

@app.post("/calculate-projection", response_model=ProjectionResponse)
async def calculate_projection(request: ProjectionRequest):
    """
    Returns a list of retention points for the next N days.
    """
    h = max(0.1, float(request.half_life or 0.1))
    m = float(request.m or 100.0)
    days = int(request.days or 7)
    
    projection = []
    for day in range(days + 1):
        hours = day * 24
        try:
            r = m * math.pow(2, -hours / h)
            if math.isnan(r) or math.isinf(r): r = 0.0
            projection.append(ProjectionItem(day=day, retention=round(r, 2)))
        except:
            projection.append(ProjectionItem(day=day, retention=0.0))
            
    return ProjectionResponse(projection=projection)