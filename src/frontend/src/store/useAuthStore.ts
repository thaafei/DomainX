import { create } from "zustand";

interface User {
  email: string;
  role: "user" | "admin" | "superadmin";
}

interface AuthState {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,

  setUser: (user) => set({ user }),

  logout: () => {
    set({ user: null });
    // logout API call will also clear cookies
  },
}));

