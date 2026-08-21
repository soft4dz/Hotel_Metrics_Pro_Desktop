import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { applyUiTheme } from '@/lib/applyUiTheme';
import type { LayoutProfileId } from '@/shared/constants/layoutProfiles';
import { getLayoutProfile } from '@/shared/constants/layoutProfiles';
import type { UserUiPreferencesDto } from '@/shared/types/uiPreferences';
import { applyDocumentLocale } from '@/lib/localization';

export type AccentColor = 'navy' | 'blue' | 'violet' | 'emerald' | 'rose' | 'amber' | 'cyan' | 'slate';
export type Density     = 'compact' | 'comfortable' | 'spacious';
export type Locale      = 'fr' | 'ar' | 'en';

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
  layoutProfileId: LayoutProfileId;
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  accentColor: AccentColor;
  density:     Density;
  notifPrefs:  NotifPrefs;
  locale:      Locale;

  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMobileNavOpen: (open: boolean) => void;
  setAccentColor: (color: AccentColor) => void;
  setDensity: (density: Density) => void;
  setLocale: (locale: Locale) => void;
  setNotifPref: <K extends keyof NotifPrefs>(key: K, value: NotifPrefs[K]) => void;
  resetNotifPrefs: () => void;
  applyLayoutProfile: (profileId: LayoutProfileId) => void;
  importFromDto: (dto: UserUiPreferencesDto) => void;
  exportDto: () => UserUiPreferencesDto;
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      layoutProfileId:  'standard' as LayoutProfileId,
      sidebarCollapsed: false,
      mobileNavOpen:    false,
      accentColor:      'navy',
      density:          'comfortable',
      notifPrefs:        DEFAULT_NOTIF,
      locale:           'fr',

      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
      setAccentColor: (accentColor) => {
        set({ accentColor });
        applyUiTheme(accentColor, get().density);
      },
      setDensity: (density) => {
        set({ density });
        applyUiTheme(get().accentColor, density);
      },
      setLocale: (locale) => {
        set({ locale });
        applyDocumentLocale(locale);
      },
      setNotifPref:   (key, value)   =>
        set((state) => ({ notifPrefs: { ...state.notifPrefs, [key]: value } })),
      resetNotifPrefs: () => set({ notifPrefs: DEFAULT_NOTIF }),
      applyLayoutProfile: (profileId) => {
        const profile = getLayoutProfile(profileId);
        if (!profile) return;
        set({
          layoutProfileId: profileId,
          sidebarCollapsed: profile.sidebarCollapsed,
          density: profile.density,
          accentColor: profile.accentColor,
        });
        applyUiTheme(profile.accentColor, profile.density);
      },
      importFromDto: (dto) => {
        set({
          layoutProfileId: dto.layoutProfileId,
          sidebarCollapsed: dto.sidebarCollapsed,
          accentColor: dto.accentColor,
          density: dto.density,
          notifPrefs: { ...DEFAULT_NOTIF, ...dto.notifPrefs },
        });
        applyUiTheme(dto.accentColor, dto.density);
      },
      exportDto: () => {
        const s = get();
        return {
          layoutProfileId: s.layoutProfileId,
          sidebarCollapsed: s.sidebarCollapsed,
          accentColor: s.accentColor,
          density: s.density,
          notifPrefs: s.notifPrefs,
        };
      },
    }),
    {
      name: 'hmp-ui-prefs',
      partialize: (state) => ({
        layoutProfileId: state.layoutProfileId,
        sidebarCollapsed: state.sidebarCollapsed,
        accentColor:      state.accentColor,
        density:          state.density,
        notifPrefs:       state.notifPrefs,
        locale:           state.locale,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyUiTheme(state.accentColor, state.density);
          applyDocumentLocale(state.locale);
        }
      },
    },
  ),
);
