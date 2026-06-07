"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Download, Loader2, FileText, FileType, Code2 } from "lucide-react";
import { exportPDF, exportLaTeX, exportDOCX } from "@/lib/exportResume";
import { useLocalResumeStore } from "@/store/localResumeStore";

const FORMATS = [
  { format: "pdf",  label: "PDF",   icon: <FileText className="w-4 h-4" />, desc: "Best for sending" },
  { format: "docx", label: "DOCX",  icon: <FileType className="w-4 h-4" />, desc: "Editable in Word" },
  { format: "tex",  label: "LaTeX", icon: <Code2 className="w-4 h-4" />,   desc: "For academics" },
] as const;

type Format = "pdf" | "docx" | "tex";

// Contact info defaults — user can extend this later
const USER = {
  name:     "Your Name",
  email:    "email@example.com",
  phone:    "+1 555 0000",
  location: "City, State",
};

export default function ExportPanel({ resumeId }: { resumeId: number }) {
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState<Format | null>(null);
  const getResume = useLocalResumeStore((s) => s.getResume);

  async function handleExport(format: Format) {
    const resume = getResume(resumeId);
    if (!resume) { toast.error("Resume not found"); return; }

    setLoading(format);
    try {
      if (format === "pdf") {
        exportPDF(resume, USER.name, USER.email, USER.phone, USER.location);
        toast.success("Print dialog opened — save as PDF");
      } else if (format === "tex") {
        exportLaTeX(resume, USER.name, USER.email, USER.phone, USER.location);
        toast.success("LaTeX file downloaded!");
      } else {
        await exportDOCX(resume, USER.name, USER.email, USER.phone, USER.location);
        toast.success("DOCX file downloaded!");
      }
      setOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Export failed — check the console");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="btn-primary text-sm">
        <Download className="w-4 h-4" />
        Export
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />

          <div className="absolute right-0 top-full mt-2 z-40 w-56 bg-white rounded-2xl
                          border border-surface-border shadow-xl overflow-hidden animate-fade-in">
            <div className="px-4 py-3 border-b border-surface-border">
              <p className="text-xs font-semibold text-neutral-900/60">Download Resume As</p>
            </div>

            {FORMATS.map(({ format, label, icon, desc }) => (
              <button
                key={format}
                onClick={() => handleExport(format)}
                disabled={loading !== null}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-50
                           transition disabled:opacity-50 text-left">
                <div className="w-8 h-8 bg-neutral-100 rounded-lg flex items-center
                                justify-center text-neutral-900/60 flex-shrink-0">
                  {loading === format
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : icon}
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-900">{label}</p>
                  <p className="text-xs text-neutral-900/40">{desc}</p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
