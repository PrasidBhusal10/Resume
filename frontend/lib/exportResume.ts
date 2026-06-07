import type {
  Resume, ResumeSection, ExperienceItem, EducationItem,
  SkillCategory, ProjectItem, CertificationItem,
} from "./types";
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, BorderStyle, Table, TableRow, TableCell, WidthType,
} from "docx";

// ── PDF (browser print) ───────────────────────────────────────────────────────
export function exportPDF(resume: Resume, userName: string, userEmail: string, userPhone: string, userLocation: string) {
  const html = buildHTMLString(resume, userName, userEmail, userPhone, userLocation);
  const win = window.open("", "_blank");
  if (!win) { alert("Allow pop-ups to export PDF"); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  // Small delay lets styles render before print dialog opens
  setTimeout(() => { win.print(); }, 600);
}

// ── LaTeX ─────────────────────────────────────────────────────────────────────
export function exportLaTeX(resume: Resume, userName: string, userEmail: string, userPhone: string, userLocation: string) {
  const tex = buildTeXString(resume, userName, userEmail, userPhone, userLocation);
  downloadText(tex, `${slugify(resume.title)}.tex`, "text/plain");
}

// ── DOCX ──────────────────────────────────────────────────────────────────────
export async function exportDOCX(resume: Resume, userName: string, userEmail: string, userPhone: string, userLocation: string) {
  const sections = visibleSections(resume);
  const children: Paragraph[] = [];

  // Header
  children.push(
    new Paragraph({
      text: userName,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: `${userPhone}  |  ${userEmail}  |  ${userLocation}`, size: 20 }),
      ],
    }),
    new Paragraph({ text: "" }),
  );

  for (const sec of sections) {
    const label = SEC_LABELS[sec.sectionType] ?? sec.sectionType.toUpperCase();
    children.push(
      new Paragraph({
        text: label,
        heading: HeadingLevel.HEADING_2,
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000" } },
        spacing: { before: 200, after: 60 },
      }),
    );

    if (sec.sectionType === "summary") {
      const c = sec.content as { text: string };
      children.push(new Paragraph({ text: c.text, spacing: { after: 100 } }));
    }

    if (sec.sectionType === "experience") {
      const c = sec.content as { items: ExperienceItem[] };
      for (const item of c.items ?? []) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: item.role, bold: true }),
              new TextRun({ text: `  —  ${item.company}`, italics: true }),
              new TextRun({ text: `  ${item.start} – ${item.end}`, color: "666666" }),
            ],
            spacing: { before: 120, after: 40 },
          }),
        );
        for (const b of item.bullets ?? []) {
          children.push(new Paragraph({ text: b, bullet: { level: 0 }, spacing: { after: 30 } }));
        }
      }
    }

    if (sec.sectionType === "education") {
      const c = sec.content as { items: EducationItem[] };
      for (const item of c.items ?? []) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${item.degree}${item.field ? ` in ${item.field}` : ""}`, bold: true }),
              new TextRun({ text: `  —  ${item.institution}`, italics: true }),
              new TextRun({ text: `  ${item.start} – ${item.end}`, color: "666666" }),
            ],
            spacing: { before: 120, after: 40 },
          }),
        );
        if (item.gpa) children.push(new Paragraph({ text: `GPA: ${item.gpa}`, spacing: { after: 30 } }));
      }
    }

    if (sec.sectionType === "skills") {
      const c = sec.content as { categories: SkillCategory[] };
      for (const cat of c.categories ?? []) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${cat.name}: `, bold: true }),
              new TextRun({ text: cat.items.join(", ") }),
            ],
            spacing: { after: 40 },
          }),
        );
      }
    }

    if (sec.sectionType === "projects") {
      const c = sec.content as { items: ProjectItem[] };
      for (const item of c.items ?? []) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: item.name, bold: true })],
            spacing: { before: 100, after: 30 },
          }),
        );
        if (item.description) children.push(new Paragraph({ text: item.description, spacing: { after: 30 } }));
        for (const b of item.bullets ?? []) {
          children.push(new Paragraph({ text: b, bullet: { level: 0 }, spacing: { after: 20 } }));
        }
      }
    }

    if (sec.sectionType === "certifications") {
      const c = sec.content as { items: CertificationItem[] };
      for (const item of c.items ?? []) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: item.name, bold: true }),
              item.issuer ? new TextRun({ text: ` — ${item.issuer}` }) : new TextRun(""),
              new TextRun({ text: `  ${item.date}`, color: "666666" }),
            ],
            spacing: { after: 40 },
          }),
        );
      }
    }
  }

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `${slugify(resume.title)}.docx`, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
}

