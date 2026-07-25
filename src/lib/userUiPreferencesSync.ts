import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { useUiStore } from '@/stores/ui.store';

/** Charge les préférences enregistrées côté serveur pour l'utilisateur connecté. */
export async function loadUserUiPreferencesFromServer(): Promise<void> {
  try {
    const prefs = unwrapIpc(await ipcClient.settings.getUiPreferences());
    useUiStore.getState().importFromDto(prefs);
  } catch {
    /* session expirée ou colonne absente — conserver le cache local */
  }
}

/** Enregistre le profil interface courant pour l'utilisateur connecté. */
export async function saveUserUiPreferencesToServer(): Promise<void> {
  const dto = useUiStore.getState().exportDto();
  unwrapIpc(await ipcClient.settings.saveUiPreferences(dto));
}
