import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, LogOut, Pencil, Scan, Upload, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WilayaCommuneFields } from '@/components/common/WilayaCommuneFields';
import {
  EtatCivilFields,
  etatCivilFromEmploye,
  etatCivilToPayload,
  type EtatCivilFormValues,
} from '@/components/rh/EtatCivilFields';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import type { HotelListItem } from '@/shared/types/admin';
import { formatMoney } from '@/lib/formatters';
import type {
  RhDossierEmploye,
  RhEmploye,
  RhPoste,
  RhStcPreview,
  TypeRuptureContrat,
} from '@/shared/types/rh';
import { SEXE_LABELS, SITUATION_FAMILIALE_LABELS } from '@/shared/types/rh';

type FicheSection = 'identite' | 'etatCivil' | 'contrat' | 'social' | 'dossier';

const SECTIONS: { id: FicheSection; label: string }[] = [
  { id: 'identite', label: 'Identité' },
  { id: 'etatCivil', label: 'État civil' },
  { id: 'contrat', label: 'Poste & contrat' },
  { id: 'social', label: 'Social DZ' },
  { id: 'dossier', label: 'Dossier GED' },
];

interface Props {
  employe: RhEmploye;
  postes: RhPoste[];
  hotels: HotelListItem[];
  onClose: () => void;
  onUpdated: (e: RhEmploye) => void;
  onSortie: () => void;
}

