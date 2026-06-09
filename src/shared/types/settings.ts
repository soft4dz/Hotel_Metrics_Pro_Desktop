export interface AppSettingsDto {
  tauxTvaPort: number;
  maxLoginAttempts: number;
  lockoutMinutes: number;
}

export interface AppInfoDto {
  version: string;
  dataDirectory: string;
  databaseFile: string;
  settings: AppSettingsDto;
}
