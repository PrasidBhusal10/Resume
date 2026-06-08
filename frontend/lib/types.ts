// ── Auth ─────────────────────────────────────────────────────────────────────
export interface User {
  id:        number;
  email:     string;
  name:      string;
  avatarUrl: string | null;
  isPremium: boolean;
}

export interface AuthState {
  user:  User | null;
  token: string | null;
}

// ── Templates ────────────────────────────────────────────────────────────────
export interface Template {
  id:          number;
  name:        string;
  description: string;
  previewUrl:  string;
  category:    "modern" | "classic" | "minimal" | "creative" | "ats";
  isPremium:   boolean;
}

// ── Resume Sections ───────────────────────────────────────────────────────────
export type SectionType =
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "projects"
  | "certifications"
  | "languages"
  | "custom";

export interface ExperienceItem {
  company:  string;
  role:     string;
  start:    string;
  end:      string;
  bullets:  string[];
}

export interface EducationItem {
  institution: string;
  degree:      string;
  field:       string;
  start:       string;
  end:         string;
  gpa:         string;
}

export interface SkillCategory {
  name:  string;
  items: string[];
}

export interface ProjectItem {
  name:        string;
  description: string;
  url:         string;
  bullets:     string[];
}

export interface CertificationItem {
  name:   string;
  issuer: string;
  date:   string;
  url:    string;
}

export type SectionContent =
  | { text: string }                              // summary
  | { items: ExperienceItem[] }                   // experience
  | { items: EducationItem[] }                    // education
  | { categories: SkillCategory[] }              // skills
  | { items: ProjectItem[] }                      // projects
  | { items: CertificationItem[] }               // certifications
  | { items: { language: string; proficiency: string }[] } // languages
  | { title: string; body: string };              // custom

export interface ResumeSection {
  id:          number;
  sectionType: SectionType;
  order:       number;
  isVisible:   boolean;
  content:     SectionContent;
}

// ── Resume ────────────────────────────────────────────────────────────────────
export interface Resume {
  id:           number;
  clientId:     string;   // stable UUID used for DB upsert
  title:        string;
  version:      number;
  templateId:   number;
  templateName: string;
  category:     string;
  sections:     ResumeSection[];
  createdAt:    string;
  updatedAt:    string;
}

export interface ResumeListItem {
  id:           number;
  title:        string;
  version:      number;
  templateName: string;
  previewUrl:   string;
  createdAt:    string;
  updatedAt:    string;
}

// ── JD & Optimization ────────────────────────────────────────────────────────
export interface ExtractedJD {
  required_skills:  string[];
  nice_to_have:     string[];
  keywords:         string[];
  ats_keywords:     string[];
  seniority:        string;
  industry:         string;
  responsibilities: string[];
  summary:          string;
}

export interface AnalyzeJDResponse {
  jdId:      number;
  extracted: ExtractedJD;
}

export interface SectionSuggestion {
  section_type: SectionType;
  original:     SectionContent;
  suggested:    SectionContent;
  diff_summary: string;
  ats_before:   number;
  ats_after:    number;
  changes:      string[];
}

export interface OptimizeResponse {
  suggestions:   SectionSuggestion[];
  overall_score: number;
  score_message: string;
}

// ── Export ────────────────────────────────────────────────────────────────────
export type ExportFormat = "pdf" | "docx" | "tex";

export interface ExportResult {
  exportId:    number;
  downloadUrl: string;
  size:        number;
}
