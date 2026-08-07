import { useCallback, useEffect, useState } from 'react';
import { BRANDING_UPDATED_EVENT } from '@/lib/branding';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import {
  getBusinessSectorProfile,
  normalizeBusinessSectorId,
  type BusinessSectorId,
  type SectorTerminology,
} from '@/shared/constants/businessSectors';

const DEFAULT_TERMINOLOGY = getBusinessSectorProfile('generic').terminology;

export function useBusinessSector() {
  const [sectorId, setSectorId] = useState<BusinessSectorId>('hotel');
  const [label, setLabel] = useState('Hôtellerie & tourisme');
  const [terminology, setTerminology] = useState<SectorTerminology>(DEFAULT_TERMINOLOGY);

  const loadSector = useCallback(() => {
    void ipcClient.settings
      .getBusinessSector()
      .then((result) => {
        const data = unwrapIpc(result);
        const id = normalizeBusinessSectorId(data.sectorId);
        setSectorId(id);
        setLabel(data.label);
        setTerminology(data.terminology);
      })
      .catch(() => {
        const fallback = getBusinessSectorProfile('hotel');
        setSectorId('hotel');
        setLabel(fallback.label);
        setTerminology(fallback.terminology);
      });
  }, []);

  useEffect(() => {
    loadSector();
    window.addEventListener(BRANDING_UPDATED_EVENT, loadSector);
    return () => window.removeEventListener(BRANDING_UPDATED_EVENT, loadSector);
  }, [loadSector]);

  return { sectorId, label, terminology, reloadSector: loadSector };
}
