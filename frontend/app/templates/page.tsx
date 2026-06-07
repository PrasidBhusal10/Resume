"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { TEMPLATES } from "@/lib/templates";
import { useLocalResumeStore } from "@/store/localResumeStore";

const PREVIEW_COLORS: Record<string, { bg: string; accent: string; text: string }> = {
  modern:   { bg: "#3b82f6", accent: "#dbeafe", text: "#1e40af" },
  classic:  { bg: "#334155", accent: "#e2e8f0", text: "#1e293b" },
  minimal:  { bg: "#f8fafc", accent: "#e2e8f0", text: "#0f172a" },
  jake:     { bg: "#ffffff", accent: "#000000", text: "#000000" },
};

export default function TemplatesPage() {
  const router    = useRouter();
  const addResume = useLocalResumeStore((s) => s.addResume);

  const handleUse = (templateId: number) => {
    const tpl    = TEMPLATES.find((t) => t.id === templateId)!;
    const resume = addResume(`${tpl.name} Resume`, templateId);
    router.push(`/editor/${resume.id}`);
  };

  return (
    <div className="min-h-screen bg-mesh">

      {/* Nav */}
      <header className="bg-white/70 backdrop-blur-xl border-b border-neutral-900/8 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-4">
          <Link href="/dashboard"
                className="w-8 h-8 rounded-full border border-neutral-900/12 flex items-center
                           justify-center text-neutral-900/40 hover:text-neutral-900 hover:border-neutral-900/20 transition-all">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="font-semibold text-neutral-900 tracking-tight">Templates</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-14">

        {/* Heading */}
        <div className="mb-12">
          <h1 className="text-4xl font-light text-neutral-900 mb-3">
            Choose your <span className="font-extrabold italic">style</span>
          </h1>
          <p className="text-neutral-900/50 text-lg font-light max-w-lg">
            All templates export to PDF, DOCX, and LaTeX. ATS-compatible by design.
          </p>
        </div>

        {/* Template grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {TEMPLATES.map((tpl) => {
            const colors = PREVIEW_COLORS[tpl.category] ?? PREVIEW_COLORS.modern;
            return (
              <div key={tpl.id}
                   className="group bg-white rounded-2xl border border-neutral-900/8 overflow-hidden
                              hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">

                {/* Thumbnail */}
                <div className="relative h-44 overflow-hidden"
                     style={{ backgroundColor: colors.accent }}>
                  <TemplateThumbnail category={tpl.category} colors={colors} />

                  {/* Jake badge */}
                  {tpl.category === "jake" && (
                    <div className="absolute top-2 right-2 bg-amber-100 text-amber-700 text-2xs
                                    font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Popular
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="font-bold text-neutral-900 text-sm mb-1">{tpl.name}</h3>
                  <p className="text-neutral-900/50 text-xs leading-relaxed flex-1 mb-4">
                    {tpl.description}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {tpl.tags.map((tag) => (
                      <span key={tag}
                            className="text-2xs font-medium px-2 py-0.5 bg-neutral-100 text-neutral-900/50 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleUse(tpl.id)}
                    className="w-full btn-primary text-sm py-2.5 group-hover:bg-neutral-800 transition-colors">
                    Use this template →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

// ── Tiny thumbnail sketch of each template ────────────────────────────────────
function TemplateThumbnail({
  category, colors,
}: {
  category: string;
  colors: { bg: string; accent: string; text: string };
}) {
  if (category === "jake") {
    return (
      <div className="p-4 h-full flex flex-col gap-2">
        <div className="text-center mb-1">
          <div className="h-2.5 bg-neutral-900 rounded-sm mx-auto mb-1" style={{ width: "55%" }} />
          <div className="h-1.5 bg-neutral-400 rounded-sm mx-auto" style={{ width: "70%" }} />
        </div>
        {["EDUCATION", "EXPERIENCE", "PROJECTS", "SKILLS"].map((label) => (
          <div key={label}>
            <div className="flex items-center gap-1 mb-1">
              <span className="text-2xs font-black text-neutral-900" style={{ fontSize: "5px" }}>{label}</span>
              <div className="flex-1 h-px bg-neutral-900" />
            </div>
            <div className="h-1 bg-neutral-200 rounded-sm mb-0.5 w-full" />
            <div className="h-1 bg-neutral-200 rounded-sm w-4/5" />
          </div>
        ))}
      </div>
    );
  }

  if (category === "minimal") {
    return (
      <div className="p-4 h-full flex flex-col gap-2">
        <div className="border-b-2 border-neutral-900 pb-2 mb-1">
          <div className="h-3 bg-neutral-900 rounded-sm mb-1.5" style={{ width: "45%" }} />
          <div className="h-1.5 bg-neutral-300 rounded-sm" style={{ width: "65%" }} />
        </div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-1">
            <div className="h-1.5 bg-neutral-200 rounded-sm" style={{ width: `${70 - i * 8}%` }} />
            <div className="h-1 bg-neutral-100 rounded-sm" style={{ width: `${85 - i * 5}%` }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3" style={{ backgroundColor: colors.bg }}>
        <div className="h-3 bg-white/40 rounded-sm mb-1.5" style={{ width: "50%" }} />
        <div className="h-1.5 bg-white/25 rounded-sm" style={{ width: "70%" }} />
      </div>
      <div className="flex-1 p-4 space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-1">
            <div className="h-1.5 rounded-sm" style={{ backgroundColor: colors.text, opacity: 0.15, width: `${60 - i * 5}%` }} />
            <div className="h-1 bg-neutral-200 rounded-sm" style={{ width: `${80 - i * 8}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}
