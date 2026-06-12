import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Banknote, TrendingUp, UserCheck, UserPlus, Users } from 'lucide-react';
import { KpiCard } from '@/components/common/KpiCard';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { formatMoney } from '@/lib/formatters';
import type { RhDashboard } from '@/shared/types/rh';

export function RhDashboardTab() {
  const [data, setData] = useState<RhDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(unwrapIpc(await ipcClient.rh.getDashboard()));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <p className="text-sm text-muted-foreground">Chargement des indicateurs…</p>;
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground">
        Période : {data.periodeDebut} → {data.periodeFin}
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Effectif actif" value={String(data.effectifActif)} icon={Users} accent="primary" />
        <KpiCard title="Recrutements en cours" value={String(data.recrutementsEnCours)} icon={UserPlus} accent="accent" />
        <KpiCard title="Absences à valider" value={String(data.absencesEnAttente)} icon={AlertCircle} accent="warning" />
        <KpiCard title="Comptes en attente" value={String(data.comptesEnAttente)} icon={UserCheck} accent="gold" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          title="Recettes / effectif"
          value={formatMoney(data.recettesParEffectif)}
          subtitle="Total recettes ÷ effectif moyen"
          icon={TrendingUp}
          accent="success"
        />
        <KpiCard
          title="Taux de présence"
          value={`${data.tauxPresence} %`}
          icon={UserCheck}
          accent="primary"
        />
        <KpiCard
          title="Taux d'absentéisme"
          value={`${data.tauxAbsenteisme} %`}
          icon={AlertCircle}
          accent="warning"
        />
        <KpiCard
          title="Masse salariale"
          value={formatMoney(data.masseSalariale)}
          subtitle="Brut + charges (45 %)"
          icon={Banknote}
          accent="neutral"
        />
        <KpiCard
          title="Coût moyen / employé"
          value={formatMoney(data.coutMoyenEmploye)}
          icon={Banknote}
          accent="accent"
        />
        <KpiCard
          title="Turnover"
          value={`${data.tauxTurnover} %`}
          subtitle="Départs ÷ effectif moyen"
          icon={Users}
          accent="danger"
        />
      </div>

      {data.pointagesASoumettre > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {data.pointagesASoumettre} pointage(s) en attente de validation.
        </div>
      )}
    </div>
  );
}
