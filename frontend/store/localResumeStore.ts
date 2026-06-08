"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Resume, ResumeSection, SectionType, SectionContent } from "@/lib/types";
import { dbLoadResumes, dbSaveResume, dbDeleteResume } from "@/lib/resumeDb";

function uuid() {
  return crypto.randomUUID();
}

function makeDefaultResume(): Resume {
  const now = new Date().toISOString();
  return {
    id:           1,
    clientId:     uuid(),
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

interface LocalResumeStore {
  resumes:      Resume[];
  _nextId:      number;
  _currentUser: string | null;

  getResume:      (id: number) => Resume | undefined;
  addResume:      (title?: string, templateId?: number) => Promise<Resume>;
  removeResume:   (id: number) => void;
  updateSection:  (resumeId: number, sectionType: SectionType, patch: { content?: SectionContent; isVisible?: boolean }) => void;
  updateTitle:    (resumeId: number, title: string) => void;
  updateTemplate: (resumeId: number, templateId: number, templateName: string, category: string) => void;
  switchUser:     (userId: string | null) => Promise<void>;
}

export const useLocalResumeStore = create<LocalResumeStore>()(
  persist(
    (set, get) => ({
      resumes:      [makeDefaultResume()],
      _nextId:      2,
      _currentUser: null,

      getResume: (id) => get().resumes.find((r) => r.id === id),

      switchUser: async (userId) => {
        if (get()._currentUser === userId) return;

        if (!userId) {
          set({ resumes: [makeDefaultResume()], _nextId: 2, _currentUser: null });
          return;
        }

        try {
          const dbResumes = await dbLoadResumes(userId);
          if (dbResumes.length > 0) {
            const maxId = Math.max(...dbResumes.map((r) => r.id));
            set({ resumes: dbResumes, _nextId: maxId + 1, _currentUser: userId });
          } else {
            const def = makeDefaultResume();
            const newId = await dbSaveResume(userId, def);
            const saved = { ...def, id: newId };
            set({ resumes: [saved], _nextId: newId + 1, _currentUser: userId });
          }
        } catch (err: unknown) {
          const msg = (err as { message?: string })?.message ?? JSON.stringify(err);
          console.error("Supabase error:", msg);
          set({ resumes: [makeDefaultResume()], _nextId: 2, _currentUser: userId });
        }
      },

      addResume: async (title = "New Resume", templateId = 1) => {
        const localId = get()._nextId;
        const now     = new Date().toISOString();
        const blank   = makeDefaultResume();
        const { TEMPLATES } = require("@/lib/templates");
        const tpl = TEMPLATES.find((t: { id: number }) => t.id === templateId) ?? TEMPLATES[0];
        const next: Resume = {
          ...blank, id: localId, clientId: uuid(), title,
          templateId:   tpl.id,
          templateName: tpl.name,
          category:     tpl.category,
          createdAt: now, updatedAt: now,
        };
        next.sections = blank.sections.map((s, i) => ({ ...s, id: localId * 100 + i }));

        // Optimistically add to local store
        set((state) => ({ resumes: [...state.resumes, next], _nextId: localId + 1 }));

        // Persist to DB if logged in
        const user = get()._currentUser;
        if (user) {
          try {
            const dbId = await dbSaveResume(user, next);
            if (dbId !== localId) {
              // Update with real DB id
              set((state) => ({
                resumes: state.resumes.map((r) => r.id === localId ? { ...r, id: dbId } : r),
              }));
              return { ...next, id: dbId };
            }
          } catch (err) {
            console.error("Failed to save resume to DB:", err);
          }
        }

        return next;
      },

      removeResume: (id) => {
        const resume = get().resumes.find((r) => r.id === id);
        set((state) => ({ resumes: state.resumes.filter((r) => r.id !== id) }));
        const user = get()._currentUser;
        if (user && resume) dbDeleteResume(resume.clientId).catch(console.error);
      },

      updateSection: (resumeId, sectionType, patch) => {
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
        }));
        const user = get()._currentUser;
        const resume = get().resumes.find((r) => r.id === resumeId);
        if (user && resume) dbSaveResume(user, resume).catch(console.error);
      },

      updateTitle: (resumeId, title) => {
        set((state) => ({
          resumes: state.resumes.map((r) =>
            r.id !== resumeId ? r : { ...r, title, updatedAt: new Date().toISOString() },
          ),
        }));
        const user = get()._currentUser;
        const resume = get().resumes.find((r) => r.id === resumeId);
        if (user && resume) dbSaveResume(user, resume).catch(console.error);
      },

      updateTemplate: (resumeId, templateId, templateName, category) => {
        set((state) => ({
          resumes: state.resumes.map((r) =>
            r.id !== resumeId ? r : {
              ...r, templateId, templateName, category,
              updatedAt: new Date().toISOString(),
            },
          ),
        }));
        const user = get()._currentUser;
        const resume = get().resumes.find((r) => r.id === resumeId);
        if (user && resume) dbSaveResume(user, resume).catch(console.error);
      },
    }),
    { name: "resume-ai-local" },
  ),
);
