"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Check, Lock, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { resumes } from "@/lib/api";
import type { Template } from "@/lib/types";

type Category = "all" | "modern" | "classic" | "minimal" | "creative" | "ats";

const CATEGORY_LABELS: Record<Category, string> = {
  all:      "All Templates",
  modern:   "Modern",
  classic:  "Classic",
  minimal:  "Minimal",
  creative: "Creative",
  ats:      "ATS-Friendly",
};

interface Props {
  templates:   Template[];
  onSelect?:   (templateId: number) => void;
  mode?:       "page" | "inline";  // page = navigate, inline = callback
}

export default function TemplateGallery({ templates, onSelect, mode = "page" }: Props) {
  const router              = useRouter();
  const [filter, setFilter] = useState<Category>("all");
  const [selected, setSelected] = useState<number | null>(null);

  const createMutation = useMutation({
    mutationFn: (templateId: number) =>
      resumes.create({ templateId, title: "My Resume" }),
    onSuccess: (res) => {
      toast.success("Resume created!");
      router.push(`/editor/${res.data.id}`);
    },
    onError: () => toast.error("Failed to create resume"),
  });

  const filtered = filter === "all"
    ? templates
    : templates.filter((t) => t.category === filter);

  const handlePick = (t: Template) => {
    if (t.isPremium) { toast("Premium templates coming soon!", { icon: "💎" }); return; }
    setSelected(t.id);
    if (mode === "inline" && onSelect) {
      onSelect(t.id);
    } else {
      createMutation.mutate(t.id);
    }
  };

  const categories = ["all", ...new Set(templates.map((t) => t.category))] as Category[];

  return (
    <div>
      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-8">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium transition",
              filter === cat
                ? "bg-brand-600 text-white shadow-sm"
                : "bg-white border border-surface-border text-slate-600 hover:bg-slate-50"
            )}>
            {CATEGORY_LABELS[cat] ?? cat}
          </button>
        ))}
      </div>

      {/* Template grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filtered.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            isSelected={selected === template.id}
            isLoading={createMutation.isPending && selected === template.id}
            onPick={() => handlePick(template)}
          />
        ))}
      </div>
    </div>
  );
}

// ── Individual template card with CSS resume mockup ───────────────────────────
function TemplateCard({
  template, isSelected, isLoading, onPick,
}: {
  template:   Template;
  isSelected: boolean;
  isLoading:  boolean;
  onPick:     () => void;
}) {
  return (
    <div
      onClick={onPick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onPick()}
      aria-label={`Select ${template.name} template`}
      className={cn(
        "group relative rounded-2xl border-2 overflow-hidden cursor-pointer transition-all",
        "hover:shadow-xl hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-brand-500",
        isSelected
          ? "border-brand-600 shadow-lg shadow-brand-100"
          : "border-surface-border hover:border-brand-300"
      )}>

      {/* Premium badge */}
      {template.isPremium && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-amber-400
                        text-amber-900 text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">
          <Lock className="w-2.5 h-2.5" />
          Pro
        </div>
      )}

      {/* Selected checkmark */}
      {isSelected && !isLoading && (
        <div className="absolute top-3 left-3 z-10 w-6 h-6 bg-brand-600 rounded-full
                        flex items-center justify-center shadow-sm">
          <Check className="w-3.5 h-3.5 text-white" />
        </div>
      )}

      {/* CSS Resume Mockup */}
      <div className="h-52 bg-white overflow-hidden p-4 border-b border-surface-border">
        <ResumeMockup template={template} />
      </div>

      {/* Card footer */}
      <div className="bg-white px-4 py-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 group-hover:text-brand-600 transition">
            {template.name}
          </h3>
          <p className="text-xs text-slate-400 capitalize mt-0.5">{template.category}</p>
        </div>
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center transition",
          isSelected
            ? "bg-brand-600 text-white"
            : "bg-brand-50 text-brand-600 opacity-0 group-hover:opacity-100"
        )}>
          {isLoading
            ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            : <ArrowRight className="w-4 h-4" />
          }
        </div>
      </div>
    </div>
  );
}

// ── CSS-only resume preview — varies per template style ───────────────────────
function ResumeMockup({ template }: { template: Template }) {
  const style = getMockupStyle(template.category);

  return (
    <div className="w-full h-full relative overflow-hidden" style={{ transform: "scale(0.85)", transformOrigin: "top left", width: "118%" }}>
      {/* Name block */}
      <div className={cn("mb-2", style.nameBlock)}>
        <div className={cn("h-3 rounded mb-1", style.nameLine)} style={{ width: "60%" }} />
        <div className="h-1.5 bg-slate-200 rounded" style={{ width: "80%" }} />
      </div>

      {/* Divider */}
      <div className={cn("h-px mb-3", style.divider)} />

      {/* Section: Experience */}
      <div className="mb-3">
        <div className={cn("h-2 rounded mb-2", style.sectionLabel)} style={{ width: "30%" }} />
        <div className="space-y-1">
          <div className="h-1.5 bg-slate-200 rounded" style={{ width: "95%" }} />
          <div className="h-1.5 bg-slate-100 rounded" style={{ width: "88%" }} />
          <div className="h-1.5 bg-slate-100 rounded" style={{ width: "72%" }} />
        </div>
      </div>

      {/* Section: Skills */}
      <div className="mb-3">
        <div className={cn("h-2 rounded mb-2", style.sectionLabel)} style={{ width: "20%" }} />
        <div className="flex flex-wrap gap-1">
          {[42, 56, 38, 64, 48].map((w, i) => (
            <div key={i} className={cn("h-1.5 rounded-full", style.skillPill)} style={{ width: w }} />
          ))}
        </div>
      </div>

      {/* Section: Education */}
      <div>
        <div className={cn("h-2 rounded mb-2", style.sectionLabel)} style={{ width: "25%" }} />
        <div className="h-1.5 bg-slate-200 rounded" style={{ width: "70%" }} />
        <div className="h-1.5 bg-slate-100 rounded mt-1" style={{ width: "50%" }} />
      </div>
    </div>
  );
}

function getMockupStyle(category: string) {
  switch (category) {
    case "modern":
      return {
        nameBlock:    "text-left",
        nameLine:     "bg-brand-600",
        divider:      "bg-brand-200",
        sectionLabel: "bg-brand-500",
        skillPill:    "bg-brand-100",
      };
    case "classic":
      return {
        nameBlock:    "text-left",
        nameLine:     "bg-slate-700",
        divider:      "bg-slate-300",
        sectionLabel: "bg-slate-600",
        skillPill:    "bg-slate-200",
      };
    case "minimal":
      return {
        nameBlock:    "text-left",
        nameLine:     "bg-slate-900",
        divider:      "bg-slate-100",
        sectionLabel: "bg-slate-400",
        skillPill:    "bg-slate-100",
      };
    case "creative":
      return {
        nameBlock:    "text-left",
        nameLine:     "bg-violet-600",
        divider:      "bg-violet-200",
        sectionLabel: "bg-violet-500",
        skillPill:    "bg-violet-100",
      };
    case "ats":
    default:
      return {
        nameBlock:    "text-left",
        nameLine:     "bg-teal-600",
        divider:      "bg-teal-200",
        sectionLabel: "bg-teal-500",
        skillPill:    "bg-teal-100",
      };
  }
}
