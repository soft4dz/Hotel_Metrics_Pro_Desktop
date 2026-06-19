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

  const defaultHotelId =
    user?.hotelId ?? (hotels.length === 1 ? hotels[0].id : hotels[0]?.id ?? 0);

  return { hotels, loading, defaultHotelId, reload: () => { void refetch(); } };
}
