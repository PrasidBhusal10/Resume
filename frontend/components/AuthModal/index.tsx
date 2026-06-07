"use client";

import { useState } from "react";
import { signIn as oauthSignIn } from "next-auth/react";
import { X, ArrowRight, User } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

interface Props {
  onClose: () => void;
}

type Tab = "signin" | "signup";

// ── Provider icons ────────────────────────────────────────────────────────────

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AuthModal({ onClose }: Props) {
  const [tab,      setTab]      = useState<Tab>("signup");
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");

  const signIn = useAuthStore((s) => s.signIn);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.includes("@")) { setError("Enter a valid email address."); return; }
    if (password.length < 6)  { setError("Password must be at least 6 characters."); return; }
    if (tab === "signup" && !name.trim()) { setError("Please enter your name."); return; }

    const displayName = tab === "signup" ? name.trim() : email.split("@")[0];
    signIn(displayName, email.trim().toLowerCase());
    onClose();
  }

  function handleOAuth(provider: "github" | "google" | "facebook") {
    oauthSignIn(provider, { callbackUrl: "/dashboard" });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>

      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 relative animate-slide-up">

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center
                     text-neutral-900/30 hover:text-neutral-900 hover:bg-neutral-100 transition-all">
          <X className="w-4 h-4" />
        </button>

        {/* Icon */}
        <div className="w-11 h-11 bg-neutral-900 rounded-2xl flex items-center justify-center mb-6">
          <User className="w-5 h-5 text-white" />
        </div>

        {/* Heading */}
        <h2 className="text-xl font-bold text-neutral-900 mb-1">
          {tab === "signup" ? "Create an account" : "Welcome back"}
        </h2>
        <p className="text-sm text-neutral-900/45 mb-6">
          {tab === "signup"
            ? "Save your resumes and sync across devices in the future."
            : "Sign in to access your saved resumes."}
        </p>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-neutral-100 rounded-xl mb-5">
          {(["signup", "signin"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setTab(t); setError(""); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all
                ${tab === t ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-900/40 hover:text-neutral-900/70"}`}>
              {t === "signup" ? "Sign up" : "Sign in"}
            </button>
          ))}
        </div>

        {/* OAuth buttons */}
        <div className="space-y-2 mb-5">
          <button
            type="button"
            onClick={() => handleOAuth("github")}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5
                       rounded-xl border border-neutral-900/12 bg-white text-sm font-medium
                       text-neutral-900 hover:bg-neutral-50 transition-all">
            <GitHubIcon />
            Continue with GitHub
          </button>
          <button
            type="button"
            onClick={() => handleOAuth("google")}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5
                       rounded-xl border border-neutral-900/12 bg-white text-sm font-medium
                       text-neutral-900 hover:bg-neutral-50 transition-all">
            <GoogleIcon />
            Continue with Google
          </button>
          <button
            type="button"
            onClick={() => handleOAuth("facebook")}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5
                       rounded-xl border border-neutral-900/12 bg-white text-sm font-medium
                       text-neutral-900 hover:bg-neutral-50 transition-all">
            <FacebookIcon />
            Continue with Facebook
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-neutral-900/8" />
          <span className="text-xs text-neutral-900/30 font-medium">or continue with email</span>
          <div className="flex-1 h-px bg-neutral-900/8" />
        </div>

        {/* Email/password form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {tab === "signup" && (
            <div>
              <label className="label">Full name</label>
              <input
                className="input"
                placeholder="Prasid Bhusal"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
          )}

          <div>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus={tab === "signin"}
            />
          </div>

          <div>
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-xs text-red-500 font-medium">{error}</p>
          )}

          <button type="submit" className="btn-primary w-full justify-center mt-2">
            {tab === "signup" ? "Create account" : "Sign in"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Guest option */}
        <button
          type="button"
          onClick={onClose}
          className="w-full text-center text-sm text-neutral-900/40 hover:text-neutral-900/70
                     transition-colors font-medium py-1 mt-5">
          Continue without account →
        </button>

        <p className="text-xs text-neutral-900/25 text-center mt-3 leading-relaxed">
          Your resumes are saved locally on this device.
        </p>
      </div>
    </div>
  );
}
