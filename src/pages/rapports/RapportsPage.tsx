import { useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ComposedReportBuilder } from './components/ComposedReportBuilder';
import { KpiReportsTab } from './components/KpiReportsTab';
import { MyReportsTab } from './components/MyReportsTab';
import { QuickExportsTab } from './components/QuickExportsTab';

export function RapportsPage() {
  const [tab, setTab] = useState('compose');

  return (
    <div>
      <PageHeader
        title="Centre de rapports"
        description="Atelier Cognos — package sémantique, lignes × colonnes × mesures, croisé dynamique et graphiques."
      />
      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="flex h-auto flex-wrap gap-1">
          <TabsTrigger value="compose">Report Studio</TabsTrigger>
          <TabsTrigger value="kpi">Synthèses KPI</TabsTrigger>
          <TabsTrigger value="mine">Mes modèles</TabsTrigger>
          <TabsTrigger value="quick">Exports rapides</TabsTrigger>
        </TabsList>

        <TabsContent value="compose"><ComposedReportBuilder /></TabsContent>
        <TabsContent value="kpi"><KpiReportsTab /></TabsContent>
        <TabsContent value="mine"><MyReportsTab /></TabsContent>
        <TabsContent value="quick"><QuickExportsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