export function EmployeFiche360({ employe, postes, hotels, onClose, onUpdated, onSortie }: Props) {
  const [section, setSection] = useState<FicheSection>('identite');
  const [editMode, setEditMode] = useState(false);
  const [dossier, setDossier] = useState<RhDossierEmploye | null>(null);
  const [editForm, setEditForm] = useState(() => formFromEmploye(employe));
  const [etatCivilForm, setEtatCivilForm] = useState<EtatCivilFormValues>(() => etatCivilFromEmploye(employe));
  const [showRupture, setShowRupture] = useState(false);
  const [stcPreview, setStcPreview] = useState<RhStcPreview | null>(null);
  const [ruptureForm, setRuptureForm] = useState({
    dateSortie: new Date().toISOString().slice(0, 10),
    typeRupture: 'demission' as TypeRuptureContrat,
    motif: '',
    joursCongesRestants: '',
  });

  const loadDossier = useCallback(async () => {
    setDossier(unwrapIpc(await ipcClient.rh.getDossierEmploye(employe.id)));
  }, [employe.id]);

  useEffect(() => {
    setEditForm(formFromEmploye(employe));
    setEtatCivilForm(etatCivilFromEmploye(employe));
  }, [employe]);

  useEffect(() => {
    if (section === 'dossier') void loadDossier();
  }, [section, loadDossier]);

  const handleUpdate = async () => {
    try {
      const updated = unwrapIpc(await ipcClient.rh.updateEmploye(employe.id, {
        nom: editForm.nom.trim(),
        prenom: editForm.prenom.trim(),
        emailPersonnel: editForm.email.trim() || null,
        telephone: editForm.telephone.trim() || null,
        dateEmbauche: editForm.dateEmbauche,
        posteActuelId: editForm.posteId ? Number(editForm.posteId) : null,
        hotelId: editForm.hotelId ? Number(editForm.hotelId) : null,
        dlgMatricule: editForm.dlgMatricule.trim() || null,
        nin: editForm.nin.trim() || null,
        nss: editForm.nss.trim() || null,
        rib: editForm.rib.trim() || null,
        adresse: editForm.adresse.trim() || null,
        wilaya: editForm.wilaya.trim() || null,
        commune: editForm.commune.trim() || null,
        ...etatCivilToPayload(etatCivilForm),
        bonusCongesSud: editForm.bonusCongesSud,
        responsableEmployeId: editForm.responsableId ? Number(editForm.responsableId) : null,
      }));
      onUpdated(updated);
      setEditMode(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const loadStcPreview = async () => {
    try {
      const preview = unwrapIpc(
        await ipcClient.rh.previewStc({
          employeId: employe.id,
          dateSortie: ruptureForm.dateSortie,
          typeRupture: ruptureForm.typeRupture,
          motif: ruptureForm.motif || null,
          joursCongesRestants: ruptureForm.joursCongesRestants
            ? Number(ruptureForm.joursCongesRestants)
            : undefined,
        }),
      );
      setStcPreview(preview);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const handleRupture = async () => {
    if (!stcPreview) {
      await loadStcPreview();
      return;
    }
    if (!window.confirm(`Confirmer la rupture et le STC (net ${formatMoney(stcPreview.netAPayer)}) ?`)) return;
    try {
      unwrapIpc(
        await ipcClient.rh.processRuptureContrat({
          employeId: employe.id,
          dateSortie: ruptureForm.dateSortie,
          typeRupture: ruptureForm.typeRupture,
          motif: ruptureForm.motif || null,
          joursCongesRestants: ruptureForm.joursCongesRestants
            ? Number(ruptureForm.joursCongesRestants)
            : undefined,
        }),
      );
      onSortie();
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const incomplet = !employe.nin || !employe.nss || !employe.dateNaissance || !employe.nomPere;

  return (
    <div className="rounded-lg border bg-card space-y-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{employe.prenom} {employe.nom}</h3>
          <p className="text-sm text-muted-foreground">{employe.posteNom ?? 'Sans poste'} — {employe.hotelName ?? 'Sans unité'}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant={employe.statutRh === 'actif' ? 'success' : 'muted'}>{employe.statutRh}</Badge>
            {incomplet && <Badge variant="warning">Dossier incomplet</Badge>}
            {dossier && <Badge variant="muted">GED {dossier.tauxCompletude}%</Badge>}
          </div>
        </div>
        <Button size="icon" variant="ghost" onClick={onClose}><X className="h-4 w-4" /></Button>
      </div>

      <div className="flex flex-wrap gap-1 border-b pb-2">
        {SECTIONS.map((s) => (
          <Button key={s.id} size="sm" variant={section === s.id ? 'default' : 'ghost'} onClick={() => setSection(s.id)}>
            {s.label}
          </Button>
        ))}
      </div>

      {!editMode ? (
        <>
          {section === 'identite' && (
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <Field label="Prénom" value={employe.prenom} />
              <Field label="Nom" value={employe.nom} />
              <Field label="E-mail" value={employe.emailPersonnel} />
              <Field label="Téléphone" value={employe.telephone} />
              <Field label="NIN" value={employe.nin} required />
              <Field label="Wilaya (résidence)" value={employe.wilaya} />
              <Field label="Commune (résidence)" value={employe.commune} />
              <Field label="Adresse" value={employe.adresse} className="sm:col-span-2" />
            </div>
          )}
          {section === 'etatCivil' && (
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <Field label="Date de naissance" value={employe.dateNaissance} required />
              <Field label="Sexe" value={employe.sexe ? SEXE_LABELS[employe.sexe] : null} />
              <Field label="Wilaya de naissance" value={employe.lieuNaissanceWilaya} />
              <Field label="Commune de naissance" value={employe.lieuNaissanceCommune} />
              <Field label="Nationalité" value={employe.nationalite} />
              <Field label="N° acte de naissance" value={employe.numeroActeNaissance} />
              <Field
                label="Situation familiale"
                value={employe.situationFamiliale ? SITUATION_FAMILIALE_LABELS[employe.situationFamiliale] : null}
              />
              <Field label="Groupe sanguin" value={employe.groupeSanguin} />
              <Field label="Prénom du père" value={employe.prenomPere} required />
              <Field label="Nom du père" value={employe.nomPere} required />
              <Field label="Prénom de la mère" value={employe.prenomMere} required />
              <Field label="Nom de la mère" value={employe.nomMere} required />
              {(employe.situationFamiliale === 'marie' || employe.situationFamiliale === 'divorce' || employe.situationFamiliale === 'veuf') && (
                <>
                  <Field label="Prénom du conjoint" value={employe.conjointPrenom} />
                  <Field label="Nom du conjoint" value={employe.conjointNom} />
                  <Field label="Date de mariage" value={employe.dateMariage} />
                </>
              )}
              <Field label="Enfants à charge (IRG)" value={String(employe.enfantsCharge)} />
              <Field label="Enfants scolarisés" value={String(employe.enfantsScolarises)} />
            </div>
          )}
          {section === 'contrat' && (
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <Field label="Date embauche" value={employe.dateEmbauche} />
              <Field label="Poste" value={employe.posteNom} />
              <Field label="Unité" value={employe.hotelName} />
              <Field label="N+1" value={employe.responsableNom} />
              <Field label="Matricule DLG" value={employe.dlgMatricule} />
              <Field label="Type activité" value={employe.typeActivite} />
            </div>
          )}
          {section === 'social' && (
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <Field label="NSS" value={employe.nss} required />
              <Field label="RIB" value={employe.rib} required />
              <Field label="Bonus congés Sud" value={employe.bonusCongesSud ? 'Oui' : 'Non'} />
              <Field label="ANEM" value={employe.declarationAnemStatut} />
              <Field label="Situation militaire" value={employe.situationMilitaire} />
            </div>
          )}
          {section === 'dossier' && dossier && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {dossier.pieces.map((p) => (
                <div key={p.modele.code} className="rounded-md border p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium">{p.modele.libelle}</span>
                    {p.present ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Badge variant="danger">Manquant</Badge>}
                  </div>
                  {p.document ? (
                    <Button size="sm" variant="ghost" onClick={() => void ipcClient.rh.openRhDocument(p.document!.id)}>Ouvrir</Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => void scanPiece(employe.id, p.modele.code, loadDossier)}>
                      <Upload className="mr-1 h-3 w-3" /> Importer
                    </Button>
                  )}
                </div>
              ))}
              <div className="sm:col-span-2 lg:col-span-3">
                <Button variant="outline" onClick={() => void scanFolder(employe.id, loadDossier)}>
                  <Scan className="mr-2 h-4 w-4" /> Scanner un dossier complet
                </Button>
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {employe.statutRh === 'actif' && (
              <>
                <Button size="sm" onClick={() => { setEditForm(formFromEmploye(employe)); setEditMode(true); }}>
                  <Pencil className="mr-1 h-4 w-4" /> Modifier
                </Button>
                <Button size="sm" variant="outline" className="text-destructive" onClick={() => { setShowRupture((v) => !v); setStcPreview(null); }}>
                  <LogOut className="mr-1 h-4 w-4" /> Rupture & STC
                </Button>
              </>
            )}
          </div>
          {showRupture && employe.statutRh === 'actif' && (
            <div className="mt-4 space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <p className="text-sm font-medium">Sortie avec solde de tout compte (estimation DZ)</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><Label>Date de sortie</Label><Input type="date" value={ruptureForm.dateSortie} onChange={(e) => { setRuptureForm((f) => ({ ...f, dateSortie: e.target.value })); setStcPreview(null); }} /></div>
                <div>
                  <Label>Type de rupture</Label>
                  <select className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={ruptureForm.typeRupture} onChange={(e) => { setRuptureForm((f) => ({ ...f, typeRupture: e.target.value as TypeRuptureContrat })); setStcPreview(null); }}>
                    <option value="demission">Démission</option>
                    <option value="licenciement">Licenciement</option>
                    <option value="fin_cdd">Fin CDD</option>
                    <option value="retraite">Retraite</option>
                    <option value="rupture_conventionnelle">Rupture conventionnelle</option>
                  </select>
                </div>
                <div><Label>Jours congés restants (optionnel)</Label><Input type="number" min={0} value={ruptureForm.joursCongesRestants} onChange={(e) => { setRuptureForm((f) => ({ ...f, joursCongesRestants: e.target.value })); setStcPreview(null); }} /></div>
                <div><Label>Motif</Label><Input value={ruptureForm.motif} onChange={(e) => setRuptureForm((f) => ({ ...f, motif: e.target.value }))} /></div>
              </div>
              {stcPreview && (
                <div className="rounded-md border bg-background p-3 text-sm space-y-1">
                  <p>Ancienneté : {stcPreview.ancienneteMois} mois</p>
                  <p>Indemnité congés : {formatMoney(stcPreview.indemniteConges)}</p>
                  <p>Indemnité préavis : {formatMoney(stcPreview.indemnitePreavis)}</p>
                  <p>Indemnité licenciement : {formatMoney(stcPreview.indemniteLicenciement)}</p>
                  <p className="font-semibold">Net à payer : {formatMoney(stcPreview.netAPayer)}</p>
                  <p className="text-xs text-muted-foreground">{stcPreview.disclaimer}</p>
                </div>
              )}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => void loadStcPreview()}>Calculer STC</Button>
                <Button size="sm" variant="destructive" onClick={() => void handleRupture()}>Confirmer rupture</Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>Prénom</Label><Input value={editForm.prenom} onChange={(e) => setEditForm((f) => ({ ...f, prenom: e.target.value }))} /></div>
          <div><Label>Nom</Label><Input value={editForm.nom} onChange={(e) => setEditForm((f) => ({ ...f, nom: e.target.value }))} /></div>
          <div><Label>NIN</Label><Input value={editForm.nin} onChange={(e) => setEditForm((f) => ({ ...f, nin: e.target.value }))} /></div>
          <div><Label>NSS</Label><Input value={editForm.nss} onChange={(e) => setEditForm((f) => ({ ...f, nss: e.target.value }))} /></div>
          <div><Label>RIB</Label><Input value={editForm.rib} onChange={(e) => setEditForm((f) => ({ ...f, rib: e.target.value }))} /></div>
          <div><Label>Téléphone</Label><Input value={editForm.telephone} onChange={(e) => setEditForm((f) => ({ ...f, telephone: e.target.value }))} /></div>
          <div><Label>E-mail</Label><Input value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} /></div>
          <WilayaCommuneFields
            wilaya={editForm.wilaya}
            commune={editForm.commune}
            wilayaLabel="Wilaya (résidence)"
            communeLabel="Commune (résidence)"
            onWilayaChange={(w) => setEditForm((f) => ({ ...f, wilaya: w }))}
            onCommuneChange={(c) => setEditForm((f) => ({ ...f, commune: c }))}
          />
          <div className="sm:col-span-2"><Label>Adresse (résidence)</Label><Input value={editForm.adresse} onChange={(e) => setEditForm((f) => ({ ...f, adresse: e.target.value }))} /></div>
          <div className="sm:col-span-2 border-t pt-4">
            <EtatCivilFields
              values={etatCivilForm}
              onChange={(p) => setEtatCivilForm((v) => ({ ...v, ...p }))}
            />
          </div>
          <div>
            <Label>Poste</Label>
            <select className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={editForm.posteId} onChange={(e) => setEditForm((f) => ({ ...f, posteId: e.target.value }))}>
              <option value="">—</option>
              {postes.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
            </select>
          </div>
          <div>
            <Label>Unité</Label>
            <select className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={editForm.hotelId} onChange={(e) => setEditForm((f) => ({ ...f, hotelId: e.target.value }))}>
              <option value="">—</option>
              {hotels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2 flex gap-2">
            <Button onClick={() => void handleUpdate()}>Enregistrer</Button>
            <Button variant="outline" onClick={() => setEditMode(false)}>Annuler</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, required, className }: { label: string; value: string | null | undefined; required?: boolean; className?: string }) {
  const missing = required && (!value || value === '—');
  return (
    <p className={className}>
      <span className="text-muted-foreground">{label} :</span>{' '}
      <span className={missing ? 'text-destructive font-medium' : ''}>{value ?? '—'}</span>
      {missing && <Badge variant="danger" className="ml-2">Manquant</Badge>}
    </p>
  );
}

function formFromEmploye(e: RhEmploye) {
  return {
    nom: e.nom,
    prenom: e.prenom,
    email: e.emailPersonnel ?? '',
    telephone: e.telephone ?? '',
    dateEmbauche: e.dateEmbauche,
    posteId: e.posteActuelId ? String(e.posteActuelId) : '',
    hotelId: e.hotelId ? String(e.hotelId) : '',
    dlgMatricule: e.dlgMatricule ?? '',
    nin: e.nin ?? '',
    nss: e.nss ?? '',
    rib: e.rib ?? '',
    adresse: e.adresse ?? '',
    wilaya: e.wilaya ?? '',
    commune: e.commune ?? '',
    bonusCongesSud: e.bonusCongesSud,
    responsableId: e.responsableEmployeId ? String(e.responsableEmployeId) : '',
  };
}

async function scanPiece(employeId: number, code: string, reload: () => void) {
  try {
    unwrapIpc(await ipcClient.rh.scanSingleDocument(employeId, code));
    reload();
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Erreur');
  }
}

async function scanFolder(employeId: number, reload: () => void) {
  try {
    const docs = unwrapIpc(await ipcClient.rh.scanDossierFolder(employeId));
    alert(`${docs.length} document(s) importé(s).`);
    reload();
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Erreur');
  }
}
