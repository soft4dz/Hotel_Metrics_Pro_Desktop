import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FileText, Loader2, Save, Send, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { formatMoney } from '@/lib/formatters';
import type { BateauOption, EmplacementOption, SaveContratInput } from '@/shared/types/portmaster';

export function ContratFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id && id !== 'new');
  const navigate = useNavigate();

  const [bateaux, setBateaux] = useState<BateauOption[]>([]);
  const [emplacements, setEmplacements] = useState<EmplacementOption[]>([]);
  const [numero, setNumero] = useState('');
  const [bateauId, setBateauId] = useState(0);
  const [emplacementId, setEmplacementId] = useState(0);
  const [dateDebut, setDateDebut] = useState(new Date().toISOString().slice(0, 10));
  const [dateFin, setDateFin] = useState('');
  const [montantMensuel, setMontantMensuel] = useState('0');
  const [montantTotal, setMontantTotal] = useState('0');
  const [statut, setStatut] = useState('actif');
  const [observation, setObservation] = useState('');
  const [encaisse, setEncaisse] = useState(0);
  const [reste, setReste] = useState(0);

  const [encDate, setEncDate] = useState(new Date().toISOString().slice(0, 10));
  const [encMontant, setEncMontant] = useState('');
  const [encMode, setEncMode] = useState('Virement');
  const [encRef, setEncRef] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const init = async () => {
      try {
        const [bOpts, eOpts] = await Promise.all([
          ipcClient.portmaster.bateauxOptions(),
          ipcClient.portmaster.listEmplacementsLibres(),
        ]);
        setBateaux(unwrapIpc(bOpts));
        setEmplacements(unwrapIpc(eOpts));

        if (isEdit && id) {
          const c = unwrapIpc(await ipcClient.portmaster.getContrat(Number(id)));
          if (!c) {
            setError('Contrat introuvable');
            return;
          }
          setNumero(c.numero);
          setBateauId(c.bateauId);
          setEmplacementId(c.emplacementId);
          setDateDebut(c.dateDebut);
          setDateFin(c.dateFin ?? '');
          setMontantMensuel(String(c.montantMensuel));
          setMontantTotal(String(c.montantTotal));
          setStatut(c.statut);
          setObservation(c.observation ?? '');
          setEncaisse(c.encaisse);
          setReste(c.resteARecouvrer);
          setEmplacements((prev) => {
            const exists = prev.some((e) => e.id === c.emplacementId);
            if (exists) return prev;
            return [
              ...prev,
              {
                id: c.emplacementId,
                code: c.emplacementCode,
                label: c.emplacementCode,
                statut: 'occupe',
              },
            ];
          });
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur');
      } finally {
        setLoading(false);
      }
    };
    void init();
  }, [id, isEdit]);

  const buildInput = (): SaveContratInput => ({
    numero,
    bateauId,
    emplacementId,
    dateDebut,
    dateFin: dateFin || null,
    montantMensuel: parseFloat(montantMensuel) || 0,
    montantTotal: parseFloat(montantTotal) || 0,
    statut,
    observation: observation || null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const saved = unwrapIpc(
        await ipcClient.portmaster.saveContrat(buildInput(),
          isEdit && id ? Number(id) : undefined,
        ),
      );
      navigate(`/portmaster/contrats/${saved.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitValidation = async () => {
    if (!isEdit || !id) return;
    setSaving(true);
    setError('');
    try {
      unwrapIpc(await ipcClient.portmaster.submitContrat(Number(id)));
      setStatut('soumis');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateFacture = async () => {
    if (!isEdit || !id) return;
    setSaving(true);
    setError('');
    try {
      const facture = unwrapIpc(
        await ipcClient.portmaster.createFactureFromContrat(Number(id)),
      );
      navigate(`/portmaster/factures/${facture.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleEncaissement = async () => {
    if (!isEdit || !id) return;
    const montant = parseFloat(encMontant);
    if (!montant || montant <= 0) {
      setError('Montant d\'encaissement invalide.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const c = unwrapIpc(
        await ipcClient.portmaster.addEncaissement({
          contratId: Number(id),
          dateEncaissement: encDate,
          montant,
          modePaiement: encMode,
          reference: encRef || null,
        }),
      );
      setEncaisse(c.encaisse);
      setReste(c.resteARecouvrer);
      setEncMontant('');
      setEncRef('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Chargement…</p>;
  }

  return (
    <div className="page-shell">
      <PageHeader
        title={isEdit ? `Contrat ${numero}` : 'Nouveau contrat'}
        backTo="/portmaster/contrats"
      />

      {isEdit && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border bg-muted/40 px-4 py-3">
            <p className="text-xs text-muted-foreground">Montant total</p>
            <p className="text-lg font-semibold">{formatMoney(parseFloat(montantTotal) || 0)}</p>
          </div>
          <div className="rounded-lg border bg-muted/40 px-4 py-3">
            <p className="text-xs text-muted-foreground">Encaissé</p>
            <p className="text-lg font-semibold text-brand-success">{formatMoney(encaisse)}</p>
          </div>
          <div className="rounded-lg border bg-muted/40 px-4 py-3">
            <p className="text-xs text-muted-foreground">Reste à recouvrer</p>
            <p className="text-lg font-semibold text-brand-warning">{formatMoney(reste)}</p>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>N° contrat *</Label>
                <Input value={numero} onChange={(e) => setNumero(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Statut</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input px-3 text-sm"
                  value={statut}
                  onChange={(e) => setStatut(e.target.value)}
                >
                  <option value="brouillon">Brouillon</option>
                  <option value="soumis">Soumis</option>
                  <option value="valide">Validé</option>
                  <option value="actif">Actif</option>
                  <option value="resilie">Résilié</option>
                  <option value="expire">Expiré</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Bateau *</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input px-3 text-sm"
                  value={bateauId || ''}
                  onChange={(e) => setBateauId(Number(e.target.value))}
                  required
                >
                  <option value="">—</option>
                  {bateaux.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nom}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Emplacement *</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input px-3 text-sm"
                  value={emplacementId || ''}
                  onChange={(e) => setEmplacementId(Number(e.target.value))}
                  required
                >
                  <option value="">—</option>
                  {emplacements.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.code} — {e.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Date début *</Label>
                <Input
                  type="date"
                  value={dateDebut}
                  onChange={(e) => setDateDebut(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Date fin</Label>
                <Input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Montant mensuel (DZD)</Label>
                <Input
                  type="number"
                  value={montantMensuel}
                  onChange={(e) => setMontantMensuel(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Montant total (DZD)</Label>
                <Input
                  type="number"
                  value={montantTotal}
                  onChange={(e) => setMontantTotal(e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Observation</Label>
                <Input value={observation} onChange={(e) => setObservation(e.target.value)} />
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Enregistrer le contrat
              </Button>
              {isEdit && statut === 'brouillon' && (
                <Button type="button" variant="secondary" disabled={saving} onClick={() => void handleSubmitValidation()}>
                  <Send className="mr-2 h-4 w-4" />
                  Soumettre à validation
                </Button>
              )}
              {isEdit && (statut === 'actif' || statut === 'valide') && (
                <Button type="button" variant="outline" disabled={saving} onClick={() => void handleGenerateFacture()}>
                  <FileText className="mr-2 h-4 w-4" />
                  Générer une facture
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {isEdit && id && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="h-4 w-4" />
              Enregistrer un encaissement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Date</Label>
                <Input
                  type="date"
                  value={encDate}
                  onChange={(e) => setEncDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Montant</Label>
                <Input
                  type="number"
                  value={encMontant}
                  onChange={(e) => setEncMontant(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Mode</Label>
                <select
                  className="h-10 rounded-md border border-input px-2 text-sm"
                  value={encMode}
                  onChange={(e) => setEncMode(e.target.value)}
                >
                  <option>Virement</option>
                  <option>Chèque</option>
                  <option>Espèces</option>
                  <option>Carte</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Référence</Label>
                <Input value={encRef} onChange={(e) => setEncRef(e.target.value)} />
              </div>
              <Button type="button" onClick={() => void handleEncaissement()} disabled={saving}>
                Ajouter
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
