import type { LayoutProfileId } from '@/shared/constants/layoutProfiles';
import type { AccentColor, Density, NotifPrefs } from '@/stores/ui.store';

export interface UserUiPreferencesDto {
  layoutProfileId: LayoutProfileId;
  sidebarCollapsed: boolean;
  accentColor: AccentColor;
  density: Density;
  notifPrefs: NotifPrefs;
}
