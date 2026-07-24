import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface AuthUser {
  name: string;
  username: string | null;
  initials: string;
  photoUrl: string | null;
}

interface AuthState {
  loggedIn: boolean;
  user: AuthUser | null;
  idToken: string | null;
  token: string | null;
  login: (user: AuthUser, idToken?: string) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
}

export function makeAuthUser(
  firstName: string,
  lastName?: string | null,
  username?: string | null,
  photoUrl?: string | null,
): AuthUser {
  const parts = [firstName, lastName].filter((part): part is string => Boolean(part));
  const name = parts.join(" ");
  const initials = parts.map((part) => part.charAt(0).toUpperCase()).join("");
  return { name, username: username || null, initials: initials || "?", photoUrl: photoUrl || null };
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      loggedIn: false,
      user: null,
      idToken: null,
      token: null,
      login: (user, idToken) => set({ loggedIn: true, user, idToken: idToken ?? null }),
      setToken: (token) => set({ token }),
      logout: () => set({ loggedIn: false, user: null, idToken: null, token: null }),
    }),
    {
      name: "mtp-auth",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);
