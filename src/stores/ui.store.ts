import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { applyUiTheme } from '@/lib/applyUiTheme';

export type AccentColor = 'navy' | 'blue' | 'violet' | 'emerald' | 'rose' | 'amber' | 'cyan' | 'slate';
export type Density     = 'compact' | 'comfortable' | 'spacious';

export interface NotifPrefs {
  // Alertes dashboard
  alertesCritiques:      boolean;
  alertesAvertissements: boolean;
  alertesInformations:   boolean;
  // Opérationnel
  saisiesManquantes: boolean;
  objectifsSeuil:    boolean;
  seuilObjectifPct:  number;   // %  seuil sous lequel notifier
  // Rapports automatiques
  resumeQuotidien:     boolean;
  heureResume:         string;  // "HH:MM"
  resumeHebdomadaire:  boolean;
  // Système
  syncStatus:      boolean;
  erreursCritiques: boolean;
}

const DEFAULT_NOTIF: NotifPrefs = {
  alertesCritiques:      true,
  alertesAvertissements: true,
  alertesInformations:   false,
  saisiesManquantes:     true,
  objectifsSeuil:        true,
  seuilObjectifPct:      75,
  resumeQuotidien:       false,
  heureResume:           '18:00',
  resumeHebdomadaire:    false,
  syncStatus:            true,
  erreursCritiques:      true,
};

interface UiState {
  sidebarCollapsed: boolean;
  accentColor: AccentColor;
  density:     Density;
  notifPrefs:  NotifPrefs;

  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setAccentColor: (color: AccentColor) => void;
  setDensity: (density: Density) => void;
  setNotifPref: <K extends keyof NotifPrefs>(key: K, value: NotifPrefs[K]) => void;
  resetNotifPrefs: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      accentColor:      'navy',
      density:          'comfortable',
      notifPrefs:        DEFAULT_NOTIF,

      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setAccentColor: (accentColor) => {
        set({ accentColor });
        applyUiTheme(accentColor, get().density);
      },
      setDensity: (density) => {
        set({ density });
        applyUiTheme(get().accentColor, density);
      },
      setNotifPref:   (key, value)   =>
        set((state) => ({ notifPrefs: { ...state.notifPrefs, [key]: value } })),
      resetNotifPrefs: () => set({ notifPrefs: DEFAULT_NOTIF }),
    }),
    {
      name: 'hmp-ui-prefs',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        accentColor:      state.accentColor,
        density:          state.density,
        notifPrefs:       state.notifPrefs,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyUiTheme(state.accentColor, state.density);
        }
      },
    },
  ),
);
