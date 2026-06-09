import { memo, useMemo } from 'react';
import { SectionBlock } from '@/components/common/SectionBlock';
import { StatutHotelBadge } from '@/components/dashboard/StatutHotelBadge';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { formatMoney, formatPercent } from '@/lib/formatters';
import type {
  DashboardAuditRow,
  DashboardDto,
  DerniereDeclarationRow,
  HotelAnalyseRow,
  RubriqueAnalyseRow,
  SaisieManquanteRow,
} from '@/shared/types/dashboard';

const HOTEL_COLUMNS: Column<HotelAnalyseRow>[] = [
  { key: 'nom', header: 'Unité', render: (h) => <span className="font-medium">{h.hotelName}</span> },
  { key: 'real', header: 'Réalisé', render: (h) => formatMoney(h.realise) },
  { key: 'obj', header: 'Objectif', render: (h) => formatMoney(h.objectif) },
  { key: 'taux', header: 'Taux réal.', render: (h) => formatPercent(h.tauxRealisation) },
  { key: 'enc', header: 'Encaissements', render: (h) => formatMoney(h.encaissements) },
  { key: 'tenc', header: 'Taux enc.', render: (h) => formatPercent(h.tauxEncaissement) },
  { key: 'ecart', header: 'Écart', render: (h) => formatMoney(h.ecartObjectif) },
  { key: 'st', header: 'Statut', render: (h) => <StatutHotelBadge statut={h.statut} /> },
];

const RUBRIQUE_COLUMNS: Column<RubriqueAnalyseRow>[] = [
  { key: 'g', header: 'Rubrique', render: (r) => r.groupe },
  { key: 'm', header: 'Réalisé', render: (r) => formatMoney(r.realise) },
  { key: 'p', header: '% du total', render: (r) => formatPercent(r.pctTotal) },
  { key: 'o', header: 'Objectif', render: (r) => formatMoney(r.objectif) },
  {
    key: 't',
    header: 'Taux obj.',
    render: (r) => (r.objectif > 0 ? formatPercent(r.tauxObjectif) : '—'),
  },
];

const SAISIES_MANQUANTES_COLUMNS: Column<SaisieManquanteRow>[] = [
  { key: 'h', header: 'Hôtel', render: (r) => r.hotelName },
  { key: 'd', header: 'Date', render: (r) => r.dateAttendue },
];

const DECLARATIONS_COLUMNS: Column<DerniereDeclarationRow>[] = [
  { key: 'h', header: 'Hôtel', render: (r) => r.hotelName },
  { key: 'd', header: 'Date', render: (r) => r.dateJournal },
  { key: 'm', header: 'Montant', render: (r) => formatMoney(r.montant) },
  { key: 's', header: 'Statut', render: (r) => r.statut },
];

interface DashboardTablesSectionProps {
  data: DashboardDto;
}

function DashboardTablesSectionComponent({ data }: DashboardTablesSectionProps) {
  const auditColumns = useMemo<Column<DashboardAuditRow>[]>(
    () => [
      { key: 'd', header: 'Date', render: (a) => a.createdAt.slice(0, 16).replace('T', ' ') },
      { key: 'u', header: 'Utilisateur', render: (a) => a.userEmail ?? '—' },
      { key: 'p', header: 'Page', render: (a) => a.page ?? '—' },
      { key: 'x', header: 'Description', render: (a) => a.description },
    ],
    [],
  );

  return (
    <>
      <SectionBlock title="Synthèse CA par hôtel" noPadding>
        <DataTable
          embedded
          columns={HOTEL_COLUMNS}
          data={data.parHotel}
          keyExtractor={(h) => String(h.hotelId)}
        />
      </SectionBlock>

      <SectionBlock title="Synthèse CA par rubrique" noPadding>
        <DataTable
          embedded
          columns={RUBRIQUE_COLUMNS}
          data={data.parRubrique}
          keyExtractor={(r) => r.groupe}
        />
      </SectionBlock>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionBlock title="Saisies manquantes" noPadding>
          <DataTable
            embedded
            columns={SAISIES_MANQUANTES_COLUMNS}
            data={data.saisiesManquantes}
            keyExtractor={(r) => `${r.hotelId}-${r.dateAttendue}`}
            emptyMessage="Aucune unité sans saisie détectée."
          />
        </SectionBlock>
        <SectionBlock title="Dernières déclarations" noPadding>
          <DataTable
            embedded
            columns={DECLARATIONS_COLUMNS}
            data={data.dernieresDeclarations}
            keyExtractor={(r) => `${r.hotelName}-${r.dateJournal}`}
          />
        </SectionBlock>
      </div>

      {data.canViewAudit && (
        <SectionBlock title="Dernières actions utilisateur" description="Journal d'audit" noPadding>
          <DataTable
            embedded
            columns={auditColumns}
            data={data.auditRecent}
            keyExtractor={(a) => String(a.id)}
          />
        </SectionBlock>
      )}
    </>
  );
}

export const DashboardTablesSection = memo(DashboardTablesSectionComponent);
