import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FileDown, Send } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { formatMoney } from '@/lib/formatters';
import type { FactureDto } from '@/shared/types/portmaster';

export function FactureDetailPage() {
  const { id } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const [f, setF] = useState<FactureDto | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [clientId, setClientId] = useState(0);
  const [montantHt, setMontantHt] = useState('0');
  const [clients, setClients] = useState<Array<{ id: number; label: string }>>([]);
  const [encMontant, setEncMontant] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    void ipcClient.portmaster.clientsOptions().then((r) => {
      if (r.ok && r.data) setClients(r.data);
    });
  }, []);

  useEffect(() => {
    if (isNew) return;
    const load = async () => {
      try {
        const data = unwrapIpc(await ipcClient.portmaster.getFacture(Number(id)));
        setF(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id, isNew]);

  const createHorsContrat = async () => {
    try {
      const created = unwrapIpc(
        await ipcClient.portmaster.createFacture({
          clientId,
          montantHt: parseFloat(montantHt) || 0,
          typeFacture: 'hors_contrat',
        }),
      );
      navigate(`/portmaster/factures/${created.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const submit = async () => {
    if (!f) return;
    unwrapIpc(await ipcClient.portmaster.submitFacture(f.id));
    const data = unwrapIpc(await ipcClient.portmaster.getFacture(f.id));
    setF(data);
  };

  const exportPdf = async () => {
    if (!f) return;
    const res = unwrapIpc(await ipcClient.export.facturePdf(f.id));
    if (res.ok && res.filePath) alert(`PDF enregistré : ${res.filePath}`);
    else if (res.message) alert(res.message);
  };

  const addPaiement = async () => {
    if (!f) return;
    const m = parseFloat(encMontant);
    if (!m) return;
    const updated = unwrapIpc(
      await ipcClient.portmaster.addPaiementFacture({
        factureId: f.id,
        dateEncaissement: new Date().toISOString().slice(0, 10),
        montant: m,
        modePaiement: 'Virement',
      }),
    );
    setF(updated);
    setEncMontant('');
  };

  if (loading) return <p className="text-sm text-muted-foreground">Chargement…</p>;

  if (isNew) {
    return (
      <div>
        <PageHeader title="Facture hors contrat" backTo="/portmaster/factures" />
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label>Client</Label>
              <select
                className="flex h-10 w-full rounded-md border px-3 text-sm"
                value={clientId || ''}
                onChange={(e) => setClientId(Number(e.target.value))}
              >
                <option value="">—</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Montant HT</Label>
              <Input value={montantHt} onChange={(e) => setMontantHt(e.target.value)} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button onClick={() => void createHorsContrat()}>Créer la facture</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!f) return <p className="text-destructive">{error || 'Facture introuvable'}</p>;

  return (
    <div className="page-shell">
      <PageHeader title={`Facture ${f.numero}`} backTo="/portmaster/factures" />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">TTC</p><p className="text-lg font-bold">{formatMoney(f.montantTtc)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Encaissé</p><p className="text-lg font-bold text-brand-success">{formatMoney(f.paye)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Reste</p><p className="text-lg font-bold text-brand-warning">{formatMoney(f.reste)}</p></CardContent></Card>
      </div>

      <p className="text-sm">
        Client : <strong>{f.clientName}</strong> — Statut : <strong>{f.statut}</strong>
        {f.contratNumero && (
          <>
            {' '}
            — Contrat :{' '}
            <Link className="text-brand-turquoise" to={`/portmaster/contrats/${f.contratId}`}>
              {f.contratNumero}
            </Link>
          </>
        )}
      </p>

      <div className="flex flex-wrap gap-2">
        {f.statut === 'brouillon' && (
          <Button onClick={() => void submit()}>
            <Send className="mr-2 h-4 w-4" />
            Soumettre à validation
          </Button>
        )}
        {f.canPrint && (
          <Button variant="outline" onClick={() => void exportPdf()}>
            <FileDown className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        )}
      </div>

      {f.statut === 'validee' || f.statut === 'payee_partiel' ? (
        <Card>
          <CardContent className="flex flex-wrap items-end gap-3 pt-4">
            <div className="space-y-1">
              <Label className="text-xs">Paiement</Label>
              <Input value={encMontant} onChange={(e) => setEncMontant(e.target.value)} placeholder="Montant" />
            </div>
            <Button onClick={() => void addPaiement()}>Enregistrer paiement</Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
