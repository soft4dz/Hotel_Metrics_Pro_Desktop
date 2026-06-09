import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Save } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useHotelsList } from '@/hooks/useHotelsList';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { formatMoney } from '@/lib/formatters';
import type { ObjectifDto, SaveObjectifInput } from '@/shared/types/objectifs';

const now = new Date();

function numField(value: string): number {
  const n = parseFloat(value.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function optNum(value: string): number | null {
  if (!value.trim()) return null;
  const n = parseFloat(value.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export function ObjectifFormPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();  const { hotels, defaultHotelId, loading: hotelsLoading } = useHotelsList();

  const [hotelId, setHotelId] = useState(Number(params.get('hotelId')) || 0);
  const [annee, setAnnee] = useState(Number(params.get('annee')) || now.getFullYear());
  const [mois, setMois] = useState(Number(params.get('mois')) || now.getMonth() + 1);
  const [loading, setLoading] = useState(Boolean(params.get('hotelId')));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dto, setDto] = useState<ObjectifDto | null>(null);

  const [objHeberg, setObjHeberg] = useState('0');
  const [objRestau, setObjRestau] = useState('0');
  const [objBoissons, setObjBoissons] = useState('0');
  const [objAutres, setObjAutres] = useState('0');
  const [capChambres, setCapChambres] = useState('');
  const [chVendues, setChVendues] = useState('');
  const [tauxOcc, setTauxOcc] = useState('');
  const [capResto, setCapResto] = useState('');
  const [couverts, setCouverts] = useState('');
  const [prixChambre, setPrixChambre] = useState('');

  useEffect(() => {
    if (defaultHotelId && !hotelId) setHotelId(defaultHotelId);
  }, [defaultHotelId, hotelId]);

  useEffect(() => {
    if (!hotelId || !annee || !mois) return;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const data = unwrapIpc(
          await ipcClient.objectifs.get(hotelId, annee, mois),
        );
        setDto(data);
        if (!data.canEdit) {
          setError('Vous n\'avez pas les droits de modification.');
        }
        setObjHeberg(String(data.objectifHebergement));
        setObjRestau(String(data.objectifRestauration));
        setObjBoissons(String(data.objectifBoissons));
        setObjAutres(String(data.objectifAutres));
        setCapChambres(data.capaciteChambres != null ? String(data.capaciteChambres) : '');
        setChVendues(data.chambresVendues != null ? String(data.chambresVendues) : '');
        setTauxOcc(
          data.tauxOccupationChambres != null ? String(data.tauxOccupationChambres) : '',
        );
        setCapResto(
          data.capaciteRestaurant != null ? String(data.capaciteRestaurant) : '',
        );
        setCouverts(data.couvertsVendus != null ? String(data.couvertsVendus) : '');
        setPrixChambre(data.prixMoyenChambre != null ? String(data.prixMoyenChambre) : '');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [hotelId, annee, mois]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hotelId) {
      setError('Sélectionnez un hôtel.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    const input: SaveObjectifInput = {
      hotelId,
      annee,
      mois,
      objectifHebergement: numField(objHeberg),
      objectifRestauration: numField(objRestau),
      objectifBoissons: numField(objBoissons),
      objectifAutres: numField(objAutres),
      capaciteChambres: optNum(capChambres),
      chambresVendues: optNum(chVendues),
      tauxOccupationChambres: optNum(tauxOcc),
      capaciteRestaurant: optNum(capResto),
      couvertsVendus: optNum(couverts),
      prixMoyenChambre: optNum(prixChambre),
    };
    try {
      unwrapIpc(await ipcClient.objectifs.save(input));
      setSuccess('Objectifs enregistrés.');
      setTimeout(() => navigate('/objectifs'), 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Chargement…
      </p>
    );
  }

  return (
    <div>
      <PageHeader title="Saisie objectifs" backTo="/objectifs" />

      {dto && (
        <div className="mb-4 grid gap-3 sm:grid-cols-4">
          {[
            { label: 'Hébergement réalisé', v: dto.realiseHebergement },
            { label: 'Restauration réalisée', v: dto.realiseRestauration },
            { label: 'Boissons réalisées', v: dto.realiseBoissons },
            { label: 'Autres réalisés', v: dto.realiseAutres },
          ].map((r) => (
            <div
              key={r.label}
              className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm"
            >
              <p className="text-muted-foreground">{r.label}</p>
              <p className="font-semibold">{formatMoney(r.v)}</p>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="page-shell">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Période et hôtel</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Hôtel</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={hotelId || ''}
                onChange={(e) => setHotelId(Number(e.target.value))}
                disabled={hotelsLoading || Boolean(params.get('hotelId'))}
                required
              >
                <option value="">—</option>
                {hotels.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Année</Label>
              <Input
                type="number"
                value={annee}
                onChange={(e) => setAnnee(Number(e.target.value))}
                min={2000}
                max={2100}
              />
            </div>
            <div className="space-y-2">
              <Label>Mois</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={mois}
                onChange={(e) => setMois(Number(e.target.value))}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {String(i + 1).padStart(2, '0')}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Objectifs chiffre d&apos;affaires (DZD)</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Hébergement</Label>
              <Input value={objHeberg} onChange={(e) => setObjHeberg(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Restauration</Label>
              <Input value={objRestau} onChange={(e) => setObjRestau(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Boissons</Label>
              <Input value={objBoissons} onChange={(e) => setObjBoissons(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Autres</Label>
              <Input value={objAutres} onChange={(e) => setObjAutres(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Indicateurs complémentaires</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Capacité chambres</Label>
              <Input value={capChambres} onChange={(e) => setCapChambres(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Chambres vendues</Label>
              <Input value={chVendues} onChange={(e) => setChVendues(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Taux occupation (%)</Label>
              <Input value={tauxOcc} onChange={(e) => setTauxOcc(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Capacité restaurant</Label>
              <Input value={capResto} onChange={(e) => setCapResto(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Couverts vendus</Label>
              <Input value={couverts} onChange={(e) => setCouverts(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Prix moyen chambre</Label>
              <Input value={prixChambre} onChange={(e) => setPrixChambre(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        {success && <p className="text-sm text-brand-success">{success}</p>}

        <Button type="submit" disabled={saving || dto?.canEdit === false}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Enregistrer
        </Button>
      </form>
    </div>
  );
}
