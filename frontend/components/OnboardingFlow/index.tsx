"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, FileText, Target, Download,
  ChevronRight, ChevronLeft, Check,
} from "lucide-react";
import { templates as templateApi, resumes } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Template } from "@/lib/types";

const STEPS = [
  {
    id: "welcome",
    title: "Welcome to ResumeAI",
    subtitle: "Get a job-winning resume in 3 steps",
    icon: <Sparkles className="w-8 h-8 text-brand-600" />,
  },
  {
    id: "template",
    title: "Pick your template",
    subtitle: "All templates are ATS-optimized",
    icon: <FileText className="w-8 h-8 text-brand-600" />,
  },
  {
    id: "ready",
    title: "You're all set!",
    subtitle: "Start editing and paste a JD to optimize",
    icon: <Target className="w-8 h-8 text-green-600" />,
  },
] as const;

interface Props {
  onComplete?: () => void;
}

export default function OnboardingFlow({ onComplete }: Props) {
  const router           = useRouter();
  const [step, setStep]  = useState(0);
  const [picked, setPicked] = useState<number | null>(null);

  const { data: templateList } = useQuery({
    queryKey: ["templates"],
    queryFn:  () => templateApi.list().then((r) => r.data),
    enabled:  step === 1,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      resumes.create({ templateId: picked!, title: "My First Resume" }),
    onSuccess: (res) => {
      toast.success("Resume created! Let's build it.");
      router.push(`/editor/${res.data.id}`);
      onComplete?.();
    },
    onError: () => toast.error("Something went wrong"),
  });

  const canNext = step === 1 ? picked !== null : true;

  const handleNext = () => {
    if (step === STEPS.length - 1) {
      createMutation.mutate();
    } else {
      setStep((s) => s + 1);
    }
  };

  const handleBack = () => setStep((s) => Math.max(0, s - 1));

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden">

        {/* Progress bar */}
        <div className="h-1 bg-slate-100">
          <div
            className="h-full bg-brand-600 transition-all duration-500"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-6 pt-6 px-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                i < step  ? "bg-brand-600 text-white" :
                i === step ? "bg-brand-600 text-white ring-4 ring-brand-100" :
                             "bg-slate-100 text-slate-400"
              )}>
                {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn(
                  "w-12 h-px transition-colors",
                  i < step ? "bg-brand-600" : "bg-slate-200"
                )} />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="p-8">

            {/* Step 0: Welcome */}
            {step === 0 && <WelcomeStep />}

            {/* Step 1: Template picker */}
            {step === 1 && (
              <TemplatePickerStep
                templates={templateList ?? []}
                selected={picked}
                onSelect={setPicked}
              />
            )}

            {/* Step 2: Ready */}
            {step === 2 && <ReadyStep />}

          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between px-8 pb-8">
          <button
            onClick={handleBack}
            disabled={step === 0}
            className="btn-secondary text-sm disabled:opacity-0">
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          <button
            onClick={handleNext}
            disabled={!canNext || createMutation.isPending}
            className="btn-primary text-sm px-6">
            {createMutation.isPending ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating…
              </span>
            ) : step === STEPS.length - 1 ? (
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Start Editing
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Next
                <ChevronRight className="w-4 h-4" />
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Step components ───────────────────────────────────────────────────────────

function WelcomeStep() {
  const features = [
    { icon: <FileText className="w-4 h-4 text-brand-600" />,  text: "4 professional LaTeX templates" },
    { icon: <Sparkles className="w-4 h-4 text-purple-600" />, text: "AI rewrites sections to match any job" },
    { icon: <Download className="w-4 h-4 text-green-600" />,  text: "Export as PDF, DOCX, or LaTeX" },
  ];

  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <Sparkles className="w-8 h-8 text-brand-600" />
      </div>
      <h2 className="text-2xl font-bold text-slate-800 mb-2">Welcome to ResumeAI</h2>
      <p className="text-slate-500 mb-8">Get a tailored, job-winning resume in minutes.</p>

      <div className="space-y-3 text-left max-w-xs mx-auto">
        {features.map((f, i) => (
          <div key={i} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
              {f.icon}
            </div>
            <span className="text-sm text-slate-700 font-medium">{f.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TemplatePickerStep({
  templates, selected, onSelect,
}: {
  templates: Template[];
  selected:  number | null;
  onSelect:  (id: number) => void;
}) {
  const COLORS: Record<string, string> = {
    modern:   "bg-brand-500",
    classic:  "bg-slate-600",
    minimal:  "bg-slate-400",
    creative: "bg-violet-500",
    ats:      "bg-teal-500",
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-800 mb-1">Choose a Template</h2>
      <p className="text-slate-500 text-sm mb-5">You can change this anytime.</p>

      <div className="grid grid-cols-2 gap-3">
        {templates.slice(0, 4).map((t) => (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            className={cn(
              "relative rounded-2xl border-2 overflow-hidden text-left transition-all group",
              selected === t.id
                ? "border-brand-600 shadow-lg shadow-brand-100"
                : "border-surface-border hover:border-brand-300"
            )}>
            {/* Mini mockup */}
            <div className="h-28 bg-white p-3">
              <div className={cn("h-2 w-2/3 rounded mb-1.5", COLORS[t.category] ?? "bg-slate-500")} />
              <div className="h-1 w-4/5 bg-slate-200 rounded mb-3" />
              <div className="space-y-1">
                <div className="h-1 bg-slate-100 rounded w-full" />
                <div className="h-1 bg-slate-100 rounded w-5/6" />
                <div className="h-1 bg-slate-100 rounded w-4/6" />
              </div>
            </div>

            <div className="px-3 py-2 border-t border-surface-border bg-white flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-800">{t.name}</p>
                <p className="text-xs text-slate-400 capitalize">{t.category}</p>
              </div>
              {selected === t.id && (
                <div className="w-5 h-5 bg-brand-600 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ReadyStep() {
  return (
    <div className="text-center py-4">
      <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <Target className="w-8 h-8 text-green-600" />
      </div>
      <h2 className="text-2xl font-bold text-slate-800 mb-2">Ready to build!</h2>
      <p className="text-slate-500 mb-8 max-w-sm mx-auto">
        Fill in your details, paste a job description, and let AI do the heavy lifting.
      </p>
      <div className="flex flex-col gap-2 text-sm text-slate-600 max-w-xs mx-auto text-left">
        {[
          "① Fill in your experience and skills",
          "② Paste a job description on the right panel",
          "③ Accept AI suggestions → download",
        ].map((step) => (
          <div key={step} className="bg-slate-50 rounded-xl px-4 py-2.5 font-medium">
            {step}
          </div>
        ))}
      </div>
    </div>
  );
}
