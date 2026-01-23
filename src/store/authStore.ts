import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const DASHBOARD_PASSWORD = "Cirkel007!";

interface AuthState {
  isAuthenticated: boolean;
  authenticate: (password: string) => boolean;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      authenticate: (password: string) => {
        if (password === DASHBOARD_PASSWORD) {
          set({ isAuthenticated: true });
          return true;
        }
        return false;
      },
      logout: () => set({ isAuthenticated: false }),
    }),
    {
      name: 'fashion-pulse-auth',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
