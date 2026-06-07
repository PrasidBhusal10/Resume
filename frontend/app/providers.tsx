"use client";

import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider, useSession } from "next-auth/react";
import { useState } from "react";
import { useAuthStore } from "@/store/authStore";

function SessionSync() {
  const { data: session, status } = useSession();
  const { user, signIn } = useAuthStore();

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const name  = session.user.name  ?? session.user.email?.split("@")[0] ?? "User";
      const email = session.user.email ?? "";
      if (!user || user.email !== email || user.name !== name) {
        signIn(name, email);
      }
    }
  }, [status, session, user, signIn]);

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
