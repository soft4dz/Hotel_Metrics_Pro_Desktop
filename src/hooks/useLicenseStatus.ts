import { useCallback, useEffect, useState } from 'react';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import type { LicenseStatusDto } from '@/shared/types/license';

export function useLicenseStatus(pollMs = 5 * 60_000) {
  const [status, setStatus] = useState<LicenseStatusDto | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    if (!ipcClient.license?.getStatus) {
      setLoading(false);
      return Promise.resolve();
    }
    return ipcClient.license
      .getStatus()
      .then((result) => {
        setStatus(unwrapIpc(result));
      })
      .catch(() => setStatus(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void reload();
    if (pollMs <= 0) return;
    const id = window.setInterval(() => void reload(), pollMs);
    return () => window.clearInterval(id);
  }, [reload, pollMs]);

  return { status, loading, reload };
}
