import type { AccentColor, Density } from '@/stores/ui.store';

export type LayoutProfileId = 'standard' | 'compact' | 'spacious' | 'focus-contenu';

export interface LayoutProfile {
  id: LayoutProfileId;
  label: string;
  description: string;
  sidebarCollapsed: boolean;
  density: Density;
  accentColor: AccentColor;
}

/** Profils d'interface enregistrables — appliqués en un clic depuis Paramètres → Interface. */
export const LAYOUT_PROFILES: LayoutProfile[] = [
  {
    id: 'standard',
    label: 'Standard',
    description: 'Sidebar étendue, densité confortable — usage quotidien',
    sidebarCollapsed: false,
    density: 'comfortable',
    accentColor: 'navy',
  },
  {
    id: 'compact',
    label: 'Compact',
    description: 'Sidebar réduite, interface dense — maximum de contenu',
    sidebarCollapsed: true,
    density: 'compact',
    accentColor: 'navy',
  },
  {
    id: 'spacious',
    label: 'Spacieux',
    description: 'Sidebar étendue, grands espacements — grands écrans',
    sidebarCollapsed: false,
    density: 'spacious',
    accentColor: 'blue',
  },
  {
    id: 'focus-contenu',
    label: 'Focus contenu',
    description: 'Sidebar réduite, palette sobre — saisie prolongée',
    sidebarCollapsed: true,
    density: 'comfortable',
    accentColor: 'slate',
  },
];

const BY_ID = new Map(LAYOUT_PROFILES.map((p) => [p.id, p]));

export function getLayoutProfile(id?: string | null): LayoutProfile | undefined {
  if (!id) return undefined;
  return BY_ID.get(id as LayoutProfileId);
}

export function listLayoutProfiles(): LayoutProfile[] {
  return [...LAYOUT_PROFILES];
}
