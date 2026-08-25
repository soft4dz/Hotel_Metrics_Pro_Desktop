import Electron from './lib/electronApi';
import { existsSync, readFileSync } from 'node:fs';
import path from './lib/nodePath';
import { fileURLToPath } from 'node:url';
import { closeDatabase, initDatabase } from './database/sqlite';
import { runSeedIfNeeded } from './database/seed';
import { ensureBootstrapAuthAccounts } from './database/authBootstrap';
import { importLegacyDatabase } from './database/importLegacyData';
import { installLicenseWriteGuard } from './ipc/installLicenseWriteGuard';
import { resolveAppIconPath } from './utils/paths';
import { registerAuthIpc } from './ipc/auth.ipc';
import { registerUsersIpc } from './ipc/users.ipc';
import { registerHotelsIpc } from './ipc/hotels.ipc';
import { registerRolesIpc } from './ipc/roles.ipc';
import { registerRubriquesIpc } from './ipc/rubriques.ipc';
import { registerAuditIpc } from './ipc/audit.ipc';
import { registerImportIpc } from './ipc/import.ipc';
import { registerRecettesIpc } from './ipc/recettes.ipc';
import { registerObjectifsIpc } from './ipc/objectifs.ipc';
import { registerDashboardIpc } from './ipc/dashboard.ipc';
import { registerPortmasterIpc } from './ipc/portmaster.ipc';
import { registerExportIpc } from './ipc/export.ipc';
import { registerSyncIpc } from './ipc/sync.ipc';
import { registerSettingsIpc } from './ipc/settings.ipc';
import { registerDatabaseIpc } from './ipc/database.ipc';
import { registerBackupIpc } from './ipc/backup.ipc';
import { registerTresorerieIpc } from './ipc/tresorerie.ipc';
import { registerFacturationIpc } from './ipc/facturation.ipc';
import { registerClientsIpc } from './ipc/clients.ipc';
import { registerHebergementIpc } from './ipc/hebergement.ipc';
import { registerTarifsIpc } from './ipc/tarifs.ipc';
import { registerYieldIpc } from './ipc/yield.ipc';
import { registerRhIpc } from './ipc/rh.ipc';
import { registerModulesIpc } from './ipc/modules.ipc';
import { registerAnomaliesIpc } from './ipc/anomalies.ipc';
import { registerDecisionsIpc } from './ipc/decisions.ipc';
import { registerReclamationsIpc } from './ipc/reclamations.ipc';
import { registerStocksIpc } from './ipc/stocks.ipc';
import { registerAchatsIpc } from './ipc/achats.ipc';
import { registerAppelsOffresIpc } from './ipc/appels-offres.ipc';
import { registerVeilleReglementaireIpc } from './ipc/veille-reglementaire.ipc';
import { registerMaintenanceIpc } from './ipc/maintenance.ipc';
import { registerHousekeepingIpc } from './ipc/housekeeping.ipc';
import { registerCommercialIpc } from './ipc/commercial.ipc';
import { registerGedIpc } from './ipc/ged.ipc';
import { registerReportsIpc } from './ipc/reports.ipc';
import { registerComptabiliteIpc } from './ipc/comptabilite.ipc';
import { registerFiscaliteDzIpc } from './ipc/fiscalite-dz.ipc';
import { registerWorkflowIpc } from './ipc/workflow.ipc';
import { registerClotureIpc } from './ipc/cloture.ipc';
import { registerReconciliationIpc } from './ipc/reconciliation.ipc';
import { registerCreancesIpc } from './ipc/creances.ipc';
import { registerDecCockpitIpc } from './ipc/dec-cockpit.ipc';
import { registerDashboardPdgIpc } from './ipc/dashboard-pdg.ipc';
import { registerChecklistIpc } from './ipc/checklist.ipc';
import { registerHotelLegalIpc } from './ipc/hotel-legal.ipc';
import { registerGedArchivageIpc } from './ipc/ged-archivage.ipc';
import { registerSystemHealthIpc } from './ipc/system-health.ipc';
import { registerRgpdIpc } from './ipc/rgpd.ipc';
import { registerSifecIpc } from './ipc/sifec.ipc';
import { registerFiscaliteAvanceeIpc } from './ipc/fiscalite-avancee.ipc';
import { registerModulesLegauxIpc } from './ipc/modules-legaux.ipc';
import { registerLicenseIpc } from './ipc/license.ipc';
import { registerNotificationsIpc } from './ipc/notifications.ipc';
import { registerContratsHotelIpc } from './ipc/contrats-hotel.ipc';
import { registerCuisineIpc } from './ipc/cuisine.ipc';
import { registerPosIpc } from './ipc/pos.ipc';
import { registerGuideIpc } from './ipc/guide.ipc';
import { registerPmsExtensionsIpc } from './ipc/pms-extensions.ipc';
import { registerHardwareIpc } from './ipc/hardware.ipc';
import { ensureLicenseBootstrap, startLicenseBackgroundSync } from './services/license.service';
import { startPhase6BisScheduler } from './services/phase6-bis-scheduler.service';
import { runPortSeedIfNeeded } from './database/portSeed';
import { runProfileSeedIfNeeded } from './database/profileSeed';
import { runPortMigrateV2 } from './database/portMigrateV2';
import { logger } from './utils/logger';
import { loadDotEnvFile } from './utils/loadEnv';
import { clearWebContentsSession } from './services/session.service';
import { startAutomaticSyncScheduler } from './services/sync.service';
import {
  ensureLogoDirectories,
  parseLogoRequestPath,
  resolveLogoAbsolutePath,
} from './services/logo.service';

