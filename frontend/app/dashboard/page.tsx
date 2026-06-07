"use client";

import { type MouseEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Plus, FileText, Trash2, ArrowRight, Clock, LogOut, User } from "lucide-react";
import { useLocalResumeStore } from "@/store/localResumeStore";
import { useAuthStore } from "@/store/authStore";
import { formatDate } from "@/lib/utils";
import type { ResumeListItem } from "@/lib/types";
import AuthModal from "@/components/AuthModal";

export default function DashboardPage() {
  const router                               = useRouter();
  const { resumes, addResume, removeResume } = useLocalResumeStore();
  const { user, signOut }                    = useAuthStore();
  const [showAuth, setShowAuth]              = useState(false);
  const [showMenu, setShowMenu]              = useState(false);

  function handleCreate() {
    const r = addResume("New Resume");
    router.push(`/editor/${r.id}`);
  }

  function handleDelete(id: number) {
    removeResume(id);
    toast.success("Deleted");
  }

  const resumeList: ResumeListItem[] = resumes.map((r) => ({
    id:           r.id,
    title:        r.title,
    version:      r.version,
    templateName: r.templateName,
    previewUrl:   "",
    createdAt:    r.createdAt,
    updatedAt:    r.updatedAt,
  }));

  return (
    <div className="min-h-screen bg-mesh-subtle">

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 bg-white/70 backdrop-blur-xl border-b border-surface-border">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-base font-bold tracking-tight text-neutral-900">
            resumeai
          </Link>

          <div className="flex items-center gap-2">
            <Link href="/templates" className="btn-ghost text-sm">
              Templates
            </Link>

            <button onClick={handleCreate} className="btn-primary text-sm py-2 px-4">
              <Plus className="w-3.5 h-3.5" />
              New Resume
            </button>

            {/* User area */}
            {user ? (
              <div className="relative ml-1">
                <button
                  onClick={() => setShowMenu((v) => !v)}
                  className="w-8 h-8 rounded-full bg-neutral-900 flex items-center justify-center
                             text-white text-xs font-bold hover:bg-neutral-700 transition-colors">
                  {user.name.charAt(0).toUpperCase()}
                </button>

                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowMenu(false)} />
                    <div className="absolute right-0 top-full mt-2 z-40 w-52 bg-white rounded-2xl
                                    border border-surface-border shadow-xl overflow-hidden">
                      <div className="px-4 py-3 border-b border-surface-border">
                        <p className="text-sm font-semibold text-neutral-900 truncate">{user.name}</p>
                        <p className="text-xs text-neutral-900/40 truncate">{user.email}</p>
                      </div>
                      <button
                        onClick={() => { signOut(); setShowMenu(false); }}
                        className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-500
                                   hover:bg-red-50 transition-colors">
                        <LogOut className="w-3.5 h-3.5" />
                        Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="ml-1 w-8 h-8 rounded-full border border-neutral-900/15 flex items-center
                           justify-center text-neutral-900/40 hover:text-neutral-900 hover:border-neutral-900/30
                           transition-all"
                title="Sign in">
                <User className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-6 py-12">

        {/* Page title */}
        <div className="mb-10">
          <p className="section-tag mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-900/30 inline-block" />
            {user ? `${user.name}'s Resumes` : "My Resumes"}
          </p>
          <h1 className="text-4xl font-light text-neutral-900 tracking-tight">
            {resumeList.length === 0
              ? "Start building your resume."
              : <>You have <span className="font-bold">{resumeList.length}</span> {resumeList.length === 1 ? "resume" : "resumes"}.</>}
          </h1>
        </div>

        {resumeList.length === 0 ? (
          /* ── Empty state ───────────────────────────────────────────── */
          <div className="mt-20 flex flex-col items-center text-center animate-fade-in">
            <div className="w-20 h-20 rounded-3xl bg-white border border-surface-border shadow-sm
                            flex items-center justify-center mb-6">
              <FileText className="w-9 h-9 text-neutral-900/20" />
            </div>
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">No resumes yet</h3>
            <p className="text-sm text-neutral-900/40 mb-8 max-w-xs leading-relaxed font-light">
              Create your first resume and let AI tailor it to any job description.
            </p>
            <button onClick={handleCreate} className="btn-primary">
              Create first resume
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        ) : (
          /* ── Resume grid ───────────────────────────────────────────── */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">

            {/* New resume card */}
            <button
              onClick={handleCreate}
              className="group flex flex-col items-center justify-center gap-3
                         min-h-[200px] rounded-2xl border-2 border-dashed border-surface-border
                         bg-white/50 hover:border-neutral-900/20 hover:bg-white
                         transition-all duration-200 text-neutral-900/30 hover:text-neutral-900/60 cursor-pointer">
              <div className="w-10 h-10 rounded-full border-2 border-current flex items-center justify-center
                              group-hover:rotate-90 transition-transform duration-300">
                <Plus className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium">New resume</span>
            </button>

            {resumeList.map((r, i) => (
              <ResumeCard
                key={r.id}
                resume={r}
                index={i}
                onDelete={() => handleDelete(r.id)}
              />
            ))}
          </div>
        )}
      </main>

      {/* ── Auth modal ───────────────────────────────────────────────────── */}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
}

// ── Resume card ───────────────────────────────────────────────────────────────
function ResumeCard({
  resume, index, onDelete,
}: {
  resume:   ResumeListItem;
  index:    number;
  onDelete: () => void;
}) {
  const colors = [
    "from-rose-100 to-pink-50",
    "from-violet-100 to-purple-50",
    "from-cyan-100 to-sky-50",
    "from-amber-100 to-yellow-50",
    "from-emerald-100 to-green-50",
  ];
  const gradient = colors[index % colors.length];

  return (
    <div className="card-hover group relative overflow-hidden min-h-[200px] flex flex-col">
      <div className={`h-24 bg-gradient-to-br ${gradient} flex-shrink-0`} />

      <Link href={`/editor/${resume.id}`} className="flex-1 p-5 block">
        <h3 className="font-semibold text-neutral-900 text-base mb-1 truncate
                       group-hover:text-brand-600 transition-colors">
          {resume.title}
        </h3>
        <p className="text-xs text-neutral-900/40 mb-4">{resume.templateName}</p>
        <div className="flex items-center gap-1.5 text-2xs text-neutral-900/30">
          <Clock className="w-3 h-3" />
          {formatDate(resume.updatedAt)}
        </div>
      </Link>

      <button
        onClick={(e: MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); onDelete(); }}
        aria-label="Delete"
        className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/80 backdrop-blur-sm
                   flex items-center justify-center text-neutral-900/30 hover:text-red-500
                   hover:bg-white shadow-sm opacity-0 group-hover:opacity-100
                   transition-all duration-150">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