// ── HTML for PDF print ────────────────────────────────────────────────────────
function buildHTMLString(resume: Resume, name: string, email: string, phone: string, location: string): string {
  const isJake = resume.category === "jake";
  const sections = visibleSections(resume);
  const sectionHTML = sections.map((sec) => renderSectionHTML(sec, isJake)).join("");

  const jakeCSS = `
    body { font-family: Georgia,"Times New Roman",serif; font-size:11pt; color:#000; line-height:1.3; }
    .page { padding:0.5in 0.6in; }
    /* \textbf{\Huge \scshape NAME} */
    .name { text-align:center; font-size:22pt; font-weight:700; font-variant:small-caps; letter-spacing:0.05em; margin-bottom:4px; }
    .contact { text-align:center; font-size:9pt; color:#111; margin-bottom:10px; }
    .contact .sep { margin:0 4px; color:#333; }
    /* \titleformat{\section}: \scshape\raggedright\large + \titlerule */
    .sec { margin-bottom:8px; }
    .sec-title { font-size:12pt; font-variant:small-caps; letter-spacing:0.02em; font-weight:400;
                 text-align:left; border-bottom:1.2px solid #000; padding-bottom:1px; margin-bottom:4px; }
    /* \resumeSubHeadingListStart: no bullet, leftmargin=0.15in */
    .sub-list { list-style:none; padding:0; margin:0; }
    .sub-item { padding-left:0.15in; margin-bottom:5px; }
    /* \resumeSubheading: tabular* full-width, bold title + right date */
    .tab-row { display:flex; justify-content:space-between; align-items:baseline; width:100%; }
    .tab-row .tl { flex:1; }
    .tab-row .tr { flex-shrink:0; padding-left:8px; font-size:10pt; white-space:nowrap; }
    .bold { font-weight:700; }
    /* \resumeItemListStart: regular bullets */
    .bullet-list { list-style:disc; padding-left:18px; margin:2px 0 3px; }
    .bullet-list li { font-size:10pt; line-height:1.35; margin-bottom:1px; }
    /* Skills */
    .skills-line { font-size:10pt; line-height:1.45; }
  `;

  const modernCSS = `
    body { font-family: Arial,Helvetica,sans-serif; font-size:10.5pt; color:#111; line-height:1.4; }
    .page { padding:0.5in 0.65in; }
    .name { font-size:20pt; font-weight:700; margin-bottom:4px; }
    .contact { font-size:9.5pt; color:#555; margin-bottom:12px; }
    .sec { margin-bottom:14px; }
    .sec-title { font-size:8pt; font-weight:700; text-transform:uppercase; letter-spacing:.1em; color:#555; margin-bottom:5px; border-bottom:1px solid #ddd; padding-bottom:2px; }
    .row { display:flex; justify-content:space-between; align-items:baseline; }
    .row .r { font-size:9.5pt; white-space:nowrap; flex-shrink:0; padding-left:8px; color:#666; }
    .bold { font-weight:700; }
    .italic { font-style:italic; }
    ul { list-style:disc; padding-left:18px; margin:3px 0 0; }
    ul li { margin-bottom:2px; line-height:1.4; }
    .entry { margin-bottom:8px; }
    .skills-row { display:flex; gap:6px; margin-bottom:3px; }
    .skills-cat { font-weight:700; flex-shrink:0; min-width:100px; }
  `;

  const header = isJake
    ? `<div class="name">${name.toUpperCase()}</div>
       <div class="contact">
         <span>${phone}</span><span class="sep">|</span>
         <span><u>${email}</u></span><span class="sep">|</span>
         <span>${location}</span>
       </div>`
    : `<div class="name">${name}</div>
       <div class="contact">${email} · ${phone} · ${location}</div>`;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title></title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  @page { size:letter; margin:0; }
  ${isJake ? jakeCSS : modernCSS}
  @media print {
    body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  }
</style>
</head><body><div class="page">
${header}
${sectionHTML}
</div></body></html>`;
}

function renderSectionHTML(sec: ResumeSection, isJake: boolean): string {
  const c = sec.content as Record<string, unknown>;
  const label = isJake
    ? ({ summary:"Summary", experience:"Experience", education:"Education", skills:"Technical Skills",
         projects:"Projects", certifications:"Certifications", languages:"Languages", custom:"Additional" }[sec.sectionType] ?? sec.sectionType)
    : ({ summary:"Professional Summary", experience:"Work Experience", education:"Education", skills:"Skills",
         projects:"Projects", certifications:"Certifications", languages:"Languages", custom:"Additional" }[sec.sectionType] ?? sec.sectionType);

  let body = "";

  if (sec.sectionType === "summary") {
    body = `<p>${(c as { text: string }).text ?? ""}</p>`;
  }

  else if (sec.sectionType === "education") {
    const rows = ((c as { items: EducationItem[] }).items ?? []).map((item) => {
      const degree = [item.degree, item.field ? `Minor in ${item.field}` : "", item.gpa ? `GPA: ${item.gpa}` : ""].filter(Boolean).join(", ");
      return `<li class="sub-item">
        <div class="tab-row"><span class="tl bold">${item.institution}</span><span class="tr"></span></div>
        <div class="tab-row"><span class="tl" style="font-size:10pt">${degree}</span><span class="tr">${item.start} – ${item.end}</span></div>
      </li>`;
    }).join("");
    body = `<ul class="sub-list">${rows}</ul>`;
  }

  else if (sec.sectionType === "experience") {
    const rows = ((c as { items: ExperienceItem[] }).items ?? []).map((item) => {
      const bullets = item.bullets?.filter(Boolean) ?? [];
      return `<li class="sub-item">
        <div class="tab-row"><span class="tl bold">${item.role}</span><span class="tr">${item.start} – ${item.end}</span></div>
        <div class="tab-row"><span class="tl" style="font-size:10pt">${item.company}</span><span class="tr"></span></div>
        ${bullets.length ? `<ul class="bullet-list">${bullets.map((b) => `<li>${b}</li>`).join("")}</ul>` : ""}
      </li>`;
    }).join("");
    body = `<ul class="sub-list">${rows}</ul>`;
  }

  else if (sec.sectionType === "skills") {
    const rows = ((c as { categories: SkillCategory[] }).categories ?? []).map((cat) =>
      `<div class="skills-line"><strong>${cat.name}</strong>: ${cat.items.filter(Boolean).join(", ")}</div>`
    ).join("");
    body = `<div style="padding-left:0.15in">${rows}</div>`;
  }

  else if (sec.sectionType === "projects") {
    const rows = ((c as { items: ProjectItem[] }).items ?? []).map((item) => {
      const bullets = item.bullets?.filter(Boolean) ?? [];
      const heading = `<strong>${item.name}</strong>${item.description ? ` | ${item.description}` : ""}${item.url ? ` | <u>${item.url}</u>` : ""}`;
      return `<li class="sub-item">
        <div style="font-size:10pt;margin-bottom:1px">${heading}</div>
        ${bullets.length ? `<ul class="bullet-list">${bullets.map((b) => `<li>${b}</li>`).join("")}</ul>` : ""}
      </li>`;
    }).join("");
    body = `<ul class="sub-list">${rows}</ul>`;
  }

  else if (sec.sectionType === "certifications") {
    const rows = ((c as { items: CertificationItem[] }).items ?? []).map((item) =>
      `<li class="sub-item"><div class="tab-row"><span class="tl"><strong>${item.name}</strong>${item.issuer ? ` — ${item.issuer}` : ""}</span><span class="tr">${item.date}</span></div></li>`
    ).join("");
    body = `<ul class="sub-list">${rows}</ul>`;
  }

  return `<div class="sec"><div class="sec-title">${label}</div>${body}</div>`;
}

// ── LaTeX builder — generates the exact Jake Gutierrez template ───────────────
function buildTeXString(resume: Resume, name: string, email: string, phone: string, location: string): string {
  const sections = visibleSections(resume);
  const e = texEscape;

  const sectionTex = sections.map((sec) => {
    const label = ({ summary:"Summary", experience:"Experience", education:"Education",
      skills:"Technical Skills", projects:"Projects", certifications:"Certifications",
      languages:"Languages", custom:"Additional" } as Record<string,string>)[sec.sectionType] ?? sec.sectionType;
    const c = sec.content as Record<string, unknown>;
    let body = "";

    if (sec.sectionType === "summary") {
      body = e((c as { text: string }).text ?? "");
    }

    else if (sec.sectionType === "education") {
      const items = (c as { items: EducationItem[] }).items ?? [];
      body = `  \\resumeSubHeadingListStart\n` +
        items.map((item) => {
          const degree = [e(item.degree), item.field ? `Minor in ${e(item.field)}` : "", item.gpa ? `GPA: ${e(item.gpa)}` : ""].filter(Boolean).join(", ");
          return `    \\resumeSubheading\n      {${e(item.institution)}}{}\n      {${degree}}{${e(item.start)} -- ${e(item.end)}}`;
        }).join("\n") +
        `\n  \\resumeSubHeadingListEnd`;
    }

    else if (sec.sectionType === "experience") {
      const items = (c as { items: ExperienceItem[] }).items ?? [];
      body = `  \\resumeSubHeadingListStart\n` +
        items.map((item) => {
          const bullets = item.bullets?.filter(Boolean) ?? [];
          return `    \\resumeSubheading\n      {${e(item.role)}}{${e(item.start)} -- ${e(item.end)}}\n      {${e(item.company)}}{}\n` +
            (bullets.length
              ? `      \\resumeItemListStart\n${bullets.map((b) => `        \\resumeItem{${e(b)}}`).join("\n")}\n      \\resumeItemListEnd`
              : "");
        }).join("\n") +
        `\n  \\resumeSubHeadingListEnd`;
    }

    else if (sec.sectionType === "skills") {
      const cats = (c as { categories: SkillCategory[] }).categories ?? [];
      const rows = cats.map((cat) => `     \\textbf{${e(cat.name)}}{: ${cat.items.map(e).join(", ")}} \\\\`).join("\n");
      body = ` \\begin{itemize}[leftmargin=0.15in, label={}]\n    \\small{\\item{\n${rows}\n    }}\n \\end{itemize}`;
    }

    else if (sec.sectionType === "projects") {
      const items = (c as { items: ProjectItem[] }).items ?? [];
      body = `    \\resumeSubHeadingListStart\n` +
        items.map((item) => {
          const heading = `\\textbf{${e(item.name)}}${item.description ? ` $|$ {${e(item.description)}}` : ""}`;
          const bullets = item.bullets?.filter(Boolean) ?? [];
          return `      \\resumeProjectHeading\n          {${heading}}{}\n` +
            (bullets.length
              ? `          \\resumeItemListStart\n${bullets.map((b) => `            \\resumeItem{${e(b)}}`).join("\n")}\n          \\resumeItemListEnd`
              : "");
        }).join("\n") +
        `\n    \\resumeSubHeadingListEnd`;
    }

    else if (sec.sectionType === "certifications") {
      const items = (c as { items: CertificationItem[] }).items ?? [];
      body = items.map((item) =>
        `${e(item.name)}${item.issuer ? ` --- ${e(item.issuer)}` : ""} \\hfill ${e(item.date)}`
      ).join(" \\\\\n");
    }

    return `\\section{${label}}\n${body}`;
  }).join("\n\n");

  return `%-------------------------
% Resume in Latex
% Author : Jake Gutierrez
% Based off of: https://github.com/sb2nov/resume
% License : MIT
%------------------------

\\documentclass[letterpaper,11pt]{article}

\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{marvosym}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{verbatim}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage[english]{babel}
\\usepackage{tabularx}
\\input{glyphtounicode}

\\pagestyle{fancy}
\\fancyhf{}
\\fancyfoot{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}

\\addtolength{\\oddsidemargin}{-0.5in}
\\addtolength{\\evensidemargin}{-0.5in}
\\addtolength{\\textwidth}{1in}
\\addtolength{\\topmargin}{-.5in}
\\addtolength{\\textheight}{1.0in}

\\urlstyle{same}
\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}

