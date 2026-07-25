import { getDatabase } from '../database/sqlite';
import type { UserUiPreferencesDto } from '../../src/shared/types/uiPreferences';
import type { LayoutProfileId } from '../../src/shared/constants/layoutProfiles';

const DEFAULT_PREFS: UserUiPreferencesDto = {
  layoutProfileId: 'standard',
  sidebarCollapsed: false,
  accentColor: 'navy',
  density: 'comfortable',
  notifPrefs: {
    alertesCritiques: true,
    alertesAvertissements: true,
    alertesInformations: false,
    saisiesManquantes: true,
    objectifsSeuil: true,
    seuilObjectifPct: 75,
    resumeQuotidien: false,
    heureResume: '18:00',
    resumeHebdomadaire: false,
    syncStatus: true,
    erreursCritiques: true,
  },
};

const LAYOUT_IDS = new Set<LayoutProfileId>(['standard', 'compact', 'spacious', 'focus-contenu']);
const ACCENTS = new Set(['navy', 'blue', 'violet', 'emerald', 'rose', 'amber', 'cyan', 'slate']);
const DENSITIES = new Set(['compact', 'comfortable', 'spacious']);

function sanitize(input: Partial<UserUiPreferencesDto>): UserUiPreferencesDto {
  const base = { ...DEFAULT_PREFS, ...input };
  return {
    layoutProfileId: LAYOUT_IDS.has(base.layoutProfileId) ? base.layoutProfileId : 'standard',
    sidebarCollapsed: Boolean(base.sidebarCollapsed),
    accentColor: ACCENTS.has(base.accentColor) ? base.accentColor : 'navy',
    density: DENSITIES.has(base.density) ? base.density : 'comfortable',
    notifPrefs: { ...DEFAULT_PREFS.notifPrefs, ...base.notifPrefs },
  };
}

export function getUserUiPreferences(userId: number): UserUiPreferencesDto {
  const row = getDatabase().prepare(`
    SELECT ui_preferences_json FROM users WHERE id = ? AND deleted_at IS NULL
  `).get(userId) as { ui_preferences_json: string | null } | undefined;

  if (!row?.ui_preferences_json) return { ...DEFAULT_PREFS };

  try {
    const parsed = JSON.parse(row.ui_preferences_json) as Partial<UserUiPreferencesDto>;
    return sanitize(parsed);
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function saveUserUiPreferences(userId: number, prefs: UserUiPreferencesDto): UserUiPreferencesDto {
  const clean = sanitize(prefs);
  getDatabase().prepare(`
    UPDATE users SET ui_preferences_json = ?, updated_at = datetime('now') WHERE id = ?
  `).run(JSON.stringify(clean), userId);
  return clean;
}

export function listAvailableLayoutProfileIds(): LayoutProfileId[] {
  return [...LAYOUT_IDS];
}
