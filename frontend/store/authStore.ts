import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthUser {
  name:  string;
  email: string;
}

interface AuthStore {
  user:    AuthUser | null;
  signIn:  (name: string, email: string) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user:    null,
      signIn:  (name, email) => set({ user: { name, email } }),
      signOut: ()            => set({ user: null }),
    }),
    { name: "resume-ai-auth" },
  ),
);
