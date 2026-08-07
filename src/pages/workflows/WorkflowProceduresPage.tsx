import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { GitBranch, Save, Settings2 } from 'lucide-react';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { notify } from '@/lib/toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { WorkflowProcedureDto } from '@/shared/types/workflowProcedure';

const TRIGGER_LABELS: Record<string, string> = {
  manual: 'Manuel',
  always: 'Toujours',
  amount_threshold: 'Seuil montant TTC',
  amount_or_client_type: 'Seuil ou type client',
  ecart_detected: 'Écart détecté',
  gravite_incident: 'Gravité incident',
  transmission_echec: 'Échec transmission',
};

const MODE_LABELS: Record<string, string> = {
  hub: 'Hub central (/workflows)',
  module_only: 'Écran métier uniquement',
  hybrid: 'Hub + écran métier',
};

const ROLE_OPTIONS = [
  'PDG', 'ADMIN_DEC', 'SUPERADMIN', 'DIRECTEUR_UNITE', 'CONTROLEUR_UNITE',
  'COMPTABILITE', 'AUDIT_INTERNE', 'RH_MANAGER',
];

function ProcedureCard({ procedure }: { procedure: WorkflowProcedureDto }) {
  const qc = useQueryClient();
  const [seuil, setSeuil] = useState(() => {
    const cfg = procedure.triggerConfig ?? {};
    return String(cfg.defaultAmount ?? '');
  });
  const [rolesByStep, setRolesByStep] = useState<Record<number, string>>(() =>
    Object.fromEntries(procedure.steps.map((s) => [s.id, s.approverRoles.join(', ')])),
  );

  const saveProcedure = useMutation({
    mutationFn: async () => {
      const triggerConfig = { ...procedure.triggerConfig };
      if (seuil.trim()) triggerConfig.defaultAmount = Number(seuil);
      return unwrapIpc(await ipcClient.workflowProcedures.update(procedure.code, {
        triggerConfig,
        autoSubmit: procedure.autoSubmit,
        enabled: procedure.enabled,
      }));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workflow-procedures'] });
      notify.success('Procédure enregistrée');
    },
    onError: () => notify.error('Erreur enregistrement procédure'),
  });

  const saveStep = useMutation({
    mutationFn: async (stepId: number) => {
      const raw = rolesByStep[stepId] ?? '';
      const approverRoles = raw.split(',').map((r) => r.trim()).filter(Boolean);
      return unwrapIpc(await ipcClient.workflowProcedures.updateStep(stepId, { approverRoles }));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workflow-procedures'] });
      notify.success('Étape mise à jour');
    },
    onError: () => notify.error('Erreur mise à jour étape'),
  });

  const toggleEnabled = useMutation({
    mutationFn: async () =>
      unwrapIpc(await ipcClient.workflowProcedures.update(procedure.code, { enabled: !procedure.enabled })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflow-procedures'] }),
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{procedure.label}</CardTitle>
            <CardDescription className="mt-1">{procedure.description}</CardDescription>
            <p className="text-xs text-muted-foreground mt-2 font-mono">
              {procedure.module} · {procedure.entityType}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={procedure.enabled ? 'success' : 'muted'}>
              {procedure.enabled ? 'Active' : 'Désactivée'}
            </Badge>
            <Badge variant="muted">{TRIGGER_LABELS[procedure.triggerType] ?? procedure.triggerType}</Badge>
            <Badge variant="muted">{MODE_LABELS[procedure.approvalMode] ?? procedure.approvalMode}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {(procedure.triggerType === 'amount_threshold' || procedure.triggerType === 'amount_or_client_type') && (
          <div className="grid gap-2 max-w-xs">
            <Label htmlFor={`seuil-${procedure.code}`}>Seuil TTC (DA)</Label>
            <Input
              id={`seuil-${procedure.code}`}
              type="number"
              value={seuil}
              onChange={(e) => setSeuil(e.target.value)}
            />
          </div>
        )}

        <div className="space-y-3">
          <p className="text-sm font-medium">Étapes — qui fait quoi</p>
          {procedure.steps.map((step) => (
            <div key={step.id} className="rounded-lg border p-3 space-y-2 bg-muted/20">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">
                  {step.stepOrder}. {step.label}
                </span>
                <Badge variant="muted">{step.targetStatut}</Badge>
              </div>
              <div className="grid gap-2">
                <Label className="text-xs">Rôles approbateurs (séparés par virgule)</Label>
                <Input
                  value={rolesByStep[step.id] ?? ''}
                  onChange={(e) => setRolesByStep((prev) => ({ ...prev, [step.id]: e.target.value }))}
                  placeholder={ROLE_OPTIONS.join(', ')}
                />
                <p className="text-[11px] text-muted-foreground">
                  Rôles suggérés : {ROLE_OPTIONS.join(' · ')}
                </p>
                <Button size="sm" variant="outline" className="w-fit" onClick={() => saveStep.mutate(step.id)}>
                  Enregistrer cette étape
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button size="sm" onClick={() => saveProcedure.mutate()} disabled={saveProcedure.isPending}>
            <Save className="w-4 h-4 mr-1" /> Enregistrer seuil
          </Button>
          <Button size="sm" variant="outline" onClick={() => toggleEnabled.mutate()} disabled={toggleEnabled.isPending}>
            {procedure.enabled ? 'Désactiver' : 'Activer'}
          </Button>
          {procedure.moduleRoute && (
            <Button size="sm" variant="ghost" asChild>
              <Link to={procedure.moduleRoute}>Ouvrir écran métier</Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function WorkflowProceduresPage() {
  const { data: procedures = [], isLoading } = useQuery({
    queryKey: ['workflow-procedures'],
    queryFn: async () =>
      unwrapIpc(await ipcClient.workflowProcedures.list()) as WorkflowProcedureDto[],
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Settings2 className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Procédures de validation</h1>
            <p className="text-sm text-muted-foreground">
              Paramétrez qui valide quoi, quand le workflow se déclenche, et comment il est traité.
            </p>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link to="/workflows">
            <GitBranch className="w-4 h-4 mr-2" /> File d&apos;attente
          </Link>
        </Button>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6 text-sm space-y-2">
          <p><strong>Quand</strong> — type de déclencheur (seuil, écart, gravité…).</p>
          <p><strong>Qui</strong> — rôles habilités par étape (directeur unité, DEC, comptabilité…).</p>
          <p><strong>Comment</strong> — hub central, écran métier dédié, ou les deux.</p>
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {procedures.map((p) => (
            <ProcedureCard key={p.code} procedure={p} />
          ))}
        </div>
      )}
    </div>
  );
}
