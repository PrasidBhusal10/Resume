-- Resume Optimizer — Initial Schema
-- MySQL 8.0

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ─── Users ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email         VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name          VARCHAR(255)          DEFAULT NULL,
    avatar_url    VARCHAR(500)          DEFAULT NULL,
    is_premium    BOOLEAN               DEFAULT FALSE,
    created_at    TIMESTAMP             DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP             DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Templates ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS templates (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100)  NOT NULL,
    description TEXT          DEFAULT NULL,
    preview_url VARCHAR(500)  DEFAULT NULL,
    tex_source  LONGTEXT      NOT NULL,
    category    ENUM('modern','classic','minimal','creative','ats') DEFAULT 'modern',
    is_premium  BOOLEAN       DEFAULT FALSE,
    sort_order  TINYINT       DEFAULT 0,
    created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Resumes ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS resumes (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id     BIGINT UNSIGNED NOT NULL,
    template_id INT UNSIGNED    NOT NULL,
    title       VARCHAR(255)    DEFAULT 'My Resume',
    version     INT             DEFAULT 1,
    created_at  TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)     REFERENCES users(id)     ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE RESTRICT,
    INDEX idx_resumes_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Resume Sections ─────────────────────────────────────────────────────────
-- content is a flexible JSON payload per section type:
--   summary:        { "text": "..." }
--   experience:     { "items": [{ "company", "role", "start", "end", "bullets": [] }] }
--   education:      { "items": [{ "institution", "degree", "field", "start", "end", "gpa" }] }
--   skills:         { "categories": [{ "name", "items": [] }] }
--   projects:       { "items": [{ "name", "description", "url", "bullets": [] }] }
--   certifications: { "items": [{ "name", "issuer", "date", "url" }] }
--   languages:      { "items": [{ "language", "proficiency" }] }
--   custom:         { "title": "...", "body": "..." }
CREATE TABLE IF NOT EXISTS resume_sections (
    id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    resume_id     BIGINT UNSIGNED NOT NULL,
    section_type  ENUM('summary','experience','education','skills',
                       'projects','certifications','languages','custom') NOT NULL,
    section_order TINYINT         DEFAULT 0,
    content       JSON            NOT NULL,
    is_visible    BOOLEAN         DEFAULT TRUE,
    FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE,
    INDEX idx_sections_resume_id (resume_id),
    INDEX idx_sections_type (section_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Job Descriptions ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS job_descriptions (
    id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id        BIGINT UNSIGNED NOT NULL,
    resume_id      BIGINT UNSIGNED NOT NULL,
    company_name   VARCHAR(255)    DEFAULT NULL,
    job_title      VARCHAR(255)    DEFAULT NULL,
    raw_text       LONGTEXT        NOT NULL,
    -- AI-extracted structured data
    extracted_data JSON            DEFAULT NULL,
    -- extracted_data shape:
    -- { "required_skills": [], "nice_to_have": [], "keywords": [],
    --   "seniority": "senior|mid|junior", "industry": "...",
    --   "ats_keywords": [] }
    created_at     TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE,
    FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE,
    INDEX idx_jd_user_id   (user_id),
    INDEX idx_jd_resume_id (resume_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Optimization Sessions ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS optimization_sessions (
    id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    jd_id             BIGINT UNSIGNED NOT NULL,
    resume_id         BIGINT UNSIGNED NOT NULL,
    section_type      VARCHAR(50)     NOT NULL,
    original_content  JSON            NOT NULL,
    suggested_content JSON            NOT NULL,
    diff_summary      TEXT            DEFAULT NULL,
    ats_score_before  TINYINT UNSIGNED DEFAULT NULL,
    ats_score_after   TINYINT UNSIGNED DEFAULT NULL,
    user_accepted     BOOLEAN         DEFAULT NULL,  -- NULL = pending
    accepted_at       TIMESTAMP       DEFAULT NULL,
    created_at        TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (jd_id)       REFERENCES job_descriptions(id) ON DELETE CASCADE,
    FOREIGN KEY (resume_id)   REFERENCES resumes(id)          ON DELETE CASCADE,
    INDEX idx_opt_resume_id (resume_id),
    INDEX idx_opt_jd_id     (jd_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Exports ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exports (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    resume_id   BIGINT UNSIGNED NOT NULL,
    format      ENUM('pdf','docx','tex') NOT NULL,
    file_path   VARCHAR(500)    NOT NULL,
    file_size   INT UNSIGNED    DEFAULT NULL,
    expires_at  TIMESTAMP       DEFAULT NULL,
    created_at  TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE,
    INDEX idx_exports_resume_id (resume_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Seed: Default Templates ─────────────────────────────────────────────────
INSERT INTO templates (name, description, preview_url, tex_source, category, is_premium, sort_order) VALUES

('Modern Clean',
 'A sleek, single-column layout optimized for ATS scanners.',
 '/previews/modern-clean.png',
 '\\documentclass[11pt,a4paper]{article}
\\usepackage[margin=1in]{geometry}
\\usepackage{hyperref}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\titleformat{\\section}{\\large\\bfseries}{}{0em}{}[\\titlerule]
\\begin{document}
\\begin{center}
{\\LARGE \\textbf{{{NAME}}}}\\\\[4pt]
{{EMAIL}} $\\cdot$ {{PHONE}} $\\cdot$ {{LOCATION}}
\\end{center}
{{SECTIONS}}
\\end{document}',
 'ats', FALSE, 1),

('Classic Professional',
 'A traditional two-column resume trusted by recruiters.',
 '/previews/classic-pro.png',
 '\\documentclass[11pt]{article}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{multicol}
\\usepackage{hyperref}
\\begin{document}
\\noindent{\\Huge \\textbf{{{NAME}}}}\\hfill{{EMAIL}}\\\\
{\\large {{TITLE}}}\\hfill{{PHONE}}
\\hrule
{{SECTIONS}}
\\end{document}',
 'classic', FALSE, 2),

('Minimal Elegant',
 'Ultra-clean design with elegant typography.',
 '/previews/minimal.png',
 '\\documentclass[10pt]{article}
\\usepackage[top=0.5in,bottom=0.5in,left=0.8in,right=0.8in]{geometry}
\\usepackage{parskip}
\\usepackage{hyperref}
\\begin{document}
{\\fontsize{24}{28}\\selectfont \\textbf{{{NAME}}}}\\\\
{{EMAIL}} --- {{PHONE}}\\\\
\\vspace{-1em}\\rule{\\linewidth}{0.4pt}
{{SECTIONS}}
\\end{document}',
 'minimal', FALSE, 3),

('Creative Bold',
 'Stand out with bold colors and creative layout — great for design roles.',
 '/previews/creative.png',
 '\\documentclass[11pt]{article}
\\usepackage[margin=0.7in]{geometry}
\\usepackage{xcolor}
\\definecolor{accent}{HTML}{2563EB}
\\usepackage{hyperref}
\\begin{document}
{\\color{accent}\\Huge\\textbf{{{NAME}}}}\\\\
{{SECTIONS}}
\\end{document}',
 'creative', TRUE, 4);

SET FOREIGN_KEY_CHECKS = 1;
