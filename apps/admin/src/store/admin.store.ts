import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AdminUser {
  id:    string;
  name:  string;
  phone: string;
  role:  string;
}

interface AdminStore {
  user:          AdminUser | null;
  accessToken:   string | null;
  refreshToken:  string | null;
  setAuth:       (user: AdminUser, accessToken: string, refreshToken: string) => void;
  logout:        () => void;
  isLoggedIn:    () => boolean;
}

export const useAdminStore = create<AdminStore>()(
  persist(
    (set, get) => ({
      user:         null,
      accessToken:  null,
      refreshToken: null,

      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken }),

      logout: () => {
        set({ user: null, accessToken: null, refreshToken: null });
        window.location.href = '/login';
      },

      isLoggedIn: () => !!get().accessToken && !!get().user,
    }),
    {
      name: 'gmc-admin-auth',
      partialize: (state) => ({
        user:         state.user,
        accessToken:  state.accessToken,
        refreshToken: state.refreshToken,
      }),
    },
  ),
);
