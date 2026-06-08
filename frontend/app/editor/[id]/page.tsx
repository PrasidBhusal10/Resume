"use client";

import { useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, LogOut } from "lucide-react";
import { useLocalResumeStore } from "@/store/localResumeStore";
import { useAuthStore } from "@/store/authStore";
import { signOut as nextAuthSignOut } from "next-auth/react";
import ResumeEditor from "@/components/ResumeEditor";
import JDAnalyzer from "@/components/JDAnalyzer";
import ExportPanel from "@/components/ExportPanel";
import ResumePreview from "@/components/ResumePreview";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

export default function EditorPage() {
  const params = useParams<{ id: string }>();
  const id     = Number(params.id);

  const resume      = useLocalResumeStore((s) => s.resumes.find((r) => r.id === id));
  const updateTitle = useLocalResumeStore((s) => s.updateTitle);
  const switchUser  = useLocalResumeStore((s) => s.switchUser);
  const { user, signOut } = useAuthStore();

  const [editing,  setEditing]  = useState(false);
  const [draft,    setDraft]    = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSignOut() {
    signOut();
    switchUser(null);
    nextAuthSignOut({ callbackUrl: "/" });
  }

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

            {editing ? (
              <input
                ref={inputRef}
                className="text-sm font-semibold text-neutral-900 tracking-tight bg-transparent
                           border-b border-neutral-900/30 focus:border-neutral-900 outline-none
                           max-w-xs px-0.5"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => {
                  const trimmed = draft.trim();
                  if (trimmed) updateTitle(id, trimmed);
                  setEditing(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                  if (e.key === "Escape") setEditing(false);
                }}
                autoFocus
              />
            ) : (
              <button
                onClick={() => { setDraft(resume.title); setEditing(true); }}
                className="group flex items-center gap-1.5 text-sm font-semibold text-neutral-900
                           tracking-tight hover:text-neutral-600 transition-colors max-w-xs truncate">
                <span className="truncate">{resume.title}</span>
                <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-40 transition-opacity flex-shrink-0" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <ExportPanel resumeId={id} />

            {/* User menu */}
            {user && (
              <div className="relative ml-1">
                <button
                  onClick={() => setShowMenu((v) => !v)}
                  className="w-8 h-8 rounded-full bg-neutral-900 flex items-center justify-center
                             text-white text-xs font-bold hover:bg-neutral-700 transition-colors flex-shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </button>

                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowMenu(false)} />
                    <div className="absolute right-0 top-full mt-2 z-40 w-48 bg-white rounded-2xl
                                    border border-surface-border shadow-xl overflow-hidden">
                      <div className="px-4 py-3 border-b border-surface-border">
                        <p className="text-sm font-semibold text-neutral-900 truncate">{user.name}</p>
                        <p className="text-xs text-neutral-900/40 truncate">{user.email}</p>
                      </div>
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-500
                                   hover:bg-red-50 transition-colors">
                        <LogOut className="w-3.5 h-3.5" />
                        Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── 3-column layout ──────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        <aside className="w-[17rem] bg-white border-r border-surface-border overflow-y-auto flex-shrink-0">
          <ErrorBoundary>
            <ResumeEditor resume={resume} />
          </ErrorBoundary>
        </aside>

        <main className="flex-1 overflow-y-auto p-8 bg-neutral-100">
          <ErrorBoundary>
            <ResumePreview resume={resume} />
          </ErrorBoundary>
        </main>

        <aside className="w-[22rem] bg-white border-l border-surface-border overflow-y-auto flex-shrink-0">
          <ErrorBoundary>
            <JDAnalyzer resumeId={id} />
          </ErrorBoundary>
        </aside>

      </div>
    </div>
  );
}
