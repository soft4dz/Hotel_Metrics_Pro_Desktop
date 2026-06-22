import { useCallback, useEffect, useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, Banknote, FileText, FolderOpen, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { formatMoney } from '@/lib/formatters';
import type { HotelListItem } from '@/shared/types/admin';
import type {
  RhBulletin,
  RhDlgConfig,
  RhDlgJournalEntry,
  RhEmploye,
  RhPrime,
} from '@/shared/types/rh';

type SubTab = 'prepaie' | 'primes' | 'dlg' | 'declarations';

interface PaieTabProps {
  initialSub?: SubTab;
  compactNav?: boolean;
}

const STATUT_BADGE: Record<RhBulletin['statut'], 'muted' | 'warning' | 'success' | 'accent'> = {
  brouillon: 'muted',
  exporte: 'warning',
  importe: 'accent',
  valide: 'success',
};

export function PaieTab({ initialSub = 'prepaie', compactNav = false }: PaieTabProps) {
  const [sub, setSub] = useState<SubTab>(initialSub);
  const [periode, setPeriode] = useState(() => new Date().toISOString().slice(0, 7));
  const [bulletins, setBulletins] = useState<RhBulletin[]>([]);
  const [primes, setPrimes] = useState<RhPrime[]>([]);
  const [config, setConfig] = useState<RhDlgConfig | null>(null);
  const [journal, setJournal] = useState<RhDlgJournalEntry[]>([]);
  const [employes, setEmployes] = useState<RhEmploye[]>([]);
  const [hotels, setHotels] = useState<HotelListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [primeForm, setPrimeForm] = useState({ employeId: '', code: 'PRIME', libelle: '', montant: '' });
  const [prefixMatricule, setPrefixMatricule] = useState('HMP');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [b, p, c, j, emps, htls] = await Promise.all([
        ipcClient.rh.listBulletins(periode),
        ipcClient.rh.listPrimes(periode),
        ipcClient.rh.getDlgConfig(),
        ipcClient.rh.listDlgJournal(20),
        ipcClient.rh.listEmployes(),
        ipcClient.hotels.list(),
      ]);
      setBulletins(unwrapIpc(b));
      setPrimes(unwrapIpc(p));
      const cfg = unwrapIpc(c);
      setConfig(cfg);
      setPrefixMatricule(cfg.prefixMatricule);
      setJournal(unwrapIpc(j));
      setEmployes(unwrapIpc(emps).filter((e) => e.statutRh === 'actif'));
      setHotels(unwrapIpc(htls).filter((h) => h.isActive));
    } finally {
      setLoading(false);
    }
  }, [periode]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setSub(initialSub);
  }, [initialSub]);

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    try {
      await fn();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy('');
    }
  };

  const bulletinColumns: Column<RhBulletin>[] = [
    { key: 'employe', header: 'Employé', render: (b) => <span className="font-medium">{b.employeNom}</span> },
    { key: 'mat', header: 'Matricule DLG', render: (b) => b.dlgMatricule ?? '—' },
    { key: 'heures', header: 'Heures', render: (b) => `${b.heuresTravaillees} h` },
    { key: 'brut', header: 'Brut', render: (b) => formatMoney(b.brut) },
    { key: 'net', header: 'Net', render: (b) => formatMoney(b.net) },
    { key: 'statut', header: 'Statut', render: (b) => <Badge variant={STATUT_BADGE[b.statut]}>{b.statut}</Badge> },
    {
      key: 'actions',
      header: '',
      render: (b) => (
        <div className="flex gap-1 justify-end">
          {b.statut !== 'valide' && (
            <Button size="sm" variant="outline" onClick={() => void run('valider', async () => {
              unwrapIpc(await ipcClient.rh.validerBulletin(b.id));
              void load();
            })}>
              Valider
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            title="Bulletin PDF (mentions légales DZ)"
            onClick={() => void run('pdf', async () => {
              const res = unwrapIpc(await ipcClient.rh.exportBulletinPaiePdf(b.id));
              if (res.ok && res.filePath) alert(`Bulletin PDF : ${res.filePath}`);
            })}
          >
            <FileText className="h-4 w-4" />
          </Button>
          {(b.statut === 'valide' || b.statut === 'importe') && !b.tresorerieId && (
            <Button
              size="sm"
              variant="ghost"
              title="Comptabiliser en trésorerie"
              onClick={() => {
                const hotelId = hotels[0]?.id;
                if (!hotelId) {
                  alert('Aucune unité disponible.');
                  return;
                }
                void run('treso', async () => {
                  unwrapIpc(
                    await ipcClient.rh.comptabiliserBulletin(
                      b.id,
                      hotelId,
                      new Date().toISOString().slice(0, 10),
                    ),
                  );
                  void load();
                });
              }}
            >
              <Banknote className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const primeColumns: Column<RhPrime>[] = [
    { key: 'employe', header: 'Employé', render: (p) => p.employeNom },
    { key: 'code', header: 'Code', render: (p) => p.code },
    { key: 'libelle', header: 'Libellé', render: (p) => p.libelle },
    { key: 'montant', header: 'Montant', render: (p) => formatMoney(p.montant) },
    {
      key: 'actions',
      header: '',
      render: (p) => (
        <Button size="sm" variant="ghost" onClick={() => void run('del', async () => {
          unwrapIpc(await ipcClient.rh.deletePrime(p.id));
          void load();
        })}>
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {!compactNav && (
        <div className="flex flex-wrap gap-2">
          {(['prepaie', 'primes', 'dlg', 'declarations'] as const).map((t) => (
            <Button key={t} size="sm" variant={sub === t ? 'default' : 'outline'} onClick={() => setSub(t)}>
              {t === 'prepaie' ? 'Pré-paie' : t === 'primes' ? 'Primes' : t === 'dlg' ? 'Passerelle DLG' : 'Déclarations'}
            </Button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-4">
        <div>
          <Label>Période</Label>
          <Input type="month" value={periode} onChange={(e) => setPeriode(e.target.value)} className="w-40" />
        </div>
        {sub === 'prepaie' && (
          <Button
            disabled={!!busy}
            onClick={() => void run('generate', async () => {
              unwrapIpc(await ipcClient.rh.generatePrePaie(periode));
              void load();
            })}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Générer pré-paie
          </Button>
        )}
      </div>

      {sub === 'prepaie' && (
        <DataTable
          columns={bulletinColumns}
          data={bulletins}
          keyExtractor={(b) => b.id}
          loading={loading}
          emptyMessage="Aucun bulletin. Générez la pré-paie pour cette période."
        />
      )}

      {sub === 'primes' && (
        <div className="space-y-4">
          <div className="rounded-lg border p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <Label>Employé</Label>
              <select className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={primeForm.employeId} onChange={(e) => setPrimeForm((f) => ({ ...f, employeId: e.target.value }))}>
                <option value="">—</option>
                {employes.map((e) => <option key={e.id} value={e.id}>{e.prenom} {e.nom}</option>)}
              </select>
            </div>
            <div><Label>Code</Label><Input value={primeForm.code} onChange={(e) => setPrimeForm((f) => ({ ...f, code: e.target.value }))} /></div>
            <div><Label>Libellé</Label><Input value={primeForm.libelle} onChange={(e) => setPrimeForm((f) => ({ ...f, libelle: e.target.value }))} /></div>
            <div><Label>Montant</Label><Input type="number" value={primeForm.montant} onChange={(e) => setPrimeForm((f) => ({ ...f, montant: e.target.value }))} /></div>
            <div className="flex items-end">
              <Button
                onClick={() => void run('prime', async () => {
                  if (!primeForm.employeId || !primeForm.montant) return;
                  unwrapIpc(await ipcClient.rh.createPrime({
                    employeId: Number(primeForm.employeId),
                    periode,
                    code: primeForm.code,
                    libelle: primeForm.libelle || primeForm.code,
                    montant: Number(primeForm.montant),
                  }));
                  setPrimeForm({ employeId: '', code: 'PRIME', libelle: '', montant: '' });
                  void load();
                })}
              >
                <Plus className="mr-1 h-4 w-4" />
                Ajouter
              </Button>
            </div>
          </div>
          <DataTable columns={primeColumns} data={primes} keyExtractor={(p) => p.id} loading={loading} emptyMessage="Aucune prime." />
        </div>
      )}

      {sub === 'declarations' && (
        <div className="rounded-lg border p-4 space-y-4">
          <h3 className="font-semibold">Exports déclaratifs (DZ)</h3>
          <p className="text-sm text-muted-foreground">
            Fichiers CSV pour DAS annuelle, CNAS mensuelle, virements bancaires et déclarations ANEM.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={!!busy}
              onClick={() => void run('das', async () => {
                const annee = Number(periode.slice(0, 4));
                const res = unwrapIpc(await ipcClient.rh.exportDasAnnuelle(annee));
                if (res.filePath) alert(`DAS exportée : ${res.filePath}`);
              })}
            >
              <FileText className="mr-2 h-4 w-4" />
              DAS {periode.slice(0, 4)}
            </Button>
            <Button
              variant="outline"
              disabled={!!busy}
              onClick={() => void run('cnas', async () => {
                const res = unwrapIpc(await ipcClient.rh.exportCnasMensuelle(periode));
                if (res.filePath) alert(`CNAS exportée : ${res.filePath}`);
              })}
            >
              <FileText className="mr-2 h-4 w-4" />
              CNAS {periode}
            </Button>
            <Button
              variant="outline"
              disabled={!!busy}
              onClick={() => void run('virements', async () => {
                const res = unwrapIpc(await ipcClient.rh.exportVirementsPaie(periode));
                if (res.filePath) alert(`Virements exportés : ${res.filePath}`);
              })}
            >
              <Banknote className="mr-2 h-4 w-4" />
              Virements {periode}
            </Button>
            <Button
              variant="outline"
              disabled={!!busy}
              onClick={() => void run('anem', async () => {
                const res = unwrapIpc(await ipcClient.rh.exportAnemEmbauches());
                if (res.filePath) alert(`ANEM exporté : ${res.filePath}`);
              })}
            >
              <ArrowUpFromLine className="mr-2 h-4 w-4" />
              ANEM embauches
            </Button>
          </div>
        </div>
      )}

      {sub === 'dlg' && config && (
        <div className="space-y-6">
          <div className="rounded-lg border p-4 space-y-4">
            <h3 className="font-semibold">Configuration DLG PC PAIE</h3>
            <p className="text-sm text-muted-foreground">
              Échange bidirectionnel avec DLG PC PAIE : export ZIP (salariés + variables), import bulletins depuis ZIP ou CSV.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Dossier export (vers DLG)</Label>
                <div className="mt-1 flex gap-2">
                  <Input readOnly value={config.exportPath || '—'} className="text-xs" />
                  <Button size="icon" variant="outline" onClick={() => void run('pick-exp', async () => {
                    await ipcClient.rh.pickDlgFolder('export');
                    void load();
                  })}>
                    <FolderOpen className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div>
                <Label>Dossier import (depuis DLG)</Label>
                <div className="mt-1 flex gap-2">
                  <Input readOnly value={config.importPath || '—'} className="text-xs" />
                  <Button size="icon" variant="outline" onClick={() => void run('pick-imp', async () => {
                    await ipcClient.rh.pickDlgFolder('import');
                    void load();
                  })}>
                    <FolderOpen className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div>
                <Label>Préfixe matricule</Label>
                <div className="mt-1 flex gap-2">
                  <Input value={prefixMatricule} onChange={(e) => setPrefixMatricule(e.target.value)} className="w-32" />
                  <Button
                    variant="outline"
                    onClick={() => void run('prefix', async () => {
                      unwrapIpc(await ipcClient.rh.setDlgConfig({ prefixMatricule }));
                      void load();
                    })}
                  >
                    Enregistrer
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={!!busy}
                onClick={() => void run('export', async () => {
                  const res = unwrapIpc(await ipcClient.rh.exportVersDlg(periode));
                  alert(res.message);
                  void load();
                })}
              >
                <ArrowUpFromLine className="mr-2 h-4 w-4" />
                Exporter vers DLG
              </Button>
              <Button
                variant="outline"
                disabled={!!busy}
                onClick={() => void run('import', async () => {
                  const res = unwrapIpc(await ipcClient.rh.importDepuisDlg(periode));
                  alert(res.message);
                  void load();
                })}
              >
                <ArrowDownToLine className="mr-2 h-4 w-4" />
                Importer depuis dossier
              </Button>
              <Button
                variant="outline"
                disabled={!!busy}
                onClick={() => void run('import-file', async () => {
                  const file = unwrapIpc(await ipcClient.rh.pickDlgImportFile());
                  if (!file) return;
                  const res = unwrapIpc(await ipcClient.rh.importDepuisDlg(periode, file));
                  alert(res.message);
                  void load();
                })}
              >
                <ArrowDownToLine className="mr-2 h-4 w-4" />
                Choisir fichier ZIP/CSV
              </Button>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Dernier export : {config.lastExportAt ?? '—'}</p>
              <p>Dernier import : {config.lastImportAt ?? '—'}</p>
              <p>
                Export vers DLG : archive <code>DLG_EXPORT_… .zip</code> + dossier CSV (décompresser puis
                Fichier → Importer données depuis un dossier dans PC PAIE).
              </p>
              <p>
                Import depuis DLG : <code>BULLETINS_{periode.replace('-', '')}.zip</code> ou <code>.csv</code>
                {' '}(colonnes MATRICULE;BRUT;NET;CHARGES;HEURES).
              </p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Journal des échanges</h3>
            <ul className="text-sm divide-y border rounded-lg">
              {journal.length === 0 ? (
                <li className="p-3 text-muted-foreground">Aucun échange enregistré.</li>
              ) : (
                journal.map((j) => (
                  <li key={j.id} className="p-3 flex flex-wrap justify-between gap-2">
                    <span>
                      <Badge variant={j.sens === 'export' ? 'accent' : 'success'}>{j.sens}</Badge>
                      {' '}{j.periode ?? '—'} — {j.nbLignes} ligne(s)
                    </span>
                    <span className="text-xs text-muted-foreground truncate max-w-md">{j.fichier}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
