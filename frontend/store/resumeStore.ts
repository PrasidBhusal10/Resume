import { create } from "zustand";
import type { Resume, SectionSuggestion, SectionType, SectionContent } from "@/lib/types";

interface ResumeStore {
  // Active resume being edited
  activeResume:    Resume | null;
  setActiveResume: (r: Resume | null) => void;

  // JD optimization state
  jdId:            number | null;
  setJdId:         (id: number | null) => void;
  suggestions:     SectionSuggestion[];
  setSuggestions:  (s: SectionSuggestion[]) => void;
  clearSuggestions: () => void;

  // UI state
  activeSection:    SectionType | null;
  setActiveSection: (s: SectionType | null) => void;

  // Apply an accepted suggestion locally (optimistic update)
  applySuggestion: (sectionType: SectionType, suggestedContent: unknown) => void;
}

export const useResumeStore = create<ResumeStore>((set, get) => ({
  activeResume:    null,
  setActiveResume: (r) => set({ activeResume: r }),

  jdId:    null,
  setJdId: (id) => set({ jdId: id }),

  suggestions:     [],
  setSuggestions:  (s) => set({ suggestions: s }),
  clearSuggestions: () => set({ suggestions: [] }),

  activeSection:    null,
  setActiveSection: (s) => set({ activeSection: s }),

  applySuggestion: (sectionType, suggestedContent) => {
    const resume = get().activeResume;
    if (!resume) return;
    const updated = {
      ...resume,
      sections: resume.sections.map((sec) =>
        sec.sectionType === sectionType
          ? { ...sec, content: suggestedContent as typeof sec.content }
          : sec
      ),
    };
    set({ activeResume: updated });
    // Persist to local store so the change survives navigation
    const { useLocalResumeStore } = require("@/store/localResumeStore");
    useLocalResumeStore.getState().updateSection(
      resume.id, sectionType, { content: suggestedContent as SectionContent }
    );
  },
}));