const APP_DISPLAY_NAME = 'Raqmi System';
const LEGACY_USER_DATA_DIR_NAME = 'hotel-metrics-pro-desktop';
let stopLicenseBackgroundSync: (() => void) | null = null;

Electron.app.setName(APP_DISPLAY_NAME);

function preserveExistingUserDataPath(): void {
  if (process.platform !== 'win32') return;
  const appData = Electron.app.getPath('appData');
  Electron.app.setPath('userData', path.join(appData, LEGACY_USER_DATA_DIR_NAME));
}

preserveExistingUserDataPath();

Electron.protocol.registerSchemesAsPrivileged([
  {
    scheme: 'hmp-logo',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isDev = !Electron.app.isPackaged;

let mainWindow: Electron.BrowserWindow | null = null;

function resolvePreloadPath(): string {
  for (const file of ['preload.mjs', 'preload.js', 'preload.cjs']) {
    const full = path.join(__dirname, file);
    if (existsSync(full)) return full;
  }
  return path.join(__dirname, 'preload.mjs');
}

function createWindow(): void {
  mainWindow = new Electron.BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    backgroundColor: '#071525',
    autoHideMenuBar: true,
    title: APP_DISPLAY_NAME,
    icon: resolveAppIconPath(),
    webPreferences: {
      preload: resolvePreloadPath(),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    if (process.env.HMP_DEVTOOLS === '1') {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) {
      void Electron.shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  const webContentsId = mainWindow.webContents.id;

  mainWindow.on('close', () => {
    clearWebContentsSession(webContentsId);
    mainWindow = null;
  });
}

Electron.ipcMain.handle('app:getVersion', () => Electron.app.getVersion());
Electron.ipcMain.handle('app:ping', () => ({ ok: true, timestamp: Date.now() }));

function getLegacyImportPath(): string | null {
  const eqArg = process.argv.find((a) => a.startsWith('--import-legacy='));
  if (eqArg) {
    return eqArg.slice('--import-legacy='.length).replace(/^["']|["']$/g, '');
  }
  const idx = process.argv.indexOf('--import-legacy');
  if (idx >= 0 && process.argv[idx + 1]) {
    return process.argv[idx + 1];
  }
  return null;
}

function logoMimeType(filePath: string): string {
  switch (path.extname(filePath).toLowerCase()) {
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    case '.svg':
      return 'image/svg+xml';
    default:
      return 'application/octet-stream';
  }
}

function registerLogoProtocol(): void {
  Electron.protocol.handle('hmp-logo', async (request) => {
    const relativePath = parseLogoRequestPath(request.url);
    const filePath = relativePath ? resolveLogoAbsolutePath(relativePath) : null;
    if (!filePath) {
      return new Response(null, { status: 404 });
    }
    try {
      const body = readFileSync(filePath);
      return new Response(body, {
        headers: {
          'Content-Type': logoMimeType(filePath),
          'Cache-Control': 'private, max-age=3600',
        },
      });
    } catch {
      return new Response(null, { status: 500 });
    }
  });
}

function bootstrap(): void {
  try {
    loadDotEnvFile();
    initDatabase();

    const importPath = getLegacyImportPath();
    if (importPath) {
      logger.info(`Mode import legacy : ${importPath}`);
      const result = importLegacyDatabase(importPath);
      console.log('\n=== Résultat import ===\n', JSON.stringify(result, null, 2));
      closeDatabase();
      Electron.app.quit();
      return;
    }

    runSeedIfNeeded(isDev);
    ensureBootstrapAuthAccounts(isDev);
    runProfileSeedIfNeeded();
    runPortSeedIfNeeded();
    runPortMigrateV2();
    ensureLogoDirectories();
    ensureLicenseBootstrap();
    installLicenseWriteGuard();
    registerAuthIpc();
    registerUsersIpc();
    registerHotelsIpc();
    registerRolesIpc();
    registerRubriquesIpc();
    registerAuditIpc();
    registerImportIpc();
    registerRecettesIpc();
    registerObjectifsIpc();
    registerDashboardIpc();
    registerPortmasterIpc();
    registerExportIpc();
    registerSyncIpc();
    registerSettingsIpc();
    registerDatabaseIpc();
    registerBackupIpc();
    registerTresorerieIpc();
    registerFacturationIpc();
    registerClientsIpc();
    registerHebergementIpc();
    registerTarifsIpc();
    registerYieldIpc();
    registerRhIpc();
    registerModulesIpc();
    registerAnomaliesIpc();
    registerDecisionsIpc();
    registerReclamationsIpc();
    registerStocksIpc();
    registerAchatsIpc();
    registerAppelsOffresIpc();
    registerVeilleReglementaireIpc();
    registerMaintenanceIpc();
    registerHousekeepingIpc();
    registerCommercialIpc();
    registerGedIpc();
    registerReportsIpc();
    registerComptabiliteIpc();
    registerFiscaliteDzIpc();
    registerWorkflowIpc();
    registerClotureIpc();
    registerReconciliationIpc();
    registerCreancesIpc();
    registerDecCockpitIpc();
    registerDashboardPdgIpc();
    registerChecklistIpc();
    registerHotelLegalIpc();
    registerGedArchivageIpc();
    registerSystemHealthIpc();
    registerRgpdIpc();
    registerSifecIpc();
    registerFiscaliteAvanceeIpc();
    registerModulesLegauxIpc();
    registerLicenseIpc();
    registerNotificationsIpc();
    registerContratsHotelIpc();
    registerCuisineIpc();
    registerPosIpc();
    registerGuideIpc();
    registerPmsExtensionsIpc();
    registerHardwareIpc();
    stopLicenseBackgroundSync = startLicenseBackgroundSync();
    startPhase6BisScheduler();
    startAutomaticSyncScheduler();
    createWindow();
  } catch (err) {
    logger.error('Échec initialisation application', err);
    Electron.app.quit();
  }
}

Electron.app.whenReady().then(() => {
  registerLogoProtocol();
  bootstrap();
});

Electron.app.on('activate', () => {
  if (Electron.BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

Electron.app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    Electron.app.quit();
  }
});

Electron.app.on('will-quit', () => {
  stopLicenseBackgroundSync?.();
  closeDatabase();
});
