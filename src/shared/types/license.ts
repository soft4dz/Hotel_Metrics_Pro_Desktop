export type LicenseEdition = 'STANDARD' | 'PRO' | 'ENTERPRISE' | 'TRIAL' | 'DEVELOPMENT';
export type LicenseState = 'active' | 'trial' | 'expired' | 'invalid' | 'development';

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
}
