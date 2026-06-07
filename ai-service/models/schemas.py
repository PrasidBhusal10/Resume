from pydantic import BaseModel, Field
from typing import Any, Optional


class ExtractJDRequest(BaseModel):
    raw_text: str
    company:   str = ""
    job_title: str = ""


class ExtractJDResponse(BaseModel):
    required_skills:  list[str]
    nice_to_have:     list[str]
    keywords:         list[str]
    ats_keywords:     list[str]
    seniority:        str   # "junior" | "mid" | "senior" | "lead"
    industry:         str
    responsibilities: list[str]
    summary:          str


class SectionToOptimize(BaseModel):
    section_type: str   # "skills" | "experience" | "summary" | ...


class CurrentSection(BaseModel):
    type:    str
    content: dict[str, Any]


class OptimizeRequest(BaseModel):
    jd_raw_text:          str
    jd_extracted:         dict[str, Any]
    sections_to_optimize: list[SectionToOptimize]
    current_sections:     list[CurrentSection]


class SectionSuggestion(BaseModel):
    section_type: str
    original:     dict[str, Any]
    suggested:    dict[str, Any]
    diff_summary: str
    ats_before:   int = Field(ge=0, le=100)
    ats_after:    int = Field(ge=0, le=100)
    changes:      list[str]  # human-readable list of changes made


class OptimizeResponse(BaseModel):
    suggestions:    list[SectionSuggestion]
    overall_score:  int = Field(ge=0, le=100)
    score_message:  str
