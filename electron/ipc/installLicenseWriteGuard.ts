import Electron from '../lib/electronApi';
import { assertLicenseWritable, getLicenseStatus, LicenseReadOnlyError } from '../services/license.service';
import { isModuleAllowedByLicense } from '../services/license-pack.service';
import type { ConfiguredModuleId } from '../../src/shared/constants/configuredModules';

const ALWAYS_ALLOWED_PREFIXES = ['license:', 'auth:', 'guide:', 'app:'];
const ALWAYS_ALLOWED_CHANNELS = new Set([
  'settings:getBusinessSector',
  'settings:getBranding',
  'settings:getAppInfo',
  'settings:getUiPreferences',
]);

const READ_OPERATION = /^(list|get|read|status|stats|count|search|options|catalog|preview|export|download|historique|history|board|summary|dashboard|overview|ping|health|templates|balance|grandlivre|report|detail|fiche|integritycheck|verify|estimate|available|availability|echeances|libres)/i;

function isMutationChannel(channel: string): boolean {
  if (ALWAYS_ALLOWED_PREFIXES.some((prefix) => channel.startsWith(prefix))) return false;
  if (ALWAYS_ALLOWED_CHANNELS.has(channel)) return false;
  if (channel === 'database:importLegacy' || channel === 'backup:restore') return true;
  const operation = channel.split(':').at(-1) ?? '';
  return !READ_OPERATION.test(operation);
}

const MODULE_BY_CHANNEL_PREFIX: ReadonlyArray<[string, ConfiguredModuleId]> = [
  ['users:', 'administration-utilisateurs'],
  ['roles:', 'administration-utilisateurs'],
  ['settings:', 'parametrage-global'],
  ['modules:', 'parametrage-global'],
  ['hotels:', 'unites-hotelieres'],
  ['recettes:', 'recettes-journalieres'],
  ['rubriques:', 'recettes-journalieres'],
  ['cloture:', 'cloture-night-audit'],
  ['tresorerie:', 'encaissements-tresorerie'],
  ['comptabilite:', 'comptabilite-scf'],
  ['reconciliation:', 'comptabilite-scf'],
  ['fiscalite:', 'fiscalite-dgi'],
  ['sifec:', 'fiscalite-dgi'],
  ['objectifs:', 'budget-previsions'],
  ['hebergement:', 'hebergement-occupation'],
  ['pms:', 'hebergement-occupation'],
  ['distribution:', 'hebergement-occupation'],
  ['crm:', 'crm-experience-client'],
  ['mice:', 'groupes-mice'],
  ['facturation:', 'facturation'],
  ['creances:', 'creances-recouvrement'],
  ['contratsHotel:', 'contrats-conventions'],
  ['stocks:', 'stocks-consommations'],
  ['cuisine:', 'cuisine-qualite'],
  ['pos:', 'pos-restauration'],
  ['achats:', 'achats-approvisionnements'],
  ['appelsOffres:', 'appels-offres'],
  ['maintenance:', 'maintenance-interventions'],
  ['hardware:', 'integrations-materielles'],
  ['housekeeping:', 'housekeeping-chambres'],
  ['rh:', 'rh-productivite'],
  ['pointeuse:', 'pointeuses-badgeuses'],
  ['tarifs:', 'tarifs-conventions'],
  ['yield:', 'tarifs-conventions'],
  ['audit:', 'audit-controle-interne'],
  ['workflow:', 'workflows-validations'],
  ['checklist:', 'checklists-controle'],
  ['anomalies:', 'journal-anomalies'],
  ['decisions:', 'decisions-instructions'],
  ['reclamations:', 'qualite-reclamations'],
  ['hotelLegal:', 'conformite-hoteliere'],
  ['rgpd:', 'protection-donnees-personnelles'],
  ['modulesLegaux:', 'modules-legaux'],
  ['immo:', 'modules-legaux'],
  ['casnos:', 'modules-legaux'],
  ['inventaireLegal:', 'modules-legaux'],
  ['veille:', 'veille-reglementaire'],
  ['portmaster:', 'portmaster'],
  ['clients:', 'clients'],
  ['commercial:', 'commercial-partenariats'],
  ['dashboard:', 'dashboard-pdg'],
  ['dec:', 'cockpit-dec'],
  ['reports:', 'rapports-automatiques'],
  ['notifications:', 'alertes-notifications'],
  ['ged:', 'gestion-documentaire'],
  ['backup:', 'sauvegarde-restauration'],
  ['database:', 'sauvegarde-restauration'],
  ['import:', 'sauvegarde-restauration'],
  ['sync:', 'synchronisation-multi-postes'],
  ['workflowProcedures:', 'workflows-validations'],
  ['systemHealth:', 'audit-controle-interne'],
];

function resolveModuleForChannel(channel: string): ConfiguredModuleId | null {
  return MODULE_BY_CHANNEL_PREFIX.find(([prefix]) => channel.startsWith(prefix))?.[1] ?? null;
}

/**
 * Politique fail-closed :
 * - les canaux d'un module hors pack sont bloqués dans le processus principal ;
 * - en lecture seule, toute opération non explicitement reconnue comme lecture est bloquée.
 */
export function installLicenseWriteGuard(): void {
  const ipcMain = Electron.ipcMain;
  const originalHandle = ipcMain.handle.bind(ipcMain);

  ipcMain.handle = ((channel: string, listener: (...args: unknown[]) => unknown) => {
    return originalHandle(channel, async (event, ...args: unknown[]) => {
      // Réhydrate les droits depuis le jeton signé avant toute décision de pack.
      const status = getLicenseStatus();
      const moduleId = resolveModuleForChannel(channel);
      if (moduleId && status.isPackaged && status.edition === null) {
        return {
          ok: false,
          error: 'Licence non vérifiable : accès aux modules métier suspendu.',
          errorCode: 'LICENSE_MODULE_DISABLED',
        };
      }
      if (moduleId && !isModuleAllowedByLicense(moduleId)) {
        return {
          ok: false,
          error: `Module « ${moduleId} » non inclus dans cette licence.`,
          errorCode: 'LICENSE_MODULE_DISABLED',
        };
      }
      if (isMutationChannel(channel)) {
        try {
          assertLicenseWritable();
        } catch (error) {
          if (error instanceof LicenseReadOnlyError) {
            return { ok: false, error: error.message, errorCode: 'LICENSE_READONLY' };
          }
          throw error;
        }
      }
      return listener(event, ...args);
    });
  }) as typeof ipcMain.handle;
}
