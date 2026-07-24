import { useQuery } from '@tanstack/react-query';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import type { RgpdPolitiqueConservation } from '@/shared/types/rgpd';

export function RgpdConservationPage() {
  const { data: politiques = [], isLoading } = useQuery({
    queryKey: ['rgpd-conservation'],
    queryFn: async () => unwrapIpc(await ipcClient.rgpd.listConservation()) as RgpdPolitiqueConservation[],
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Politiques de conservation alignées sur l&apos;archivage légal GED (Phase 2). Durées exprimées en mois.
      </p>
      {isLoading ? (
        <div className="h-32 bg-muted animate-pulse rounded-xl" />
      ) : (
        <div className="overflow-x-auto border rounded-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-2">Type</th>
                <th className="text-left px-4 py-2">Libellé</th>
                <th className="text-right px-4 py-2">Durée (mois)</th>
                <th className="text-left px-4 py-2">Politique GED</th>
                <th className="text-left px-4 py-2">Base légale</th>
              </tr>
            </thead>
            <tbody>
              {politiques.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="px-4 py-2">{p.typeDonnee}</td>
                  <td className="px-4 py-2">{p.libelle}</td>
                  <td className="px-4 py-2 text-right">{p.dureeMois}</td>
                  <td className="px-4 py-2 font-mono text-xs">{p.gedPolitiqueCode ?? '—'}</td>
                  <td className="px-4 py-2 text-muted-foreground">{p.baseLegale ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
