"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Resume, ResumeSection, SectionType, SectionContent } from "@/lib/types";

// ── Default starter resume seeded on first visit ──────────────────────────────

function makeDefaultResume(): Resume {
  const now = new Date().toISOString();
  return {
    id:           1,
    title:        "My Resume",
    version:      1,
    templateId:   1,
    templateName: "Modern Clean",
    category:     "modern",
    createdAt:    now,
    updatedAt:    now,
    sections: [
      {
        id: 1, sectionType: "summary", order: 0, isVisible: true,
        content: { text: "Experienced software engineer passionate about building scalable systems." },
      },
      {
        id: 2, sectionType: "experience", order: 1, isVisible: true,
        content: {
          items: [{
            company: "Your Company", role: "Software Engineer",
            start: "Jan 2022", end: "Present",
            bullets: ["Built and maintained production APIs", "Improved system performance by 30%"],
          }],
        },
      },
      {
        id: 3, sectionType: "education", order: 2, isVisible: true,
        content: {
          items: [{
            institution: "University Name", degree: "Bachelor of Science",
            field: "Computer Science", start: "2018", end: "2022", gpa: "",
          }],
        },
      },
      {
        id: 4, sectionType: "skills", order: 3, isVisible: true,
        content: {
          categories: [
            { name: "Languages", items: ["Python", "JavaScript", "TypeScript"] },
            { name: "Tools",     items: ["Git", "Docker", "Linux"] },
          ],
        },
      },
      {
        id: 5, sectionType: "projects", order: 4, isVisible: false,
        content: { items: [] },
      },
    ],
  };
}

// ── Store interface ───────────────────────────────────────────────────────────

interface LocalResumeStore {
  resumes:  Resume[];
  _nextId:  number;

  addResume:      (title?: string, templateId?: number) => Resume;
  removeResume:   (id: number) => void;
  updateSection:  (
    resumeId:    number,
    sectionType: SectionType,
    patch:       { content?: SectionContent; isVisible?: boolean },
  ) => void;
  updateTitle:    (resumeId: number, title: string) => void;
  updateTemplate: (resumeId: number, templateId: number, templateName: string, category: string) => void;
  getResume:      (id: number) => Resume | undefined;
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useLocalResumeStore = create<LocalResumeStore>()(
  persist(
    (set, get) => ({
      resumes:  [makeDefaultResume()],
      _nextId:  2,

      getResume: (id) => get().resumes.find((r) => r.id === id),

      addResume: (title = "New Resume", templateId = 1) => {
        const id    = get()._nextId;
        const now   = new Date().toISOString();
        const blank = makeDefaultResume();
        // Apply chosen template metadata
        const { TEMPLATES } = require("@/lib/templates");
        const tpl = TEMPLATES.find((t: { id: number }) => t.id === templateId) ?? TEMPLATES[0];
        const next: Resume = {
          ...blank, id, title,
          templateId:   tpl.id,
          templateName: tpl.name,
          category:     tpl.category,
          createdAt: now, updatedAt: now,
        };
        next.sections = blank.sections.map((s, i) => ({ ...s, id: id * 100 + i }));
        set((state) => ({ resumes: [...state.resumes, next], _nextId: id + 1 }));
        return next;
      },

      removeResume: (id) =>
        set((state) => ({ resumes: state.resumes.filter((r) => r.id !== id) })),

      updateSection: (resumeId, sectionType, patch) =>
        set((state) => ({
          resumes: state.resumes.map((r) =>
            r.id !== resumeId ? r : {
              ...r,
              updatedAt: new Date().toISOString(),
              sections: r.sections.map((s) =>
                s.sectionType !== sectionType ? s : { ...s, ...patch },
              ),
            },
          ),
        })),

      updateTitle: (resumeId, title) =>
        set((state) => ({
          resumes: state.resumes.map((r) =>
            r.id !== resumeId ? r : { ...r, title, updatedAt: new Date().toISOString() },
          ),
        })),

      updateTemplate: (resumeId, templateId, templateName, category) =>
        set((state) => ({
          resumes: state.resumes.map((r) =>
            r.id !== resumeId ? r : {
              ...r, templateId, templateName, category,
              updatedAt: new Date().toISOString(),
            },
          ),
        })),
    }),
    { name: "resume-ai-local" },
  ),
);