\\titleformat{\\section}{
  \\vspace{-4pt}\\scshape\\raggedright\\large
}{}{0em}{}[\\color{black}\\titlerule \\vspace{-5pt}]

\\pdfgentounicode=1

\\newcommand{\\resumeItem}[1]{
  \\item\\small{{#1 \\vspace{-2pt}}}
}

\\newcommand{\\resumeSubheading}[4]{
  \\vspace{-2pt}\\item
    \\begin{tabular*}{0.97\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
      \\textbf{#1} & #2 \\\\
      \\small#3 & {\\small #4} \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeProjectHeading}[2]{
    \\item
    \\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}
      \\small#1 & #2 \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\renewcommand\\labelitemii{$\\vcenter{\\hbox{\\tiny$\\bullet$}}$}

\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0.15in, label={}]}
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{-5pt}}

%-------------------------------------------
\\begin{document}

\\begin{center}
    \\textbf{\\Huge \\scshape ${e(name.toUpperCase())}} \\\\ \\vspace{1pt}
    \\small ${e(phone)} $|$
    \\href{mailto:${email}}{\\underline{${e(email)}}} $|$
    ${e(location)}
\\end{center}

${sectionTex}

\\end{document}
`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const SEC_LABELS: Record<string, string> = {
  summary:        "Professional Summary",
  experience:     "Experience",
  education:      "Education",
  skills:         "Technical Skills",
  projects:       "Projects",
  certifications: "Certifications",
  languages:      "Languages",
  custom:         "Additional",
};

function visibleSections(resume: Resume): ResumeSection[] {
  return [...resume.sections]
    .filter((s) => s.isVisible)
    .sort((a, b) => a.order - b.order);
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "resume";
}

function texEscape(s: string): string {
  return s
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/&/g,  "\\&")
    .replace(/%/g,  "\\%")
    .replace(/\$/g, "\\$")
    .replace(/#/g,  "\\#")
    .replace(/_/g,  "\\_")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/~/g,  "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}

function downloadText(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  downloadBlob(blob, filename, mime);
}

function downloadBlob(blob: Blob, filename: string, _mime: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
