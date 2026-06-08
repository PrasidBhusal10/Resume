"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Eye, EyeOff, Check } from "lucide-react";
import { useLocalResumeStore } from "@/store/localResumeStore";
import type { Resume, ResumeSection, SectionType } from "@/lib/types";
import SectionEditor from "./SectionEditor";
import { TEMPLATES } from "@/lib/templates";

const SECTION_LABELS: Record<SectionType, string> = {
  summary:        "Summary",
  experience:     "Experience",
  education:      "Education",
  skills:         "Skills",
  projects:       "Projects",
  certifications: "Certifications",
  languages:      "Languages",
  custom:         "Custom",
};

type Panel = "sections" | "template";

export default function ResumeEditor({ resume }: { resume: Resume }) {
  const [panel, setPanel]       = useState<Panel>("sections");
  const [expanded, setExpanded] = useState<SectionType | null>("summary");
  const updateSection           = useLocalResumeStore((s) => s.updateSection);
  const updateTemplate          = useLocalResumeStore((s) => s.updateTemplate);

  const toggle = (type: SectionType) => {
    setExpanded(expanded === type ? null : type);
  };

  const toggleVisibility = (sec: ResumeSection) => {
    updateSection(resume.id, sec.sectionType, { isVisible: !sec.isVisible });
  };

  const switchTemplate = (templateId: number) => {
    const tpl = TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    updateTemplate(resume.id, tpl.id, tpl.name, tpl.category);
  };

  return (
    <div className="h-full flex flex-col">

      {/* ── Tab bar ─────────────────────────────────────────────────── */}
      <div className="flex border-b border-surface-border bg-white flex-shrink-0">
        {(["sections", "template"] as Panel[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPanel(p)}
            className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider transition-colors
              ${panel === p
                ? "text-neutral-900 border-b-2 border-neutral-900 -mb-px"
                : "text-neutral-900/35 hover:text-neutral-900/60"}`}>
            {p === "sections" ? "Sections" : "Template"}
          </button>
        ))}
      </div>

      {/* ── Sections panel ──────────────────────────────────────────── */}
      {panel === "sections" && (
        <div className="flex-1 overflow-y-auto">
          {resume.sections
            .sort((a, b) => a.order - b.order)
            .map((sec: ResumeSection) => {
              const isOpen = expanded === sec.sectionType;
              const hidden = !sec.isVisible;
              return (
                <div key={sec.id} className="border-b border-surface-border last:border-0">

                  {/* Header row — div to allow inner button */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => toggle(sec.sectionType)}
                    onKeyDown={(e) => e.key === "Enter" && toggle(sec.sectionType)}
                    className="w-full flex items-center justify-between px-5 py-3.5
                               hover:bg-neutral-50 transition-colors cursor-pointer select-none group">

                    <div className="flex items-center gap-2.5">
                      {isOpen
                        ? <ChevronDown className="w-3.5 h-3.5 text-brand-500" />
                        : <ChevronRight className="w-3.5 h-3.5 text-neutral-900/25" />}
                      <span className={`text-sm font-medium transition-colors
                                       ${hidden ? "text-neutral-900/25" : "text-neutral-900"}`}>
                        {SECTION_LABELS[sec.sectionType]}
                      </span>
                      {hidden && (
                        <span className="text-2xs text-neutral-900/25 font-medium">hidden</span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleVisibility(sec); }}
                      className="p-1.5 rounded-lg text-neutral-900/20 hover:text-neutral-900/50 hover:bg-neutral-100
                                 opacity-0 group-hover:opacity-100 transition-all"
                      title={sec.isVisible ? "Hide" : "Show"}>
                      {sec.isVisible
                        ? <Eye className="w-3.5 h-3.5" />
                        : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Expanded editor */}
                  {isOpen && (
                    <div className="bg-neutral-50/70 border-t border-surface-border px-5 py-4">
                      <SectionEditor resumeId={resume.id} section={sec} />
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {/* ── Template panel ──────────────────────────────────────────── */}
      {panel === "template" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <p className="text-xs text-neutral-900/40 font-medium mb-1">
            Switch template — preview updates instantly
          </p>
          {TEMPLATES.map((tpl) => {
            const active = resume.templateId === tpl.id;
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => switchTemplate(tpl.id)}
                className={`w-full text-left rounded-xl border p-3.5 transition-all
                  ${active
                    ? "border-neutral-900 bg-neutral-50"
                    : "border-surface-border bg-white hover:border-neutral-900/30 hover:bg-neutral-50/50"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className={`text-sm font-semibold mb-0.5 ${active ? "text-neutral-900" : "text-neutral-900/80"}`}>
                      {tpl.name}
                    </p>
                    <p className="text-xs text-neutral-900/40 leading-snug">{tpl.description}</p>
                  </div>
                  {active && (
                    <div className="w-5 h-5 bg-neutral-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {tpl.tags.map((tag) => (
                    <span key={tag} className="text-2xs px-1.5 py-0.5 bg-neutral-100 text-neutral-900/40 rounded-full font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
