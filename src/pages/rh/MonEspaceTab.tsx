import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { ExternalLink } from 'lucide-react';
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

  const annulerAbsence = async (id: number) => {
    try {
      unwrapIpc(await ipcClient.rh.cancelAbsence(id));
      void load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Annulation impossible');
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

  const {
    employe, contratActif, affectationActive, pointagesRecents, absences,
    formationsProches, entretiensAvenir, soldesConges, dernierBulletin, onboarding, mesDocuments,
  } = data;

  const onboardingDone = onboarding.filter((s) => s.statut === 'fait').length;
  const onboardingTotal = onboarding.length;
  const onboardingEnCours = onboardingTotal > 0 && onboardingDone < onboardingTotal;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-lg border bg-card p-5 space-y-3">
        <h2 className="font-semibold">Mon profil</h2>
        <p className="text-lg font-medium">{employe.prenom} {employe.nom}</p>
        <p className="text-sm text-muted-foreground">{employe.posteNom ?? 'Sans poste'} — {employe.departementNom ?? '—'}</p>
        {affectationActive && (
          <p className="text-sm">
            Affectation : <strong>{affectationActive.hotelName}</strong>
            {' '}({affectationActive.type}) depuis {affectationActive.dateDebut}
          </p>
        )}
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

      {onboardingEnCours && (
        <div className="rounded-lg border bg-card p-5 space-y-3 lg:col-span-2">
          <h2 className="font-semibold">Mon intégration ({onboardingDone}/{onboardingTotal})</h2>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${(onboardingDone / onboardingTotal) * 100}%` }} />
          </div>
          <ul className="text-sm space-y-1">
            {onboarding.map((s) => (
              <li key={s.stepCode} className={s.statut === 'fait' ? 'text-muted-foreground line-through' : ''}>
                {s.stepLibelle}{s.obligatoire ? ' *' : ''}
              </li>
            ))}
          </ul>
        </div>
      )}

      {soldesConges.length > 0 && (
        <div className="rounded-lg border bg-card p-5 space-y-2">
          <h2 className="font-semibold">Mes soldes de congés</h2>
          <ul className="text-sm space-y-1">
            {soldesConges.map((s) => (
              <li key={s.id}>{s.type} {s.annee} : {s.reste} j restants ({s.pris}/{s.acquis} pris)</li>
            ))}
          </ul>
        </div>
      )}

      {dernierBulletin && (
        <div className="rounded-lg border bg-card p-5 space-y-2">
          <h2 className="font-semibold">Dernier bulletin</h2>
          <p className="text-sm">Période {dernierBulletin.periode}</p>
          <p className="text-sm">Brut {formatMoney(dernierBulletin.brut)} — Net {formatMoney(dernierBulletin.net)}</p>
          <Badge variant={dernierBulletin.statut === 'valide' ? 'success' : 'muted'}>{dernierBulletin.statut}</Badge>
        </div>
      )}

      {mesDocuments.length > 0 && (
        <div className="rounded-lg border bg-card p-5 space-y-2">
          <h2 className="font-semibold">Mes documents</h2>
          <ul className="text-sm space-y-1">
            {mesDocuments.map((d) => (
              <li key={d.id} className="flex justify-between items-center">
                <span>{d.nom} <span className="text-muted-foreground">({d.type})</span></span>
                <Button size="sm" variant="ghost" onClick={() => void ipcClient.rh.openRhDocument(d.id)}>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(formationsProches.length > 0 || entretiensAvenir.length > 0) && (
        <div className="rounded-lg border bg-card p-5 space-y-3 lg:col-span-2">
          <h2 className="font-semibold">Formations & entretiens</h2>
          {formationsProches.length > 0 && (
            <ul className="text-sm space-y-1">
              {formationsProches.map((f) => (
                <li key={f.id}>
                  {f.formationLibelle} — {f.statut}
                  {f.dateEcheance && <span className="text-muted-foreground"> (échéance {f.dateEcheance})</span>}
                </li>
              ))}
            </ul>
          )}
          {entretiensAvenir.length > 0 && (
            <ul className="text-sm space-y-1">
              {entretiensAvenir.map((e) => (
                <li key={e.id}>Entretien {e.type} le {e.dateEntretien}{e.evaluateurNom ? ` avec ${e.evaluateurNom}` : ''}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="rounded-lg border bg-card p-5 space-y-2 lg:col-span-2">
        <h2 className="font-semibold">Historique récent</h2>
        <p className="text-xs text-muted-foreground mb-2">{pointagesRecents.length} pointage(s) — {absences.length} absence(s)</p>
        <ul className="text-sm space-y-1">
          {pointagesRecents.map((p) => (
            <li key={p.id}>{p.date} : {p.heureEntree}–{p.heureSortie} ({p.statut})</li>
          ))}
          {absences.slice(0, 5).map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-2">
              <span>{a.type} {a.dateDebut}→{a.dateFin} ({a.cancelledAt ? 'annulée' : a.statut})</span>
              {a.statut === 'demandee' && !a.cancelledAt && <Button size="sm" variant="ghost" onClick={() => void annulerAbsence(a.id)}>Annuler</Button>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
