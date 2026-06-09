import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ipcClient } from '@/lib/ipcClient';
import type { AuthUserDto } from '@/shared/types/auth';

export type AuthUser = AuthUserDto;

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  rememberMe: boolean;
  sessionToken: string | null;
  /** false tant que restoreSession n'a pas terminé (évite fausses déconnexions). */
  sessionChecked: boolean;
  login: (email: string, password: string, rememberMe: boolean) => Promise<{
    ok: boolean;
    error?: string;
    remainingAttempts?: number;
  }>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      rememberMe: false,
      sessionToken: null,
      sessionChecked: false,

      login: async (email, password, rememberMe) => {
        const result = await ipcClient.auth.login({ email, password, rememberMe });

        if (!result.success || !result.user) {
          return {
            ok: false,
            error: result.error ?? 'Identifiants incorrects.',
            remainingAttempts: result.remainingAttempts,
          };
        }

        set({
          user: result.user,
          isAuthenticated: true,
          rememberMe,
          sessionToken: result.sessionToken ?? null,
          sessionChecked: true,
        });

        return { ok: true };
      },

      logout: async () => {
        const { sessionToken } = get();
        try {
          await ipcClient.auth.logout(sessionToken ?? undefined);
        } catch {
          /* ignore */
        }
        set({ user: null, isAuthenticated: false, sessionToken: null, sessionChecked: true });
      },

      restoreSession: async () => {
        const { sessionToken, rememberMe } = get();
        if (!rememberMe || !sessionToken) {
          set({ sessionChecked: true });
          return;
        }

        try {
          const result = await ipcClient.auth.restore(sessionToken);
          if (result.success && result.user) {
            set({
              user: result.user,
              isAuthenticated: true,
              sessionToken: result.sessionToken ?? sessionToken,
              sessionChecked: true,
            });
          } else {
            set({ user: null, isAuthenticated: false, sessionToken: null, sessionChecked: true });
          }
        } catch {
          set({ user: null, isAuthenticated: false, sessionToken: null, sessionChecked: true });
        }
      },
    }),
    {
      name: 'hmp-auth',
      partialize: (state) =>
        state.rememberMe && state.sessionToken
          ? { rememberMe: true, sessionToken: state.sessionToken }
          : { rememberMe: false },
    },
  ),
);
