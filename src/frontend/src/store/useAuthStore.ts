import { create } from "zustand";
import { apiUrl } from "../config/api";

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
  isLoading: boolean;
  checkAuth: () => Promise<boolean>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  setUser: (user) => set({ user }),
  checkAuth: async () => {
    try {
      set({ isLoading: true });

      // Call the /me/ endpoint with credentials
      const response = await fetch(apiUrl('/me/'), {
        credentials: 'include',  // This sends the cookies!
      });

      if (response.ok) {
        const data = await response.json();
        set({ user: data.user, isLoading: false });
        return true;
      } else {
        set({ user: null, isLoading: false });
        return false;
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      set({ user: null, isLoading: false });
      return false;
    }
  },

  logout: () => {
    set({ user: null, isLoading: false });
  },
}));
