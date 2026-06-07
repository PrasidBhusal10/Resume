"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Sparkles, Eye, EyeOff } from "lucide-react";
import { auth } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

export default function LoginPage() {
  const router   = useRouter();
  const signIn   = useAuthStore((s) => s.signIn);

  const [form, setForm]           = useState({ email: "", password: "" });
  const [loading, setLoading]     = useState(false);
  const [showPass, setShowPass]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await auth.login(form);
      signIn(data.user.name || data.user.email, data.user.email);
      toast.success(`Welcome back, ${data.user.name || data.user.email}!`);
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })
                   ?.response?.data?.error ?? "Login failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-950
                    flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-white font-bold text-xl mb-6">
            <Sparkles className="w-5 h-5 text-blue-400" />
            ResumeAI
          </Link>
          <h1 className="text-2xl font-bold text-white">Welcome back</h1>
          <p className="text-slate-400 text-sm mt-2">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit}
              className="bg-white rounded-2xl shadow-2xl p-8 space-y-5">
          <div>
            <label className="label">Email</label>
            <input
              type="email" required
              className="input"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div>
            <label className="label">Password</label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"} required
                className="input pr-10"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <button type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400
                                 hover:text-slate-600 transition"
                      onClick={() => setShowPass((v) => !v)}>
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary w-full justify-center py-3"
                  disabled={loading}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="text-center text-slate-400 text-sm mt-6">
          No account?{" "}
          <Link href="/auth/register" className="text-blue-400 hover:underline font-medium">
            Create one free
          </Link>
        </p>
      </div>
    </div>
  );
}
