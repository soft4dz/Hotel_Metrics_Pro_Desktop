export type LicenseEdition = 'STANDARD' | 'PRO' | 'ENTERPRISE' | 'TRIAL' | 'DEVELOPMENT';
export type LicenseState = 'active' | 'trial' | 'expired' | 'revoked' | 'invalid' | 'development';
export type LicenseSource = 'offline' | 'remote' | 'development';
export type LicenseMode = 'offline' | 'remote';
export type LicenseAlertLevel = 'none' | 'info' | 'warning' | 'urgent' | 'expired';

import type { BusinessSectorId } from '../constants/businessSectors';

export interface LicenseStatusDto {
  state: LicenseState;
  edition: LicenseEdition | null;
  holder: string | null;
  expiresAt: string | null;
  daysRemaining: number | null;
  machineId: string;
  activatedAt: string | null;
  message: string;
  isPackaged: boolean;
  licenseSource: LicenseSource;
  licenseMode: LicenseMode;
  remoteServerUrl: string | null;
  organizationCode: string | null;
  lastRemoteSyncAt: string | null;
  remoteServerReachable: boolean | null;
  /** true = consultation autorisée, mutations bloquées */
  readOnlyMode: boolean;
  alertLevel: LicenseAlertLevel;
  alertMessage: string | null;
  /** Profil métier lié à la licence (défini côté éditeur Raqmi) */
  businessSector: BusinessSectorId;
  businessSectorLabel: string;
  /** Ex. « Professionnel · Commerce & distribution » */
  packLabel: string | null;
  licensedModuleCount: number | null;
}

export interface LicenseConfigDto {
  licenseMode: LicenseMode;
  remoteServerUrl: string;
  organizationCode: string;
  remoteServerReachable: boolean | null;
}
