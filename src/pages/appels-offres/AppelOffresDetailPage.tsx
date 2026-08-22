import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Ban, Send, AlertCircle } from 'lucide-react';
import { useAppelsOffres } from '@/hooks/useAppelsOffres';
import { cn } from '@/lib/utils';
import { LotsTab } from './LotsTab';
import { DocumentsTab } from './DocumentsTab';
import { FournisseursTab } from './FournisseursTab';
import { OffresTab } from './OffresTab';
import { EvaluationTab } from './EvaluationTab';
import type { AppelOffres } from '@/shared/types/appelsOffres';

type Tab = 'lots' | 'documents' | 'fournisseurs' | 'offres' | 'evaluation';

const TABS: { id: Tab; label: string }[] = [
  { id: 'lots', label: 'Lots' },
  { id: 'documents', label: 'Documents' },
  { id: 'fournisseurs', label: 'Fournisseurs invités' },
  { id: 'offres', label: 'Offres & ouverture' },
  { id: 'evaluation', label: 'Évaluation & attribution' },
];

const STATUT_LABELS: Record<AppelOffres['statut'], string> = {
  brouillon: 'Brouillon', publie: 'Publié', ouvert: 'Ouvert', evaluation: 'Évaluation',
  attribue: 'Attribué', annule: 'Annulé',
};

function in15() { const d = new Date(); d.setDate(d.getDate() + 15); return d.toISOString().slice(0, 10); }

export function AppelOffresDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const appelOffresId = Number(id);
  const [active, setActive] = useState<Tab>('lots');
  const [error, setError] = useState<string | null>(null);
  const [dateLimite, setDateLimite] = useState(in15());
  const [busy, setBusy] = useState(false);

  const { data: dossiers, loading, publier, annuler } = useAppelsOffres();
  const dossier = dossiers.find((d) => d.id === appelOffresId);

  const handlePublier = async () => {
    setBusy(true); setError(null);
    try { await publier(appelOffresId, dateLimite); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  const handleAnnuler = async () => {
    const motif = window.prompt('Motif d’annulation ?');
    if (!motif) return;
    setBusy(true); setError(null);
    try { await annuler(appelOffresId, motif); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  if (loading) return <div className="h-40 rounded-xl border border-border/40 bg-slate-50 animate-pulse" />;
  if (!dossier) return (
    <div className="flex flex-col items-center py-16 text-center">
      <p className="text-sm text-muted-foreground">Dossier introuvable.</p>
      <button onClick={() => navigate('/appels-offres')} className="mt-3 text-sm text-primary hover:underline">Retour à la liste</button>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <button onClick={() => navigate('/appels-offres')}
            className="mt-0.5 rounded-lg border border-border p-2 hover:bg-slate-50">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold">{dossier.numero}</h1>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                {STATUT_LABELS[dossier.statut]}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{dossier.objet}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {dossier.statut === 'brouillon' && (
            <>
              <input type="date" className="rounded-lg border border-border px-2 py-1.5 text-xs"
                value={dateLimite} onChange={(e) => setDateLimite(e.target.value)} />
              <button onClick={() => void handlePublier()} disabled={busy}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-50">
                <Send className="h-3.5 w-3.5" /> Publier
              </button>
            </>
          )}
          {!['attribue', 'annule'].includes(dossier.statut) && (
            <button onClick={() => void handleAnnuler()} disabled={busy}
              className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">
              <Ban className="h-3.5 w-3.5" /> Annuler
            </button>
          )}
        </div>
      </div>

      {error && <p className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2"><AlertCircle className="h-3.5 w-3.5 shrink-0" />{error}</p>}

      <div className="border-b border-border">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button key={tab.id} onClick={() => setActive(tab.id)}
              className={cn(
                'whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
                active === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-slate-700 hover:border-slate-300',
              )}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        {active === 'lots' && <LotsTab dossier={dossier} />}
        {active === 'documents' && <DocumentsTab dossier={dossier} />}
        {active === 'fournisseurs' && <FournisseursTab dossier={dossier} />}
        {active === 'offres' && <OffresTab dossier={dossier} />}
        {active === 'evaluation' && <EvaluationTab dossier={dossier} />}
      </div>
    </div>
  );
}
