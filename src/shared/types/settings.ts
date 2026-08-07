import type { BusinessSectorId } from './businessSector';

export interface AppSettingsDto {
  companyName: string;
  companyLegalName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  defaultHomePage: string;
  defaultCurrency: string;
  amountDecimals: number;
  dailyRevenueDeadline: string;
  validationRequired: boolean;
  correctionRequiresReason: boolean;
  autoBackupEnabled: boolean;
  autoBackupTime: string;
  backupRetentionCount: number;
  auditEnabled: boolean;
  reportHeader: string;
  reportFooter: string;
  companyLogoFile: string | null;
  companyLogoUrl: string | null;
  reportHeaderImageFile: string | null;
  reportHeaderImageUrl: string | null;
  reportFooterImageFile: string | null;
  reportFooterImageUrl: string | null;
  tauxTvaPort: number;
  maxLoginAttempts: number;
  lockoutMinutes: number;
  businessSector: BusinessSectorId;
}

export interface AppInfoDto {
  version: string;
  dataDirectory: string;
  databaseFile: string;
  settings: AppSettingsDto;
}
