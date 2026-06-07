"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Plus, Trash2, Save } from "lucide-react";
import { useLocalResumeStore } from "@/store/localResumeStore";
import type {
  ResumeSection, SectionType,
  ExperienceItem, EducationItem, SkillCategory, ProjectItem,
} from "@/lib/types";

interface Props {
  resumeId: number;
  section:  ResumeSection;
}

export default function SectionEditor({ resumeId, section }: Props) {
  const [content, setContent] = useState(section.content);
  const updateSection = useLocalResumeStore((s) => s.updateSection);

  // Sync when parent passes new content (e.g. after AI suggestion accepted)
  useEffect(() => { setContent(section.content); }, [section.content]);

  function handleSave() {
    updateSection(resumeId, section.sectionType, { content });
    toast.success("Saved");
  }

  const type = section.sectionType as SectionType;

  return (
    <div className="space-y-3">
      <SectionForm type={type} content={content} onChange={setContent as (c: unknown) => void} />
      <button
        onClick={handleSave}
        className="btn-primary w-full justify-center text-xs py-2">
        <Save className="w-3.5 h-3.5" />
        Save Changes
      </button>
    </div>
  );
}

// ── Form renderers per section type ──────────────────────────────────────────

function SectionForm({ type, content, onChange }: {
  type: SectionType; content: unknown; onChange: (c: unknown) => void;
}) {
  if (type === "summary") {
    const c = content as { text: string };
    return (
      <textarea
        className="input resize-none text-xs"
        rows={6}
        placeholder="Write your professional summary…"
        value={c.text}
        onChange={(e) => onChange({ text: e.target.value })}
      />
    );
  }

  if (type === "skills") {
    const c = content as { categories: SkillCategory[] };
    const cats = c.categories ?? [];
    return (
      <div className="space-y-3">
        {cats.map((cat, i) => (
          <div key={i} className="border border-surface-border rounded-xl p-3 bg-white space-y-2">
            <input
              className="input text-xs"
              placeholder="Category name (e.g. Languages)"
              value={cat.name}
              onChange={(e) => {
                const next = [...cats];
                next[i] = { ...cat, name: e.target.value };
                onChange({ categories: next });
              }}
            />
            <input
              className="input text-xs"
              placeholder="Comma-separated skills"
              value={cat.items.join(", ")}
              onChange={(e) => {
                const next = [...cats];
                next[i] = { ...cat, items: e.target.value.split(",").map((s) => s.trim()) };
                onChange({ categories: next });
              }}
            />
            <button
              onClick={() => onChange({ categories: cats.filter((_, j) => j !== i) })}
              className="text-xs text-red-500 hover:underline flex items-center gap-1">
              <Trash2 className="w-3 h-3" /> Remove
            </button>
          </div>
        ))}
        <button
          onClick={() => onChange({ categories: [...cats, { name: "", items: [] }] })}
          className="btn-secondary w-full justify-center text-xs py-2">
          <Plus className="w-3.5 h-3.5" /> Add Category
        </button>
      </div>
    );
  }

  if (type === "experience") {
    const c = content as { items: ExperienceItem[] };
    const items = c.items ?? [];
    return (
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="border border-surface-border rounded-xl p-3 bg-white space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input className="input text-xs" placeholder="Job Title"
                     value={item.role} onChange={(e) => {
                       const next = [...items]; next[i] = { ...item, role: e.target.value };
                       onChange({ items: next });
                     }} />
              <input className="input text-xs" placeholder="Company"
                     value={item.company} onChange={(e) => {
                       const next = [...items]; next[i] = { ...item, company: e.target.value };
                       onChange({ items: next });
                     }} />
              <input className="input text-xs" placeholder="Start (e.g. Jan 2022)"
                     value={item.start} onChange={(e) => {
                       const next = [...items]; next[i] = { ...item, start: e.target.value };
                       onChange({ items: next });
                     }} />
              <input className="input text-xs" placeholder="End (or Present)"
                     value={item.end} onChange={(e) => {
                       const next = [...items]; next[i] = { ...item, end: e.target.value };
                       onChange({ items: next });
                     }} />
            </div>
            <div className="space-y-1.5">
              {item.bullets.map((b, j) => (
                <div key={j} className="flex gap-2 items-start">
                  <span className="mt-2 text-slate-400 text-xs">•</span>
                  <input
                    className="input text-xs flex-1"
                    placeholder="Describe what you accomplished…"
                    value={b}
                    onChange={(e) => {
                      const next = [...items];
                      const bullets = [...item.bullets];
                      bullets[j] = e.target.value;
                      next[i] = { ...item, bullets };
                      onChange({ items: next });
                    }}
                  />
                  <button onClick={() => {
                    const next = [...items];
                    next[i] = { ...item, bullets: item.bullets.filter((_, k) => k !== j) };
                    onChange({ items: next });
                  }} className="mt-1.5 text-slate-300 hover:text-red-400 transition">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button onClick={() => {
                const next = [...items];
                next[i] = { ...item, bullets: [...item.bullets, ""] };
                onChange({ items: next });
              }} className="text-xs text-brand-600 hover:underline flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add bullet
              </button>
            </div>
            <button onClick={() => onChange({ items: items.filter((_, j) => j !== i) })}
                    className="text-xs text-red-500 hover:underline flex items-center gap-1">
              <Trash2 className="w-3 h-3" /> Remove position
            </button>
          </div>
        ))}
        <button
          onClick={() => onChange({
            items: [...items, { company: "", role: "", start: "", end: "", bullets: [""] }]
          })}
          className="btn-secondary w-full justify-center text-xs py-2">
          <Plus className="w-3.5 h-3.5" /> Add Position
        </button>
      </div>
    );
  }

  if (type === "education") {
    const c = content as { items: EducationItem[] };
    const items = c.items ?? [];
    return (
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="border border-surface-border rounded-xl p-3 bg-white space-y-2">
            {[
              { key: "institution", label: "Institution" },
              { key: "degree",      label: "Degree" },
              { key: "field",       label: "Field of Study" },
              { key: "start",       label: "Start Year" },
              { key: "end",         label: "End Year" },
              { key: "gpa",         label: "GPA (optional)" },
            ].map(({ key, label }) => (
              <input key={key} className="input text-xs" placeholder={label}
                     value={(item as unknown as Record<string, string>)[key]}
                     onChange={(e) => {
                       const next = [...items];
                       next[i] = { ...item, [key]: e.target.value };
                       onChange({ items: next });
                     }} />
            ))}
            <button onClick={() => onChange({ items: items.filter((_, j) => j !== i) })}
                    className="text-xs text-red-500 hover:underline flex items-center gap-1">
              <Trash2 className="w-3 h-3" /> Remove
            </button>
          </div>
        ))}
        <button
          onClick={() => onChange({
            items: [...items, { institution: "", degree: "", field: "", start: "", end: "", gpa: "" }]
          })}
          className="btn-secondary w-full justify-center text-xs py-2">
          <Plus className="w-3.5 h-3.5" /> Add Education
        </button>
      </div>
    );
  }

  return (
    <p className="text-xs text-slate-400 italic">
      Editor for &ldquo;{type}&rdquo; coming soon.
    </p>
  );
}
