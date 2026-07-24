import { useCallback, useEffect, useState } from 'react';
import { Fingerprint, Upload, RefreshCw } from 'lucide-react';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { notify } from '@/lib/toast';
import { useHotelsList } from '@/hooks/useHotelsList';
import type { RhPointeuse, RhRawPunch, TraiterPunchesResult } from '@/shared/types/rh';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export function PointeuseTab() {
  const { hotels } = useHotelsList();
  const [hotelId, setHotelId] = useState(hotels[0]?.id ?? 1);
  const [pointeuses, setPointeuses] = useState<RhPointeuse[]>([]);
  const [rawPunches, setRawPunches] = useState<RhRawPunch[]>([]);
  const [csvText, setCsvText] = useState('');
  const [lastResult, setLastResult] = useState<TraiterPunchesResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [newPointeuse, setNewPointeuse] = useState({ nom: '', marque: 'ZKTeco', adresseIp: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPointeuses(unwrapIpc(await ipcClient.rh.listPointeuses(hotelId)) as RhPointeuse[]);
      setRawPunches(unwrapIpc(await ipcClient.rh.listRawPunches(hotelId, false)) as RhRawPunch[]);
    } finally {
      setLoading(false);
    }
  }, [hotelId]);

  useEffect(() => { void load(); }, [load]);

  const handleImport = async () => {
    if (!csvText.trim()) {
      notify.error('Collez un export CSV de la pointeuse');
      return;
    }
    try {
      const res = unwrapIpc(await ipcClient.rh.importPointeuseCsv(hotelId, csvText)) as { imported: number; duplicates: number };
      notify.success(`${res.imported} pointage(s) importé(s), ${res.duplicates} doublon(s)`);
      setCsvText('');
      void load();
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Erreur import');
    }
  };

  const handleTraiter = async () => {
    try {
      const res = unwrapIpc(await ipcClient.rh.traiterRawPunches(hotelId)) as TraiterPunchesResult;
      setLastResult(res);
      notify.success(`${res.pointagesCrees} pointage(s) créé(s), ${res.pointagesMisAJour} mis à jour`);
      void load();
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Erreur traitement');
    }
  };

  const handleCreatePointeuse = async () => {
    if (!newPointeuse.nom.trim()) return;
    try {
      unwrapIpc(await ipcClient.rh.upsertPointeuse({
        hotelId,
        nom: newPointeuse.nom,
        marque: newPointeuse.marque,
        adresseIp: newPointeuse.adresseIp || null,
      }));
      setNewPointeuse({ nom: '', marque: 'ZKTeco', adresseIp: '' });
      void load();
      notify.success('Pointeuse enregistrée');
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Erreur');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Fingerprint className="w-6 h-6 text-blue-600" />
        <div className="flex-1">
          <h2 className="text-lg font-semibold">Pointeuses & import automatique</h2>
          <p className="text-sm text-muted-foreground">
            Import CSV (ZKTeco, Hikvision…) → pointages brouillon → validation N+1 inchangée. Les empreintes restent sur la pointeuse (conformité ANPDP).
          </p>
        </div>
        <select value={hotelId} onChange={(e) => setHotelId(Number(e.target.value))} className="border rounded-lg px-3 py-2 text-sm bg-background">
          {hotels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="border rounded-xl p-4 space-y-4">
          <h3 className="font-medium">Appareils enregistrés</h3>
          {pointeuses.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune pointeuse — ajoutez-en une pour tracer les imports.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {pointeuses.map((p) => (
                <li key={p.id} className="flex justify-between border-b pb-2">
                  <span>{p.nom} <span className="text-muted-foreground">({p.marque})</span></span>
                  <span className="text-xs text-muted-foreground">{p.derniereSync ? `Sync ${p.derniereSync}` : '—'}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            <input placeholder="Nom pointeuse" value={newPointeuse.nom} onChange={(e) => setNewPointeuse({ ...newPointeuse, nom: e.target.value })} className="border rounded px-2 py-1.5 text-sm flex-1 min-w-[120px]" />
            <input placeholder="IP (optionnel)" value={newPointeuse.adresseIp} onChange={(e) => setNewPointeuse({ ...newPointeuse, adresseIp: e.target.value })} className="border rounded px-2 py-1.5 text-sm w-32" />
            <Button size="sm" onClick={() => void handleCreatePointeuse()}>Ajouter</Button>
          </div>
        </div>

        <div className="border rounded-xl p-4 space-y-3">
          <h3 className="font-medium flex items-center gap-2"><Upload className="w-4 h-4" /> Import CSV</h3>
          <p className="text-xs text-muted-foreground">Colonnes attendues : badge_id (ou matricule), date/datetime, heure (optionnel), type (entree/sortie).</p>
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            rows={6}
            placeholder="badge_id,datetime,type&#10;1001,2026-07-24 08:02,entree&#10;1001,2026-07-24 17:15,sortie"
            className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
          />
          <div className="flex gap-2">
            <Button onClick={() => void handleImport()}><Upload className="w-4 h-4 mr-1" /> Importer</Button>
            <Button variant="outline" onClick={() => void handleTraiter()}>
              <RefreshCw className="w-4 h-4 mr-1" /> Générer pointages RH
            </Button>
          </div>
          {lastResult && (
            <p className="text-xs text-muted-foreground">
              Dernier traitement : {lastResult.joursTraites} jour(s), {lastResult.pointagesCrees} créés, {lastResult.pointagesMisAJour} MAJ, {lastResult.ignorés} ignorés (déjà validés).
            </p>
          )}
        </div>
      </div>

      <div className="border rounded-xl overflow-hidden">
        <div className="px-4 py-2 bg-muted/50 text-sm font-medium">Logs bruts non traités ({rawPunches.length})</div>
        {loading ? (
          <p className="p-4 text-sm text-muted-foreground">Chargement…</p>
        ) : rawPunches.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Aucun log en attente.</p>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-muted-foreground"><th className="p-2">Horodatage</th><th>Badge</th><th>Employé</th><th>Type</th></tr></thead>
            <tbody>
              {rawPunches.slice(0, 50).map((p) => (
                <tr key={p.id} className="border-b">
                  <td className="p-2">{p.punchAt}</td>
                  <td>{p.badgeId}</td>
                  <td>{p.employeNom ?? <Badge variant="warning">Non mappé</Badge>}</td>
                  <td>{p.typePunch ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Associez le badge au matricule pointeuse dans la fiche employé (champ badge) pour que l&apos;import génère les pointages automatiquement.
      </p>
    </div>
  );
}
