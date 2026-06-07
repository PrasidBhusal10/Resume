"use client";

import { cn } from "@/lib/utils";
import type {
  Resume, ResumeSection, ExperienceItem, EducationItem,
  SkillCategory, ProjectItem, CertificationItem,
} from "@/lib/types";

interface Props {
  resume:        Resume;
  userName?:     string;
  userEmail?:    string;
  userPhone?:    string;
  userLocation?: string;
}

export default function ResumePreview({
  resume,
  userName     = "Your Name",
  userEmail    = "email@example.com",
  userPhone    = "+1 555 0000",
  userLocation = "City, State",
}: Props) {
  const visibleSections = [...resume.sections]
    .filter((s) => s.isVisible)
    .sort((a, b) => a.order - b.order);

  // Jake's Resume has its own completely different layout
  if (resume.category === "jake") {
    return (
      <JakeResumePreview
        resume={resume}
        visibleSections={visibleSections}
        userName={userName}
        userEmail={userEmail}
        userPhone={userPhone}
        userLocation={userLocation}
      />
    );
  }

  const style = getStyle(resume.category ?? "modern");

  return (
    <div className="bg-white shadow-2xl rounded-xl overflow-hidden print:shadow-none
                    font-sans text-slate-900 min-h-[1056px] max-w-[816px] mx-auto">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className={cn("px-10 py-8", style.header)}>
        <h1 className={cn("text-3xl font-bold tracking-tight", style.name)}>
          {userName}
        </h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3">
          {[userEmail, userPhone, userLocation].map((val, i) => (
            <span key={i} className={cn("text-sm", style.headerMeta)}>{val}</span>
          ))}
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div className="px-10 py-6 space-y-6">
        {visibleSections.map((sec) => (
          <SectionBlock key={sec.id} section={sec} style={style} />
        ))}
      </div>
    </div>
  );
}

// ── Jake's Resume layout ──────────────────────────────────────────────────────
// Mirrors the exact LaTeX template structure (Jake Gutierrez / sb2nov)

const JAKE_LABELS: Record<string, string> = {
  summary:        "Summary",
  experience:     "Experience",
  education:      "Education",
  skills:         "Technical Skills",
  projects:       "Projects",
  certifications: "Certifications",
  languages:      "Languages",
  custom:         "Additional",
};

// \titleformat{\section}: \scshape\raggedright\large + \titlerule below
const jakeSecTitle: React.CSSProperties = {
  fontSize: "12pt",
  fontVariant: "small-caps",
  fontWeight: "400",
  letterSpacing: "0.02em",
  textAlign: "left",
  marginBottom: "2px",
  paddingBottom: "1px",
  borderBottom: "1.2px solid #000",
  marginTop: "0",
};

// Full-width two-column tabular row (like \begin{tabular*}{0.97\textwidth})
function JakeTabRow({ left, right, leftStyle, rightStyle }: {
  left: React.ReactNode; right?: React.ReactNode;
  leftStyle?: React.CSSProperties; rightStyle?: React.CSSProperties;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", width: "100%" }}>
      <div style={{ flex: 1, ...leftStyle }}>{left}</div>
      {right != null && <div style={{ flexShrink: 0, paddingLeft: "8px", ...rightStyle }}>{right}</div>}
    </div>
  );
}

function JakeResumePreview({
  visibleSections, userName, userEmail, userPhone, userLocation,
}: {
  resume: Resume;
  visibleSections: ResumeSection[];
  userName: string;
  userEmail: string;
  userPhone: string;
  userLocation: string;
}) {
  const contacts = [userPhone, userEmail, userLocation].filter(Boolean);

  return (
    <div className="bg-white shadow-2xl rounded-xl overflow-hidden print:shadow-none min-h-[1056px] max-w-[816px] mx-auto"
         style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "11pt", color: "#000", lineHeight: 1.3 }}>
      <div style={{ padding: "0.5in 0.6in" }}>

        {/* \begin{center} \textbf{\Huge \scshape NAME} */}
        <div style={{ textAlign: "center", marginBottom: "6px" }}>
          <div style={{ fontSize: "22pt", fontWeight: "700", fontVariant: "small-caps", letterSpacing: "0.05em", lineHeight: 1.1 }}>
            {userName.toUpperCase()}
          </div>
          {/* Contact row: phone $|$ email $|$ linkedin $|$ github */}
          <div style={{ fontSize: "9pt", marginTop: "4px", display: "flex", justifyContent: "center", alignItems: "center", flexWrap: "wrap", gap: "0 2px" }}>
            {contacts.map((val, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: "2px" }}>
                <span style={{ textDecoration: "underline" }}>{val}</span>
                {i < contacts.length - 1 && <span style={{ margin: "0 4px", color: "#333" }}>|</span>}
              </span>
            ))}
          </div>
        </div>

        {/* Sections */}
        {visibleSections.map((sec) => (
          <div key={sec.id} style={{ marginBottom: "8px" }}>
            <div style={jakeSecTitle}>
              {JAKE_LABELS[sec.sectionType] ?? sec.sectionType}
            </div>
            <JakeSectionContent section={sec} />
          </div>
        ))}
      </div>
    </div>
  );
}

