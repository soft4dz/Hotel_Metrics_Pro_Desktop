import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import type { HotelListItem } from '@/shared/types/admin';

export function useHotelsList() {
  const user = useAuthStore((s) => s.user);
  const [hotels, setHotels] = useState<HotelListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = unwrapIpc(await ipcClient.hotels.list());
      setHotels(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const defaultHotelId =
    user?.hotelId ?? (hotels.length === 1 ? hotels[0].id : hotels[0]?.id ?? 0);

  return { hotels, loading, defaultHotelId, reload: load };
}
