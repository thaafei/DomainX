import { create } from "zustand";

interface Domain {
  domain_ID: string;
  domain_name: string;
}

interface User {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  role: "user" | "admin" | "superadmin";
  domains?: Domain[];
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
  },
}));

