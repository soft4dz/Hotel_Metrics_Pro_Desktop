import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth.store';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';

export function useHotelsList() {
  const user = useAuthStore((s) => s.user);

  const { data: hotels = [], isLoading: loading, refetch } = useQuery({
    queryKey: ['hotels-list'],
    queryFn: async () => unwrapIpc(await ipcClient.hotels.list()),
    staleTime: 60_000,
  });

  /** Hôtels opérationnels (hors siège consolidation) */
  const operationalHotels = hotels.filter((h) => h.code !== 'SIEGE');

  const defaultHotelId =
    user?.hotelId ??
    (operationalHotels.length === 1
      ? operationalHotels[0].id
      : operationalHotels[0]?.id ?? hotels[0]?.id ?? 0);

  return { hotels, operationalHotels, loading, defaultHotelId, reload: () => { void refetch(); } };
}
