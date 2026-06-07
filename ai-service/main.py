"""
AI Microservice — FastAPI
Exposes endpoints called by the C++ Drogon backend.
"""

import logging
import os
from dotenv import load_dotenv
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"), override=True)
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from models.schemas import ExtractJDRequest, ExtractJDResponse, OptimizeRequest, OptimizeResponse
from agents.jd_extractor import extract_jd
from agents.resume_optimizer import optimize_resume

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s — %(message)s")
logger = logging.getLogger(__name__)


app = FastAPI(title="Resume Optimizer AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal AI service error", "detail": str(exc)},
    )


@app.get("/health")
async def health():
    return {"status": "ok", "service": "resume-ai"}


@app.post("/api/extract-jd", response_model=ExtractJDResponse)
async def api_extract_jd(req: ExtractJDRequest):
    """
    Called by C++ backend after user pastes a job description.
    Returns structured JD data + stores embeddings in ChromaDB.
    """
    if len(req.raw_text.strip()) < 50:
        raise HTTPException(400, "Job description too short (minimum 50 characters)")

    try:
        result = extract_jd(req.raw_text, req.company, req.job_title)
        return result
    except Exception as e:
        logger.error(f"JD extraction failed: {e}")
        raise HTTPException(502, f"AI extraction failed: {str(e)}")


@app.post("/api/optimize", response_model=OptimizeResponse)
async def api_optimize(req: OptimizeRequest):
    """
    Called by C++ backend to optimize selected resume sections.
    Returns before/after content + ATS scores for each section.
    """
    if not req.sections_to_optimize:
        raise HTTPException(400, "At least one section must be selected for optimization")
    if not req.current_sections:
        raise HTTPException(400, "Resume sections are required")

    try:
        result = optimize_resume(req)
        return result
    except Exception as e:
        logger.error(f"Resume optimization failed: {e}")
        raise HTTPException(502, f"AI optimization failed: {str(e)}")


@app.post("/api/ats-score")
async def api_ats_score(req: dict):
    """
    Quick ATS score check without full optimization.
    Accepts { resume_text, jd_text } and returns { score, missing_keywords }.
    """
    resume_text = req.get("resume_text", "")
    jd_text     = req.get("jd_text", "")

    if not resume_text or not jd_text:
        raise HTTPException(400, "resume_text and jd_text are required")

    from agents.jd_extractor import extract_jd
    import anthropic

    client = anthropic.Anthropic()
    response = client.messages.create(
        model="claude-haiku-4-5-20251001",  # Haiku for fast, cheap scoring
        max_tokens=256,
        system="You are an ATS scoring engine. Return only JSON.",
        messages=[{
            "role": "user",
            "content": (
                f"Score this resume against the job description (0-100).\n\n"
                f"Resume:\n{resume_text[:3000]}\n\n"
                f"Job Description:\n{jd_text[:2000]}\n\n"
                f'Return: {{"score": 75, "missing_keywords": ["k1","k2"]}}'
            )
        }]
    )
    import json
    raw = response.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"): raw = raw[4:]
    return json.loads(raw)
