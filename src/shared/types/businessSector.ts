export type { BusinessSectorId, SectorTerminology, BusinessSectorProfile } from '../constants/businessSectors';
import type { BusinessSectorId, SectorTerminology } from '../constants/businessSectors';

export interface BusinessSectorPublicDto {
  sectorId: BusinessSectorId;
  label: string;
  terminology: SectorTerminology;
  /** true = profil imposé par la licence, non modifiable chez le client */
  lockedByLicense: boolean;
}

export interface ApplyBusinessSectorResultDto {
  sectorId: BusinessSectorId;
  modulesUpdated: number;
}
