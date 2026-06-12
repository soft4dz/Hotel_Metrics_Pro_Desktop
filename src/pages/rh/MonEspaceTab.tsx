import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { formatMoney } from '@/lib/formatters';
import type { RhMonEspace } from '@/shared/types/rh';

export function MonEspaceTab() {
  const [data, setData] = useState<RhMonEspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [pointage, setPointage] = useState({ date: new Date().toISOString().slice(0, 10), entree: '08:00', sortie: '17:00' });
  const [absence, setAbsence] = useState({ type: 'CP' as const, debut: '', fin: '', motif: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(unwrapIpc(await ipcClient.rh.getMonEspace()));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const savePointage = async () => {
    if (!data?.employe) return;
    try {
      const pt = unwrapIpc(await ipcClient.rh.upsertPointage({
        employeId: data.employe.id,
        date: pointage.date,
        heureEntree: pointage.entree,
        heureSortie: pointage.sortie,
      }));
      unwrapIpc(await ipcClient.rh.soumettrePointage(pt.id));
      void load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const demanderAbsence = async () => {
    if (!data?.employe || !absence.debut || !absence.fin) return;
    try {
      unwrapIpc(await ipcClient.rh.createAbsence({
        employeId: data.employe.id,
        type: absence.type,
        dateDebut: absence.debut,
        dateFin: absence.fin,
        motif: absence.motif || null,
      }));
      setAbsence({ type: 'CP', debut: '', fin: '', motif: '' });
      void load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur');
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  if (!data?.employe) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucune fiche employé liée à votre compte. Contactez les RH après validation d&apos;un recrutement.
      </p>
    );
  }

  const { employe, contratActif, pointagesRecents, absences } = data;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-lg border bg-card p-5 space-y-3">
        <h2 className="font-semibold">Mon profil</h2>
        <p className="text-lg font-medium">{employe.prenom} {employe.nom}</p>
        <p className="text-sm text-muted-foreground">{employe.posteNom ?? 'Sans poste'} — {employe.departementNom ?? '—'}</p>
        <Badge variant={employe.statutRh === 'actif' ? 'success' : 'muted'}>{employe.statutRh}</Badge>
        {contratActif && (
          <p className="text-sm">
            Contrat {contratActif.type} — {formatMoney(contratActif.salaireBrut)} brut / {contratActif.heuresHebdo} h sem.
          </p>
        )}
      </div>

      <div className="rounded-lg border bg-card p-5 space-y-3">
        <h2 className="font-semibold">Pointer ma journée</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          <div><Label>Date</Label><Input type="date" value={pointage.date} onChange={(e) => setPointage((p) => ({ ...p, date: e.target.value }))} /></div>
          <div><Label>Entrée</Label><Input type="time" value={pointage.entree} onChange={(e) => setPointage((p) => ({ ...p, entree: e.target.value }))} /></div>
          <div><Label>Sortie</Label><Input type="time" value={pointage.sortie} onChange={(e) => setPointage((p) => ({ ...p, sortie: e.target.value }))} /></div>
        </div>
        <Button onClick={() => void savePointage()}>Enregistrer et soumettre</Button>
      </div>

      <div className="rounded-lg border bg-card p-5 space-y-3">
        <h2 className="font-semibold">Demande d&apos;absence</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <Label>Type</Label>
            <select className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={absence.type} onChange={(e) => setAbsence((a) => ({ ...a, type: e.target.value as typeof absence.type }))}>
              {['CP', 'Maladie', 'RTT', 'Sans_solde', 'Autre'].map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div><Label>Début</Label><Input type="date" value={absence.debut} onChange={(e) => setAbsence((a) => ({ ...a, debut: e.target.value }))} /></div>
          <div><Label>Fin</Label><Input type="date" value={absence.fin} onChange={(e) => setAbsence((a) => ({ ...a, fin: e.target.value }))} /></div>
          <div className="sm:col-span-2"><Label>Motif</Label><Input value={absence.motif} onChange={(e) => setAbsence((a) => ({ ...a, motif: e.target.value }))} /></div>
        </div>
        <Button onClick={() => void demanderAbsence()}>Envoyer la demande</Button>
      </div>

      <div className="rounded-lg border bg-card p-5 space-y-2 lg:col-span-2">
        <h2 className="font-semibold">Historique récent</h2>
        <p className="text-xs text-muted-foreground mb-2">{pointagesRecents.length} pointage(s) — {absences.length} absence(s)</p>
        <ul className="text-sm space-y-1">
          {pointagesRecents.map((p) => (
            <li key={p.id}>{p.date} : {p.heureEntree}–{p.heureSortie} ({p.statut})</li>
          ))}
          {absences.slice(0, 5).map((a) => (
            <li key={a.id}>{a.type} {a.dateDebut}→{a.dateFin} ({a.statut})</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