// \resumeItem — small bullet item
function JakeBullets({ bullets }: { bullets: string[] }) {
  const items = bullets.filter(Boolean);
  if (!items.length) return null;
  return (
    <ul style={{ paddingLeft: "16px", margin: "2px 0 4px", listStyleType: "disc" }}>
      {items.map((b, i) => (
        <li key={i} style={{ fontSize: "10pt", lineHeight: 1.35, marginBottom: "1px" }}>{b}</li>
      ))}
    </ul>
  );
}

// \resumeSubheading{role}{date}{company/desc}{location}
function JakeSubheading({ title, date, subtitle, location }: {
  title: string; date?: string; subtitle?: string; location?: string;
}) {
  return (
    <div style={{ marginBottom: "1px" }}>
      <JakeTabRow
        left={<span style={{ fontWeight: "700", fontSize: "11pt" }}>{title}</span>}
        right={<span style={{ fontSize: "10pt" }}>{date}</span>}
      />
      {(subtitle || location) && (
        <JakeTabRow
          left={<span style={{ fontSize: "10pt" }}>{subtitle}</span>}
          right={<span style={{ fontSize: "10pt" }}>{location}</span>}
        />
      )}
    </div>
  );
}

function JakeSectionContent({ section }: { section: ResumeSection }) {
  const { sectionType, content } = section;
  const listStyle: React.CSSProperties = { listStyle: "none", padding: 0, margin: 0 };

  if (sectionType === "summary") {
    const c = content as { text: string };
    return <p style={{ fontSize: "10pt", lineHeight: 1.4 }}>{c.text || <JakeEmptyHint>Add your summary</JakeEmptyHint>}</p>;
  }

  // \resumeSubHeadingListStart (no bullet, leftmargin=0.15in)
  if (sectionType === "education") {
    const c = content as { items: EducationItem[] };
    if (!c.items?.length) return <JakeEmptyHint>Add education</JakeEmptyHint>;
    return (
      <ul style={listStyle}>
        {c.items.map((item, i) => (
          <li key={i} style={{ paddingLeft: "0.15in", marginBottom: "4px" }}>
            <JakeSubheading
              title={item.institution || "University Name"}
              date={`${item.start} – ${item.end}`}
              subtitle={[item.degree, item.field ? `Minor in ${item.field}` : "", item.gpa ? `GPA: ${item.gpa}` : ""].filter(Boolean).join(", ")}
              location=""
            />
          </li>
        ))}
      </ul>
    );
  }

  if (sectionType === "experience") {
    const c = content as { items: ExperienceItem[] };
    if (!c.items?.length) return <JakeEmptyHint>Add experience</JakeEmptyHint>;
    return (
      <ul style={listStyle}>
        {c.items.map((item, i) => (
          <li key={i} style={{ paddingLeft: "0.15in", marginBottom: "6px" }}>
            <JakeSubheading
              title={item.role || "Job Title"}
              date={`${item.start} – ${item.end}`}
              subtitle={item.company || ""}
              location=""
            />
            <JakeBullets bullets={item.bullets ?? []} />
          </li>
        ))}
      </ul>
    );
  }

  // \resumeProjectHeading{name | tech}{date}
  if (sectionType === "projects") {
    const c = content as { items: ProjectItem[] };
    if (!c.items?.length) return <JakeEmptyHint>Add projects</JakeEmptyHint>;
    return (
      <ul style={listStyle}>
        {c.items.map((item, i) => (
          <li key={i} style={{ paddingLeft: "0.15in", marginBottom: "6px" }}>
            <div style={{ fontSize: "10pt", marginBottom: "1px" }}>
              <span style={{ fontWeight: "700" }}>{item.name}</span>
              {item.description && (
                <span style={{ fontWeight: "400" }}> | <span style={{ fontStyle: "normal" }}>{item.description}</span></span>
              )}
              {item.url && (
                <span style={{ fontWeight: "400", color: "#1a0dab" }}> | <span style={{ textDecoration: "underline" }}>{item.url}</span></span>
              )}
            </div>
            <JakeBullets bullets={item.bullets ?? []} />
          </li>
        ))}
      </ul>
    );
  }

  // Technical Skills — \textbf{Category}{: items}
  if (sectionType === "skills") {
    const c = content as { categories: SkillCategory[] };
    if (!c.categories?.length) return <JakeEmptyHint>Add skills</JakeEmptyHint>;
    return (
      <ul style={{ ...listStyle, paddingLeft: "0.15in" }}>
        <li>
          {c.categories.map((cat, i) => (
            <div key={i} style={{ fontSize: "10pt", lineHeight: 1.45 }}>
              <span style={{ fontWeight: "700" }}>{cat.name}</span>
              {": "}{cat.items.filter(Boolean).join(", ")}
            </div>
          ))}
        </li>
      </ul>
    );
  }

  if (sectionType === "certifications") {
    const c = content as { items: CertificationItem[] };
    if (!c.items?.length) return <JakeEmptyHint>Add certifications</JakeEmptyHint>;
    return (
      <ul style={listStyle}>
        {c.items.map((item, i) => (
          <li key={i} style={{ paddingLeft: "0.15in" }}>
            <JakeTabRow
              left={<span style={{ fontSize: "10pt" }}><strong>{item.name}</strong>{item.issuer ? ` — ${item.issuer}` : ""}</span>}
              right={<span style={{ fontSize: "10pt" }}>{item.date}</span>}
            />
          </li>
        ))}
      </ul>
    );
  }

  return null;
}

