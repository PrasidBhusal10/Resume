"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useLocalResumeStore } from "@/store/localResumeStore";
import { useResumeStore } from "@/store/resumeStore";
import ResumeEditor from "@/components/ResumeEditor";
import JDAnalyzer from "@/components/JDAnalyzer";
import ExportPanel from "@/components/ExportPanel";
import ResumePreview from "@/components/ResumePreview";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

export default function EditorPage() {
  const params = useParams<{ id: string }>();
  const id     = Number(params.id);

  const resume              = useLocalResumeStore((s) => s.resumes.find((r) => r.id === id));
  const { setActiveResume } = useResumeStore();

  useEffect(() => {
    if (resume) setActiveResume(resume);
    return () => setActiveResume(null);
  }, [resume, setActiveResume]);

  if (!resume) {
    return (
      <div className="min-h-screen bg-mesh flex items-center justify-center">
        <div className="text-center">
          <p className="text-neutral-900/40 font-light mb-6 text-lg">Resume not found</p>
          <Link href="/dashboard" className="btn-primary">← Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-neutral-100">

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-surface-border sticky top-0 z-20 flex-shrink-0">
        <div className="px-4 h-13 flex items-center justify-between" style={{ height: "52px" }}>

          <div className="flex items-center gap-3">
            <Link href="/dashboard"
                  className="w-8 h-8 rounded-full border border-surface-border flex items-center
                             justify-center text-neutral-900/40 hover:text-neutral-900 hover:border-neutral-900/20 transition-all">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="w-px h-4 bg-surface-border" />
            <span className="text-sm font-semibold text-neutral-900 tracking-tight truncate max-w-xs">
              {resume.title}
            </span>
          </div>

          <ExportPanel resumeId={id} />
        </div>
      </header>

      {/* ── 3-column layout ──────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: Section editor */}
        <aside className="w-[17rem] bg-white border-r border-surface-border overflow-y-auto flex-shrink-0">
          <ErrorBoundary>
            <ResumeEditor resume={resume} />
          </ErrorBoundary>
        </aside>

        {/* Center: Live preview */}
        <main className="flex-1 overflow-y-auto p-8 bg-neutral-100">
          <ErrorBoundary>
            <ResumePreview resume={resume} />
          </ErrorBoundary>
        </main>

        {/* Right: AI optimizer */}
        <aside className="w-[22rem] bg-white border-l border-surface-border overflow-y-auto flex-shrink-0">
          <ErrorBoundary>
            <JDAnalyzer resumeId={id} />
          </ErrorBoundary>
        </aside>

      </div>
    </div>
  );
}
