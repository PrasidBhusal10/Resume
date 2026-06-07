"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Sparkles, ChevronDown, CheckCircle, XCircle, Loader2, AlertCircle } from "lucide-react";
import { useResumeStore } from "@/store/resumeStore";
import { useLocalResumeStore } from "@/store/localResumeStore";
import { atsScoreColor, atsScoreBg, cn } from "@/lib/utils";
import type { SectionType, SectionSuggestion } from "@/lib/types";
import SectionDiff from "@/components/SectionDiff";

const OPTIMIZABLE_SECTIONS: { type: SectionType; label: string }[] = [
  { type: "summary",    label: "Professional Summary" },
  { type: "experience", label: "Work Experience" },
  { type: "skills",     label: "Skills" },
  { type: "projects",   label: "Projects" },
];

type Step = "input" | "analyzed" | "optimizing" | "results";

interface ExtractedJD {
  required_skills:  string[];
  nice_to_have:     string[];
  keywords:         string[];
  ats_keywords:     string[];
  seniority:        string;
  industry:         string;
  responsibilities: string[];
  summary:          string;
}

export default function JDAnalyzer({ resumeId }: { resumeId: number }) {
  const [rawText,          setRawText]          = useState("");
  const [company,          setCompany]          = useState("");
  const [jobTitle,         setJobTitle]         = useState("");
  const [step,             setStep]             = useState<Step>("input");
  const [extracted,        setExtracted]        = useState<ExtractedJD | null>(null);
  const [selectedSections, setSelectedSections] = useState<SectionType[]>(["summary", "experience", "skills"]);
  const [loading,          setLoading]          = useState(false);
  const [error,            setError]            = useState<string | null>(null);

  const { suggestions, setSuggestions, applySuggestion } = useResumeStore();
  const getResume = useLocalResumeStore((s) => s.getResume);

  // ── Step 1: Extract JD via AI ─────────────────────────────────────────────
  async function handleAnalyze() {
    if (rawText.length < 50) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/extract-jd", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ raw_text: rawText, company, job_title: jobTitle }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? data.error ?? `HTTP ${res.status}`);
      setExtracted(data as ExtractedJD);
      setStep("analyzed");
      toast.success("Job description analyzed!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
      toast.error("Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2: Optimize selected sections ───────────────────────────────────
  async function handleOptimize() {
    if (!extracted || selectedSections.length === 0) return;
    setLoading(true);
    setStep("optimizing");
    setError(null);

    // Build current_sections from the local resume store
    const resume = getResume(resumeId);
    const currentSections = (resume?.sections ?? [])
      .filter((s) => selectedSections.includes(s.sectionType))
      .map((s) => ({ type: s.sectionType, content: s.content }));

    try {
      const res = await fetch("/api/ai/optimize", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          jd_raw_text:          rawText,
          jd_extracted:         extracted,
          sections_to_optimize: selectedSections.map((s) => ({ section_type: s })),
          current_sections:     currentSections,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? data.error ?? `HTTP ${res.status}`);
      setSuggestions(data.suggestions ?? []);
      setStep("results");
      toast.success(`Done! Overall ATS score: ${data.overall_score}%`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
      setStep("analyzed"); // go back so user can retry
      toast.error("Optimization failed");
    } finally {
      setLoading(false);
    }
  }

  const toggleSection = (type: SectionType) =>
    setSelectedSections((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );

  const reset = () => {
    setStep("input");
    setExtracted(null);
    setError(null);
    setRawText("");
    setCompany("");
    setJobTitle("");
    setSuggestions([]);
  };

  return (
    <div className="h-full flex flex-col">

      {/* Header */}
      <div className="p-4 border-b border-surface-border flex-shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-brand-600" />
          <h2 className="text-sm font-semibold text-neutral-900">AI Optimizer</h2>
        </div>
        <p className="text-xs text-neutral-900/40">Paste a job description to tailor your resume</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Error banner */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-0.5">Error</p>
              <p className="text-red-600 break-words">{error}</p>
            </div>
          </div>
        )}

        {/* ── Step: Input ─────────────────────────────────────────────────── */}
        {step === "input" && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">Company</label>
                <input className="input text-sm" placeholder="Google"
                       value={company} onChange={(e) => setCompany(e.target.value)} />
              </div>
              <div>
                <label className="label">Job Title</label>
                <input className="input text-sm" placeholder="Software Engineer"
                       value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="label">Job Description</label>
              <textarea
                className="input resize-none text-sm font-mono"
                rows={12}
                placeholder="Paste the full job description here…"
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
              />
              <p className="text-xs text-neutral-900/30 mt-1">{rawText.length} characters</p>
            </div>

            <button
              className="btn-primary w-full justify-center"
              disabled={rawText.length < 50 || loading}
              onClick={handleAnalyze}>
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing…</>
                : <><Sparkles className="w-4 h-4" /> Analyze Job Description</>}
            </button>
          </>
        )}

        {/* ── Step: Analyzed — pick sections ──────────────────────────────── */}
        {(step === "analyzed" || step === "optimizing") && extracted && (
          <>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <p className="text-xs font-semibold text-emerald-700 mb-2">JD Analyzed ✓</p>
              <div className="flex flex-wrap gap-1 mb-2">
                {extracted.required_skills.slice(0, 8).map((skill) => (
                  <span key={skill} className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full">
                    {skill}
                  </span>
                ))}
              </div>
              <p className="text-xs text-emerald-600">
                Seniority: <strong>{extracted.seniority}</strong>
                {" · "}Industry: <strong>{extracted.industry}</strong>
              </p>
            </div>

            <div>
              <label className="label mb-2">Select sections to optimize</label>
              <div className="space-y-2">
                {OPTIMIZABLE_SECTIONS.map(({ type, label }) => (
                  <label key={type}
                         className="flex items-center gap-3 p-3 rounded-xl border border-surface-border
                                    bg-white cursor-pointer hover:bg-neutral-50 transition">
                    <input
                      type="checkbox"
                      className="accent-brand-600"
                      checked={selectedSections.includes(type)}
                      onChange={() => toggleSection(type)}
                    />
                    <span className="text-sm text-neutral-900/80">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              className="btn-primary w-full justify-center"
              disabled={selectedSections.length === 0 || loading}
              onClick={handleOptimize}>
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Optimizing with AI…</>
                : <><Sparkles className="w-4 h-4" /> Optimize {selectedSections.length} Section{selectedSections.length !== 1 ? "s" : ""}</>}
            </button>

            <button className="btn-secondary w-full justify-center text-sm" onClick={reset}>
              ← Start over
            </button>
          </>
        )}

        {/* ── Step: Results ────────────────────────────────────────────────── */}
        {step === "results" && suggestions.length > 0 && (
          <>
            <div className="bg-brand-50 border border-brand-100 rounded-xl p-3 text-center">
              <p className="text-xs text-brand-700 font-medium">Review AI suggestions below</p>
              <p className="text-xs text-brand-500 mt-0.5">Accept or reject each section independently</p>
            </div>

            <div className="space-y-4">
              {suggestions.map((sug, i) => (
                <SuggestionCard
                  key={i}
                  suggestion={sug}
                  onAccept={() => {
                    applySuggestion(sug.section_type as SectionType, sug.suggested);
                    toast.success(`${sug.section_type} applied!`);
                  }}
                  onReject={() => toast("Kept original")}
                />
              ))}
            </div>

            <button className="btn-secondary w-full justify-center text-sm" onClick={reset}>
              Start Over
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Suggestion card ───────────────────────────────────────────────────────────
function SuggestionCard({
  suggestion, onAccept, onReject,
}: {
  suggestion: SectionSuggestion;
  onAccept:   () => void;
  onReject:   () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-surface-border overflow-hidden bg-white">
      <div className="flex items-center justify-between p-3">
        <div>
          <p className="text-sm font-semibold text-neutral-900 capitalize">{suggestion.section_type}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={cn("ats-pill", atsScoreBg(suggestion.ats_before))}>
              <span className={atsScoreColor(suggestion.ats_before)}>{suggestion.ats_before}%</span>
            </span>
            <span className="text-xs text-neutral-900/30">→</span>
            <span className={cn("ats-pill", atsScoreBg(suggestion.ats_after))}>
              <span className={atsScoreColor(suggestion.ats_after)}>{suggestion.ats_after}%</span>
            </span>
          </div>
        </div>
        <button onClick={() => setOpen((v) => !v)}
                className="text-neutral-900/30 hover:text-neutral-900/60 transition">
          <ChevronDown className={cn("w-4 h-4 transition-transform", open && "rotate-180")} />
        </button>
      </div>

      <div className="px-3 pb-3">
        <p className="text-xs text-neutral-900/50">{suggestion.diff_summary}</p>
        <ul className="mt-2 space-y-1">
          {suggestion.changes.slice(0, 3).map((change, i) => (
            <li key={i} className="text-xs text-neutral-900/60 flex items-start gap-1.5">
              <span className="text-emerald-500 mt-0.5 flex-shrink-0">+</span>
              {change}
            </li>
          ))}
        </ul>
      </div>

      {open && (
        <div className="border-t border-surface-border">
          <SectionDiff original={suggestion.original} suggested={suggestion.suggested} />
        </div>
      )}

      <div className="flex gap-2 p-3 border-t border-surface-border bg-neutral-50/60">
        <button onClick={onAccept}
                className="btn-primary flex-1 justify-center text-xs py-2">
          <CheckCircle className="w-3.5 h-3.5" /> Accept
        </button>
        <button onClick={onReject}
                className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs py-2
                           rounded-full border border-red-200 text-red-500 hover:bg-red-50 transition">
          <XCircle className="w-3.5 h-3.5" /> Reject
        </button>
      </div>
    </div>
  );
}
