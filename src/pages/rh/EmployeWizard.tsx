import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WilayaCommuneFields } from '@/components/common/WilayaCommuneFields';
import {
  EtatCivilFields,
  emptyEtatCivil,
  etatCivilToPayload,
  type EtatCivilFormValues,
} from '@/components/rh/EtatCivilFields';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import type { HotelListItem } from '@/shared/types/admin';
import type { CreateEmployeWizardInput, RhEmploye, RhPoste, TypeContrat } from '@/shared/types/rh';

const STEPS = ['Identité', 'État civil', 'Poste & contrat', 'Social DZ', 'Dossier'] as const;
const CONTRAT_TYPES: TypeContrat[] = ['CDI', 'CDD', 'Interim'];

interface Props {
  onClose: () => void;
  onCreated: (employe: RhEmploye) => void;
}

const emptyForm = () => ({
  nom: '',
  prenom: '',
  email: '',
  telephone: '',
  nin: '',
  wilaya: '',
  commune: '',
  adresse: '',
  dateEmbauche: new Date().toISOString().slice(0, 10),
  hotelId: '',
  posteId: '',
  responsableId: '',
  dlgMatricule: '',
  typeContrat: 'CDI' as TypeContrat,
  salaireBrut: '',
  heuresHebdo: '40',
  nss: '',
  rib: '',
  bonusCongesSud: false,
  situationMilitaire: '',
});

