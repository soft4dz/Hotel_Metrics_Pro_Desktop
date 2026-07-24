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
    (set) => ({
      user: null,
      isAuthenticated: false,
      rememberMe: false,
      sessionToken: null,
      sessionChecked: false,

      login: async (email, password) => {
        const result = await ipcClient.auth.login({ email, password, rememberMe: false });

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
          rememberMe: false,
          sessionToken: null,
          sessionChecked: true,
        });

        return { ok: true };
      },

      logout: async () => {
        try {
          await ipcClient.auth.logout(undefined);
        } catch {
          /* La session locale est effacée même si le processus principal est indisponible. */
        }
        set({
          user: null,
          isAuthenticated: false,
          rememberMe: false,
          sessionToken: null,
          sessionChecked: true,
        });
      },

      restoreSession: async () => {
        // Les anciens jetons éventuellement présents dans localStorage sont
        // supprimés. Une reconnexion est exigée après chaque redémarrage tant
        // qu'un stockage chiffré natif n'est pas disponible.
        set({
          user: null,
          isAuthenticated: false,
          rememberMe: false,
          sessionToken: null,
          sessionChecked: true,
        });
      },
    }),
    {
      name: 'hmp-auth',
      partialize: () => ({ rememberMe: false, sessionToken: null }),
    },
  ),
);
