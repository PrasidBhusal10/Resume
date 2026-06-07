"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useAuthStore } from "@/store/authStore";

// Syncs NextAuth session (from OAuth) into the local Zustand authStore so the
// rest of the app can read user.name / user.email without touching next-auth directly.
export default function SessionSync() {
  const { data: session, status } = useSession();
  const { user, signIn, signOut } = useAuthStore();

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const name  = session.user.name  ?? session.user.email?.split("@")[0] ?? "User";
      const email = session.user.email ?? "";
      // Only write if something changed to avoid infinite loops
      if (!user || user.email !== email || user.name !== name) {
        signIn(name, email);
      }
    } else if (status === "unauthenticated" && user) {
      // NextAuth session expired / signed out via provider — clear local store too
      // but only if they had an OAuth session (email from session is gone)
      // We don't clear if they used email/password login (no next-auth session)
    }
  }, [status, session, user, signIn, signOut]);

  return null;
}