export function EmployeWizard({ onClose, onCreated }: Props) {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [etatCivil, setEtatCivil] = useState<EtatCivilFormValues>(emptyEtatCivil);
  const [postes, setPostes] = useState<RhPoste[]>([]);
  const [hotels, setHotels] = useState<HotelListItem[]>([]);
  const [employes, setEmployes] = useState<RhEmploye[]>([]);

  useEffect(() => {
    void (async () => {
      const [pts, htls, emps] = await Promise.all([
        ipcClient.rh.listPostes(),
        ipcClient.hotels.list(),
        ipcClient.rh.listEmployes(),
      ]);
      setPostes(unwrapIpc(pts));
      setHotels(unwrapIpc(htls).filter((h) => h.isActive));
      setEmployes(unwrapIpc(emps).filter((e) => e.statutRh === 'actif'));
    })();
  }, []);

  const canNext = () => {
    if (step === 0) return form.nom.trim() && form.prenom.trim() && form.nin.trim();
    if (step === 1) {
      return (
        etatCivil.dateNaissance
        && etatCivil.sexe
        && etatCivil.lieuNaissanceWilaya
        && etatCivil.lieuNaissanceCommune
        && etatCivil.prenomPere.trim()
        && etatCivil.nomPere.trim()
        && etatCivil.prenomMere.trim()
        && etatCivil.nomMere.trim()
      );
    }
    if (step === 2) {
      return form.dateEmbauche && form.hotelId && form.posteId && form.salaireBrut && Number(form.salaireBrut) > 0;
    }
    if (step === 3) return form.nss.trim() && form.rib.trim().length >= 20;
    return true;
  };

  const submit = async () => {
    if (!canNext()) return;
    setBusy(true);
    try {
      const input: CreateEmployeWizardInput = {
        nom: form.nom.trim(),
        prenom: form.prenom.trim(),
        emailPersonnel: form.email.trim() || null,
        telephone: form.telephone.trim() || null,
        nin: form.nin.trim(),
        wilaya: form.wilaya.trim() || null,
        commune: form.commune.trim() || null,
        adresse: form.adresse.trim() || null,
        ...etatCivilToPayload(etatCivil),
        dateEmbauche: form.dateEmbauche,
        hotelId: Number(form.hotelId),
        posteActuelId: Number(form.posteId),
        responsableEmployeId: form.responsableId ? Number(form.responsableId) : null,
        dlgMatricule: form.dlgMatricule.trim() || null,
        typeContrat: form.typeContrat,
        salaireBrut: Number(form.salaireBrut),
        heuresHebdo: Number(form.heuresHebdo) || 40,
        nss: form.nss.trim(),
        rib: form.rib.trim(),
        bonusCongesSud: form.bonusCongesSud,
        situationMilitaire: form.situationMilitaire
          ? (form.situationMilitaire as CreateEmployeWizardInput['situationMilitaire'])
          : null,
      };
      const created = unwrapIpc(await ipcClient.rh.createEmployeWizard(input));
      onCreated(created);
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h3 className="font-semibold">Nouvel employé — assistant d&apos;embauche</h3>
          <p className="text-xs text-muted-foreground">Étape {step + 1} / {STEPS.length} · {STEPS[step]}</p>
        </div>
        <Button size="icon" variant="ghost" onClick={onClose}><X className="h-4 w-4" /></Button>
      </div>

      <div className="flex gap-2 px-4 pt-4">
        {STEPS.map((label, i) => (
          <div key={label} className="flex flex-1 items-center gap-2">
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                i <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              {i + 1}
            </div>
            <span className={`hidden text-xs sm:inline ${i === step ? 'font-medium' : 'text-muted-foreground'}`}>{label}</span>
            {i < STEPS.length - 1 && <div className="hidden h-px flex-1 bg-border sm:block" />}
          </div>
        ))}
      </div>

      <div className="grid gap-4 p-4 sm:grid-cols-2">
        {step === 0 && (
          <>
            <div><Label>Prénom *</Label><Input value={form.prenom} onChange={(e) => setForm((f) => ({ ...f, prenom: e.target.value }))} /></div>
            <div><Label>Nom *</Label><Input value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} /></div>
            <div><Label>NIN *</Label><Input value={form.nin} onChange={(e) => setForm((f) => ({ ...f, nin: e.target.value }))} placeholder="Numéro identification nationale" /></div>
            <div><Label>Téléphone</Label><Input value={form.telephone} onChange={(e) => setForm((f) => ({ ...f, telephone: e.target.value }))} /></div>
            <div><Label>E-mail</Label><Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></div>
            <WilayaCommuneFields
              wilaya={form.wilaya}
              commune={form.commune}
              onWilayaChange={(w) => setForm((f) => ({ ...f, wilaya: w }))}
              onCommuneChange={(c) => setForm((f) => ({ ...f, commune: c }))}
            />
            <div className="sm:col-span-2"><Label>Adresse (résidence)</Label><Input value={form.adresse} onChange={(e) => setForm((f) => ({ ...f, adresse: e.target.value }))} /></div>
          </>
        )}
        {step === 1 && (
          <div className="sm:col-span-2">
            <EtatCivilFields values={etatCivil} onChange={(p) => setEtatCivil((v) => ({ ...v, ...p }))} required />
          </div>
        )}
        {step === 2 && (
          <>
            <div><Label>Date d&apos;embauche *</Label><Input type="date" value={form.dateEmbauche} onChange={(e) => setForm((f) => ({ ...f, dateEmbauche: e.target.value }))} /></div>
            <div>
              <Label>Unité *</Label>
              <select className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={form.hotelId} onChange={(e) => setForm((f) => ({ ...f, hotelId: e.target.value }))}>
                <option value="">—</option>
                {hotels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Poste *</Label>
              <select className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={form.posteId} onChange={(e) => setForm((f) => ({ ...f, posteId: e.target.value }))}>
                <option value="">—</option>
                {postes.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
              </select>
            </div>
            <div>
              <Label>Type de contrat *</Label>
              <select className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={form.typeContrat} onChange={(e) => setForm((f) => ({ ...f, typeContrat: e.target.value as TypeContrat }))}>
                {CONTRAT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><Label>Salaire brut (DZD) *</Label><Input type="number" min={0} value={form.salaireBrut} onChange={(e) => setForm((f) => ({ ...f, salaireBrut: e.target.value }))} /></div>
            <div><Label>Heures hebdo</Label><Input type="number" value={form.heuresHebdo} onChange={(e) => setForm((f) => ({ ...f, heuresHebdo: e.target.value }))} /></div>
            <div>
              <Label>Responsable N+1</Label>
              <select className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={form.responsableId} onChange={(e) => setForm((f) => ({ ...f, responsableId: e.target.value }))}>
                <option value="">—</option>
                {employes.map((e) => <option key={e.id} value={e.id}>{e.prenom} {e.nom}</option>)}
              </select>
            </div>
            <div><Label>Matricule DLG</Label><Input value={form.dlgMatricule} onChange={(e) => setForm((f) => ({ ...f, dlgMatricule: e.target.value }))} /></div>
          </>
        )}
        {step === 3 && (
          <>
            <div><Label>NSS (CNAS) *</Label><Input value={form.nss} onChange={(e) => setForm((f) => ({ ...f, nss: e.target.value }))} /></div>
            <div><Label>RIB (20 chiffres) *</Label><Input value={form.rib} onChange={(e) => setForm((f) => ({ ...f, rib: e.target.value }))} maxLength={24} /></div>
            <div>
              <Label>Situation militaire</Label>
              <select className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={form.situationMilitaire} onChange={(e) => setForm((f) => ({ ...f, situationMilitaire: e.target.value }))}>
                <option value="">—</option>
                <option value="fait">Fait</option>
                <option value="exempte">Exempté</option>
                <option value="non_concerne">Non concerné</option>
                <option value="en_cours">En cours</option>
              </select>
            </div>
            <div className="flex items-center gap-2 pt-6 sm:col-span-2">
              <input type="checkbox" id="wizBonusSud" checked={form.bonusCongesSud} onChange={(e) => setForm((f) => ({ ...f, bonusCongesSud: e.target.checked }))} />
              <Label htmlFor="wizBonusSud">Bonus congés Sud (+10 j/an)</Label>
            </div>
          </>
        )}
        {step === 4 && (
          <div className="sm:col-span-2 space-y-3">
            <p className="text-sm text-muted-foreground">
              L&apos;employé, son contrat et son affectation seront créés automatiquement. Vous pourrez scanner le dossier GED (CIN, NSS, contrat) depuis la fiche employé juste après.
            </p>
            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              Pièces à fournir : CIN, attestation NSS, contrat signé, RIB, visite médicale, déclaration ANEM
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between border-t px-4 py-3">
        <Button variant="outline" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Précédent
        </Button>
        {step < STEPS.length - 1 ? (
          <Button disabled={!canNext()} onClick={() => setStep((s) => s + 1)}>
            Suivant <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button disabled={!canNext() || busy} onClick={() => void submit()}>
            {busy ? 'Création…' : 'Créer employé + contrat'}
          </Button>
        )}
      </div>
    </div>
  );
}