function JakeEmptyHint({ children }: { children: string }) {
  return <span style={{ color: "#bbb", fontStyle: "italic", fontSize: "10pt" }}>{children}…</span>;
}

// ── Standard section block ────────────────────────────────────────────────────
function SectionBlock({ section, style }: { section: ResumeSection; style: StyleConfig }) {
  const LABELS: Record<string, string> = {
    summary:        "Professional Summary",
    experience:     "Work Experience",
    education:      "Education",
    skills:         "Skills",
    projects:       "Projects",
    certifications: "Certifications",
    languages:      "Languages",
    custom:         "Additional",
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <h2 className={cn("text-xs font-bold uppercase tracking-widest", style.sectionHeading)}>
          {LABELS[section.sectionType] ?? section.sectionType}
        </h2>
        <div className={cn("flex-1 h-px", style.sectionRule)} />
      </div>
      <SectionContent section={section} style={style} />
    </div>
  );
}

// ── Standard section content ──────────────────────────────────────────────────
function SectionContent({ section, style }: { section: ResumeSection; style: StyleConfig }) {
  const { sectionType, content } = section;

  if (sectionType === "summary") {
    const c = content as { text: string };
    return (
      <p className="text-sm leading-relaxed text-slate-600">
        {c.text || <span className="italic text-slate-300">Add your summary…</span>}
      </p>
    );
  }

  if (sectionType === "experience") {
    const c = content as { items: ExperienceItem[] };
    if (!c.items?.length) return <EmptyHint>Add work experience entries</EmptyHint>;
    return (
      <div className="space-y-5">
        {c.items.map((item, i) => (
          <div key={i}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-slate-900 text-sm">{item.role || "Job Title"}</p>
                <p className={cn("text-sm", style.accentText)}>{item.company || "Company"}</p>
              </div>
              <p className="text-xs text-slate-400 whitespace-nowrap flex-shrink-0">
                {item.start || "Start"} – {item.end || "End"}
              </p>
            </div>
            {item.bullets?.length > 0 && (
              <ul className="mt-2 space-y-1.5 pl-0">
                {item.bullets.filter(Boolean).map((bullet, j) => (
                  <li key={j} className="text-sm text-slate-600 flex items-start gap-2">
                    <span className={cn("mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0", style.bulletDot)} />
                    {bullet}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (sectionType === "education") {
    const c = content as { items: EducationItem[] };
    if (!c.items?.length) return <EmptyHint>Add education entries</EmptyHint>;
    return (
      <div className="space-y-4">
        {c.items.map((item, i) => (
          <div key={i} className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-slate-900 text-sm">
                {item.degree} {item.field ? `in ${item.field}` : ""}
              </p>
              <p className={cn("text-sm", style.accentText)}>{item.institution}</p>
              {item.gpa && <p className="text-xs text-slate-400 mt-0.5">GPA: {item.gpa}</p>}
            </div>
            <p className="text-xs text-slate-400 whitespace-nowrap flex-shrink-0">
              {item.start} – {item.end}
            </p>
          </div>
        ))}
      </div>
    );
  }

  if (sectionType === "skills") {
    const c = content as { categories: SkillCategory[] };
    if (!c.categories?.length) return <EmptyHint>Add skill categories</EmptyHint>;
    return (
      <div className="space-y-2">
        {c.categories.map((cat, i) => (
          <div key={i} className="flex items-start gap-3 text-sm">
            <span className="font-semibold text-slate-800 flex-shrink-0 min-w-24">{cat.name}:</span>
            <span className="text-slate-600">{cat.items.filter(Boolean).join(" · ")}</span>
          </div>
        ))}
      </div>
    );
  }

  if (sectionType === "projects") {
    const c = content as { items: ProjectItem[] };
    if (!c.items?.length) return <EmptyHint>Add project entries</EmptyHint>;
    return (
      <div className="space-y-4">
        {c.items.map((item, i) => (
          <div key={i}>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-slate-900 text-sm">{item.name}</p>
              {item.url && (
                <a href={item.url} target="_blank" rel="noopener noreferrer"
                   className={cn("text-xs underline", style.accentText)}>
                  View ↗
                </a>
              )}
            </div>
            {item.description && <p className="text-sm text-slate-600 mt-0.5">{item.description}</p>}
            {item.bullets?.filter(Boolean).map((b, j) => (
              <div key={j} className="text-sm text-slate-600 flex items-start gap-2 mt-1">
                <span className={cn("mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0", style.bulletDot)} />
                {b}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (sectionType === "certifications") {
    const c = content as { items: CertificationItem[] };
    if (!c.items?.length) return <EmptyHint>Add certifications</EmptyHint>;
    return (
      <ul className="space-y-2">
        {c.items.map((item, i) => (
          <li key={i} className="flex items-start justify-between text-sm">
            <span>
              <span className="font-medium text-slate-800">{item.name}</span>
              {item.issuer && <span className="text-slate-500"> — {item.issuer}</span>}
            </span>
            <span className="text-xs text-slate-400 flex-shrink-0 ml-4">{item.date}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (sectionType === "languages") {
    const c = content as { items: { language: string; proficiency: string }[] };
    if (!c.items?.length) return <EmptyHint>Add languages</EmptyHint>;
    return (
      <div className="flex flex-wrap gap-4">
        {c.items.map((item, i) => (
          <div key={i} className="text-sm">
            <span className="font-medium text-slate-800">{item.language}</span>
            {item.proficiency && <span className="text-slate-400"> ({item.proficiency})</span>}
          </div>
        ))}
      </div>
    );
  }

  return null;
}

function EmptyHint({ children }: { children: string }) {
  return <p className="text-sm text-slate-300 italic">{children}…</p>;
}

// ── Style config per template category ───────────────────────────────────────
interface StyleConfig {
  header:         string;
  name:           string;
  headerMeta:     string;
  sectionHeading: string;
  sectionRule:    string;
  accentText:     string;
  bulletDot:      string;
}

function getStyle(category: string): StyleConfig {
  switch (category) {
    case "modern":
      return {
        header:         "bg-brand-600 text-white",
        name:           "text-white",
        headerMeta:     "text-blue-100",
        sectionHeading: "text-brand-600",
        sectionRule:    "bg-brand-100",
        accentText:     "text-brand-600",
        bulletDot:      "bg-brand-400",
      };
    case "creative":
      return {
        header:         "bg-violet-700 text-white",
        name:           "text-white",
        headerMeta:     "text-violet-200",
        sectionHeading: "text-violet-600",
        sectionRule:    "bg-violet-100",
        accentText:     "text-violet-600",
        bulletDot:      "bg-violet-400",
      };
    case "classic":
      return {
        header:         "bg-slate-800 text-white",
        name:           "text-white",
        headerMeta:     "text-slate-300",
        sectionHeading: "text-slate-700",
        sectionRule:    "bg-slate-200",
        accentText:     "text-slate-600",
        bulletDot:      "bg-slate-400",
      };
    case "minimal":
      return {
        header:         "border-b-2 border-slate-900",
        name:           "text-slate-900",
        headerMeta:     "text-slate-500",
        sectionHeading: "text-slate-500",
        sectionRule:    "bg-slate-200",
        accentText:     "text-slate-500",
        bulletDot:      "bg-slate-300",
      };
    default:
      return {
        header:         "border-b-2 border-teal-600",
        name:           "text-teal-700",
        headerMeta:     "text-slate-500",
        sectionHeading: "text-teal-600",
        sectionRule:    "bg-teal-100",
        accentText:     "text-teal-600",
        bulletDot:      "bg-teal-400",
      };
  }
}
