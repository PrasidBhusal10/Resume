"use client";

import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider, useSession } from "next-auth/react";
import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useLocalResumeStore } from "@/store/localResumeStore";

function SessionSync() {
  const { data: session, status } = useSession();
  const signIn                    = useAuthStore((s) => s.signIn);
  const switchUser                = useLocalResumeStore((s) => s.switchUser);

  // Only react to actual NextAuth session changes — never to Zustand user changes.
  // If we included `user` in the deps, clearing Zustand on sign-out would
  // immediately re-trigger this effect and restore the user from the OAuth session.
  const sessionEmail = session?.user?.email ?? null;

  useEffect(() => {
    if (status === "authenticated" && sessionEmail) {
      const name = session?.user?.name ?? sessionEmail.split("@")[0];
      signIn(name, sessionEmail);
      switchUser(sessionEmail);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, sessionEmail]);

  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() =>
    new QueryClient({
      defaultOptions: {
        queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false },
      },
    })
  );

  return (
    <SessionProvider>
      <SessionSync />
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </SessionProvider>
  );
}
