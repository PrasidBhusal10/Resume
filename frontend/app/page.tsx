"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, LogOut, ChevronDown } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useLocalResumeStore } from "@/store/localResumeStore";
import { signOut as nextAuthSignOut } from "next-auth/react";
import AuthModal from "@/components/AuthModal";
import Logo from "@/components/Logo";

export default function LandingPage() {
  const [showAuth,    setShowAuth]    = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { user, signOut } = useAuthStore();
  const switchUser = useLocalResumeStore((s) => s.switchUser);

  return (
    <div className="min-h-screen bg-mesh flex flex-col">

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-8 py-7 max-w-7xl mx-auto w-full">
        <Logo />

        <div className="flex items-center gap-3">
          {user ? (
            /* Signed-in state */
            <div className="relative">
              <button
                onClick={() => setShowUserMenu((v) => !v)}
                className="flex items-center gap-2.5 px-4 py-2 rounded-full border border-neutral-900/12
                           hover:bg-white/60 transition-all text-sm font-medium text-neutral-900">
                <div className="w-6 h-6 rounded-full bg-neutral-900 flex items-center justify-center
                                text-white text-xs font-bold flex-shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                {user.name}
                <ChevronDown className="w-3.5 h-3.5 text-neutral-900/40" />
              </button>

              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowUserMenu(false)} />
                  <div className="absolute right-0 top-full mt-2 z-40 w-52 bg-white rounded-2xl
                                  border border-surface-border shadow-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-surface-border">
                      <p className="text-sm font-semibold text-neutral-900 truncate">{user.name}</p>
                      <p className="text-xs text-neutral-900/40 truncate">{user.email}</p>
                    </div>
                    <Link
                      href="/dashboard"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2 px-4 py-3 text-sm text-neutral-900/70
                                 hover:bg-neutral-50 transition-colors">
                      Open Dashboard →
                    </Link>
                    <button
                      onClick={() => { signOut(); switchUser(null); nextAuthSignOut({ callbackUrl: "/" }); setShowUserMenu(false); }}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-500
                                 hover:bg-red-50 transition-colors border-t border-surface-border">
                      <LogOut className="w-3.5 h-3.5" />
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            /* Guest state */
            <>
              <button
                onClick={() => setShowAuth(true)}
                className="text-sm font-medium text-neutral-900/60 hover:text-neutral-900
                           transition-colors px-2 py-1">
                Sign in
              </button>
              <button
                onClick={() => setShowAuth(true)}
                className="btn-primary text-sm">
                Sign up free
              </button>
            </>
          )}
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="flex-1 flex flex-col justify-center max-w-7xl mx-auto w-full px-8 py-20">

        <p className="section-tag mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-neutral-900/30 inline-block" />
          Developed by Prasid Bhusal
        </p>

        <h1 className="text-[clamp(2rem,5vw,4.5rem)] font-light leading-[1.05] text-neutral-900 mb-4 text-balance">
          Your resume,{" "}
          <span className="font-extrabold italic">perfectly</span>
          <br />
          tailored to{" "}
          <span className="font-extrabold">any job.</span>
        </h1>

        <p className="text-lg text-neutral-900/50 font-light max-w-xl mt-8 mb-14 leading-relaxed">
          Paste a job description. AI rewrites your resume sections to match
          — skills, bullets, summary. Download as PDF, DOCX, or LaTeX.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-2">
          <Link href="/dashboard"
                className="group inline-flex items-center gap-2.5 px-7 py-3.5
                           bg-neutral-900 text-white text-[15px] font-semibold rounded-full
                           shadow-[0_2px_16px_rgba(0,0,0,0.18)] hover:bg-neutral-700
                           hover:shadow-[0_4px_24px_rgba(0,0,0,0.22)]
                           active:scale-[0.97] transition-all duration-200">
            Start for free
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
          </Link>

          <Link href="/templates"
                className="group inline-flex items-center gap-2 px-6 py-3.5
                           border border-neutral-900/15 text-neutral-900/60 text-[15px] font-medium rounded-full
                           hover:border-neutral-900/30 hover:text-neutral-900 hover:bg-white/60
                           transition-all duration-200">
            View templates
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
          </Link>
        </div>

        {!user && (
          <p className="mt-6 text-xs text-neutral-900/30 font-medium">
            No account needed to get started.{" "}
            <button onClick={() => setShowAuth(true)} className="underline underline-offset-2 hover:text-neutral-900/60 transition-colors">
              Sign up
            </button>{" "}
            to save your resumes across devices.
          </p>
        )}
      </section>

      {/* ── Features strip ───────────────────────────────────────────────── */}
      <section id="features" className="max-w-7xl mx-auto w-full px-8 pb-24">
        <div className="divider mb-16" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-10">
          {[
            { number: "01", title: "4 Pro Templates",    body: "Modern, Classic, Minimal, Jake's Resume — all ATS-friendly." },
            { number: "02", title: "AI Section Optimizer", body: "Claude rewrites your skills, bullets, and summary to match the exact job description." },
            { number: "03", title: "Export Anywhere",    body: "Download as PDF, DOCX, or LaTeX with one click." },
          ].map((f) => (
            <div key={f.number}>
              <p className="text-2xs font-semibold text-neutral-900/30 tracking-widest mb-4">{f.number}</p>
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">{f.title}</h3>
              <p className="text-sm text-neutral-900/50 leading-relaxed font-light">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-surface-border">
        <div className="max-w-7xl mx-auto px-8 py-6 flex items-center justify-between">
          <Logo size="sm" />
          <span className="text-xs text-neutral-900/30">
            &copy; {new Date().getFullYear()} Owned by Prasid Bhusal
          </span>
        </div>
      </footer>

      {/* ── Auth modal ───────────────────────────────────────────────────── */}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
}
