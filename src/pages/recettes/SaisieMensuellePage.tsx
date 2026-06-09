import { useCallback, useEffect, useState } from 'react';
import { Lock, Save } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useHotelsList } from '@/hooks/useHotelsList';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { formatMoney } from '@/lib/formatters';
import type { RecetteMensuelleDto } from '@/shared/types/recettes';

const now = new Date();

export function SaisieMensuellePage() {  const { hotels, defaultHotelId } = useHotelsList();

  const [hotelId, setHotelId] = useState(0);
  const [annee, setAnnee] = useState(now.getFullYear());
  const [mois, setMois] = useState(now.getMonth() + 1);
  const [data, setData] = useState<RecetteMensuelleDto | null>(null);
  const [justificationEcart, setJustificationEcart] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (defaultHotelId && !hotelId) setHotelId(defaultHotelId);
  }, [defaultHotelId, hotelId]);

  const load = useCallback(async () => {
    if (!hotelId) return;
    setLoading(true);
    setError('');
    try {
      const result = unwrapIpc(
        await ipcClient.recettes.getMensuelle(hotelId, annee, mois),
      );
      setData(result);
      setJustificationEcart(result.justificationEcart ?? '');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, [hotelId, annee, mois]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateMensuel = (rubriqueId: number, value: string) => {
    if (!data) return;
    const montantMensuel = parseFloat(value) || 0;
    const lignes = data.lignes.map((l) => {
      if (l.rubriqueId !== rubriqueId) return l;
      const ecart = montantMensuel - l.montantJournalier;
      return { ...l, montantMensuel, ecart };
    });
    const totalMensuel = lignes.reduce((s, l) => s + l.montantMensuel, 0);
    setData({
      ...data,
      lignes,
      totalMensuel,
      ecart: totalMensuel - data.totalJournalier,
    });
  };

  const save = async (verrouiller: boolean) => {
    if (!data) return;
    try {
      const result = unwrapIpc(
        await ipcClient.recettes.saveMensuelle(hotelId, annee, mois, {
          lignes: data.lignes.map((l) => ({
            rubriqueId: l.rubriqueId,
            montantMensuel: l.montantMensuel,
            justification:
              Math.abs(l.ecart) > 0.01 ? l.justification ?? undefined : undefined,
          })),
          justificationEcart,
          verrouiller,
        }),
      );
      setData(result);
      alert(verrouiller ? 'Mois verrouillé.' : 'Saisie mensuelle enregistrée.');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const moisLabels = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
  ];

  return (
    <div>
      <PageHeader
        title="Saisie mensuelle"
        description="Consolidation et écarts par rapport au cumul journalier"
      />

      <Card className="mb-6">
        <CardContent className="flex flex-wrap gap-4 pt-6">
          <div className="space-y-2">
            <Label>Hôtel</Label>
            <select
              className="flex h-10 min-w-[200px] rounded-md border px-3 text-sm"
              value={hotelId}
              onChange={(e) => setHotelId(Number(e.target.value))}
            >
              {hotels.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Mois</Label>
            <select
              className="flex h-10 rounded-md border px-3 text-sm"
              value={mois}
              onChange={(e) => setMois(Number(e.target.value))}
            >
              {moisLabels.map((label, i) => (
                <option key={label} value={i + 1}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Année</Label>
            <Input
              type="number"
              className="w-28"
              value={annee}
              onChange={(e) => setAnnee(Number(e.target.value))}
            />
          </div>
          <Button variant="secondary" className="self-end" onClick={() => void load()}>
            Charger
          </Button>
        </CardContent>
      </Card>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">Chargement...</p>}

      {data && !loading && (
        <>
          <div className="mb-4 grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Cumul journalier validé</p>
                <p className="text-xl font-bold">{formatMoney(data.totalJournalier)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Total mensuel saisi</p>
                <p className="text-xl font-bold text-brand-turquoise">
                  {formatMoney(data.totalMensuel)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Écart</p>
                <p
                  className={`text-xl font-bold ${
                    Math.abs(data.ecart) > 0.01 ? 'text-brand-warning' : 'text-brand-success'
                  }`}
                >
                  {formatMoney(data.ecart)}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left">Rubrique</th>
                    <th className="px-4 py-3 text-right">Cumul journalier</th>
                    <th className="px-4 py-3 text-right">Montant mensuel</th>
                    <th className="px-4 py-3 text-right">Écart</th>
                  </tr>
                </thead>
                <tbody>
                  {data.lignes.map((l) => (
                    <tr key={l.rubriqueId} className="border-b">
                      <td className="px-4 py-2">{l.rubriqueLabel}</td>
                      <td className="px-4 py-2 text-right text-muted-foreground">
                        {formatMoney(l.montantJournalier)}
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          type="number"
                          className="ml-auto max-w-[140px] text-right"
                          disabled={data.verrouille}
                          value={l.montantMensuel}
                          onChange={(e) => updateMensuel(l.rubriqueId, e.target.value)}
                        />
                      </td>
                      <td
                        className={`px-4 py-2 text-right font-medium ${
                          Math.abs(l.ecart) > 0.01 ? 'text-brand-warning' : ''
                        }`}
                      >
                        {formatMoney(l.ecart)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {Math.abs(data.ecart) > 0.01 && (
            <div className="mt-4 space-y-2">
              <Label>Justification écart global</Label>
              <Input
                disabled={data.verrouille}
                value={justificationEcart}
                onChange={(e) => setJustificationEcart(e.target.value)}
              />
            </div>
          )}

          {!data.verrouille && (
            <div className="mt-6 flex gap-3">
              <Button onClick={() => void save(false)}>
                <Save className="h-4 w-4" />
                Enregistrer
              </Button>
              <Button variant="secondary" onClick={() => void save(true)}>
                <Lock className="h-4 w-4" />
                Valider et verrouiller le mois
              </Button>
            </div>
          )}

          {data.verrouille && (
            <p className="mt-4 text-sm font-medium text-brand-success">
              Ce mois est verrouillé — plus de modification possible.
            </p>
          )}
        </>
      )}
    </div>
  );
}
