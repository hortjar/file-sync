import { create } from "zustand";
import { persist } from "zustand/middleware";

type AuthState = {
  accessToken: string | undefined;
  refreshToken: string | undefined;
  serverUrl: string;
  userId: string | undefined;
  userEmail: string | undefined;
  isAuthenticated: boolean;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setServerUrl: (url: string) => void;
  setUserId: (id: string) => void;
  setUserEmail: (email: string) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: undefined,
      refreshToken: undefined,
      serverUrl: "http://localhost:3001",
      userId: undefined,
      userEmail: undefined,
      isAuthenticated: false,

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken, isAuthenticated: true }),
      setServerUrl: (serverUrl) => set({ serverUrl }),
      setUserId: (userId) => set({ userId }),
      setUserEmail: (userEmail) => set({ userEmail }),

      logout: () =>
        set({
          accessToken: undefined,
          refreshToken: undefined,
          userId: undefined,
          userEmail: undefined,
          isAuthenticated: false,
        }),
    }),
    { name: "filesync-web-auth" },
  ),
);
