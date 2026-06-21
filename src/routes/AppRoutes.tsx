import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AuthLayout } from '@/layouts/AuthLayout';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { ModuleErrorBoundary } from '@/components/common/ModuleErrorBoundary';
import { LoginPage } from '@/pages/auth/LoginPage';
import { MandatoryPasswordChangePage } from '@/pages/auth/MandatoryPasswordChangePage';
import { UsersPage } from '@/pages/administration/UsersPage';
import { UserFormPage } from '@/pages/administration/UserFormPage';
import { HotelsPage } from '@/pages/administration/HotelsPage';
import { HotelFormPage } from '@/pages/administration/HotelFormPage';
import { RolesPage } from '@/pages/administration/RolesPage';
import { RubriquesPage } from '@/pages/administration/RubriquesPage';
import { AuditLogPage } from '@/pages/audit/AuditLogPage';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { RequireAuth } from '@/routes/RequireAuth';
import { RequirePasswordChanged } from '@/routes/RequirePasswordChanged';
import { DefaultRedirect } from '@/routes/DefaultRedirect';
import { RequirePermission } from '@/routes/RequirePermission';
import { RequireRecettesView } from '@/routes/RequireRecettesView';
import { SaisieJournalierePage } from '@/pages/recettes/SaisieJournalierePage';
import { HistoriqueRecettesPage } from '@/pages/recettes/HistoriqueRecettesPage';
import { ValidationRecettesPage } from '@/pages/recettes/ValidationRecettesPage';
import { SaisieMensuellePage } from '@/pages/recettes/SaisieMensuellePage';
import { ObjectifsPage } from '@/pages/objectifs/ObjectifsPage';
import { ObjectifFormPage } from '@/pages/objectifs/ObjectifFormPage';
import { RequireObjectifsView } from '@/routes/RequireObjectifsView';
import { RequireModuleEnabled } from '@/routes/RequireModuleEnabled';
import { RequirePortmaster } from '@/routes/RequirePortmaster';
import PortDashboardPage from '@/pages/portmaster/PortDashboardPage';
import { BateauxPage } from '@/pages/portmaster/BateauxPage';
import { BateauFormPage } from '@/pages/portmaster/BateauFormPage';
import { ContratsPage } from '@/pages/portmaster/ContratsPage';
import { ContratFormPage } from '@/pages/portmaster/ContratFormPage';
import { EmplacementsPage } from '@/pages/portmaster/EmplacementsPage';
import { ClientsPage } from '@/pages/portmaster/ClientsPage';
import { ClientFormPage } from '@/pages/portmaster/ClientFormPage';
import { ReferentielPortPage } from '@/pages/portmaster/ReferentielPortPage';
import { FacturesPage } from '@/pages/portmaster/FacturesPage';
import { FactureDetailPage } from '@/pages/portmaster/FactureDetailPage';
import { TarifsPage } from '@/pages/portmaster/TarifsPage';
import { ValidationsPortPage } from '@/pages/portmaster/ValidationsPortPage';
import { MouvementsPage } from '@/pages/portmaster/MouvementsPage';
import { RecouvrementPage } from '@/pages/portmaster/RecouvrementPage';
import { RapportsPage } from '@/pages/rapports/RapportsPage';
import { RequireReportsExport } from '@/routes/RequireReportsExport';
import { SyncPage } from '@/pages/system/SyncPage';
import { SettingsPage } from '@/pages/system/SettingsPage';
import { DatabasePage } from '@/pages/system/DatabasePage';
import { BackupPage } from '@/pages/system/BackupPage';
import { InterfaceThemePage } from '@/pages/system/InterfaceThemePage';
import { NotificationsPage } from '@/pages/system/NotificationsPage';
import { SecuriteAccesPage } from '@/pages/system/SecuriteAccesPage';
import { RequireSystemAdmin } from '@/routes/RequireSystemAdmin';
import { RequireSync } from '@/routes/RequireSync';
import { ModulesIndexPage } from '@/pages/modules/ModulesIndexPage';
import { ModulePlaceholderPage } from '@/pages/modules/ModulePlaceholderPage';
import { TresorerieIndexPage } from '@/pages/tresorerie/TresorerieIndexPage';
import { TresorerieBoard } from '@/pages/tresorerie/TresorerieBoard';
import { EncaissementsListPage } from '@/pages/tresorerie/EncaissementsListPage';
import { SaisieEncaissementPage } from '@/pages/tresorerie/SaisieEncaissementPage';
import { JournalCaissePage } from '@/pages/tresorerie/JournalCaissePage';
import { ComptesBancairesPage } from '@/pages/tresorerie/ComptesBancairesPage';
import { FacturationIndexPage } from '@/pages/facturation/FacturationIndexPage';
import { FacturationBoard } from '@/pages/facturation/FacturationBoard';
import { FacturesListPage } from '@/pages/facturation/FacturesListPage';
import { NouvelleFacturePage } from '@/pages/facturation/NouvelleFacturePage';
import { FactureDetailPage as FactureDetailFacturationPage } from '@/pages/facturation/FactureDetailPage';
import { ClientsListPage } from '@/pages/clients/ClientsListPage';
import { ClientDetailPage } from '@/pages/clients/ClientDetailPage';
import { NouveauClientPage } from '@/pages/clients/NouveauClientPage';
import { HebergementPage } from '@/pages/hebergement/HebergementPage';
import { TarifsPage as HotelTarifsPage } from '@/pages/tarifs/TarifsPage';
import { RhPage } from '@/pages/rh/RhPage';
import { RhReferentielPage } from '@/pages/system/RhReferentielPage';
import { RequireRh } from '@/routes/RequireRh';
import { PERMISSIONS } from '@/shared/permissions';
import AnomaliesPage from '@/pages/anomalies/AnomaliesPage';
import DecisionsPage from '@/pages/decisions/DecisionsPage';
import ReclamationsPage from '@/pages/reclamations/ReclamationsPage';
import ParkingPage from '@/pages/parking/ParkingPage';
import PlagePage from '@/pages/plage/PlagePage';
import StocksPage from '@/pages/stocks/StocksPage';
import AchatsPage from '@/pages/achats/AchatsPage';
import MaintenancePage from '@/pages/maintenance/MaintenancePage';
import CommercialPage from '@/pages/commercial/CommercialPage';
import GedPage from '@/pages/ged/GedPage';

const DashboardGlobalPage = lazy(() =>
  import('@/pages/dashboard/DashboardGlobalPage').then((m) => ({ default: m.DashboardGlobalPage })),
);

const dashboardFallback = (
  <div className="flex min-h-[320px] items-center justify-center gap-2 text-muted-foreground">
    <Loader2 className="h-6 w-6 animate-spin text-primary" />
    Chargement…
  </div>
);

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<AuthLayout />}>
          <Route path="/change-password-required" element={<MandatoryPasswordChangePage />} />
        </Route>

        <Route element={<RequirePasswordChanged />}>
          <Route
            element={
              <ProtectedRoute>
                <ModuleErrorBoundary moduleName="Application">
                  <DashboardLayout />
                </ModuleErrorBoundary>
              </ProtectedRoute>
            }
          >
            <Route element={<RequireModuleEnabled />}>
            <Route path="/dashboard" element={<Suspense fallback={dashboardFallback}><DashboardGlobalPage /></Suspense>} />
            <Route path="/modules" element={<ModulesIndexPage />} />
            <Route path="/modules/:moduleId" element={<ModulePlaceholderPage />} />

            <Route path="/objectifs" element={<RequireObjectifsView><ObjectifsPage /></RequireObjectifsView>} />
            <Route path="/objectifs/edit" element={<RequireObjectifsView><ObjectifFormPage /></RequireObjectifsView>} />

            <Route path="/admin/users" element={<RequirePermission permission={PERMISSIONS.USERS_MANAGE}><UsersPage /></RequirePermission>} />
            <Route path="/admin/users/new" element={<RequirePermission permission={PERMISSIONS.USERS_MANAGE}><UserFormPage /></RequirePermission>} />
            <Route path="/admin/users/:id" element={<RequirePermission permission={PERMISSIONS.USERS_MANAGE}><UserFormPage /></RequirePermission>} />
            <Route path="/admin/hotels" element={<RequirePermission permission={PERMISSIONS.HOTELS_MANAGE}><HotelsPage /></RequirePermission>} />
            <Route path="/admin/hotels/new" element={<RequirePermission permission={PERMISSIONS.HOTELS_MANAGE}><HotelFormPage /></RequirePermission>} />
            <Route path="/admin/hotels/:id" element={<RequirePermission permission={PERMISSIONS.HOTELS_MANAGE}><HotelFormPage /></RequirePermission>} />
            <Route path="/admin/roles" element={<RequirePermission permission={PERMISSIONS.USERS_MANAGE}><RolesPage /></RequirePermission>} />
            <Route path="/admin/rubriques" element={<RequirePermission permission={PERMISSIONS.HOTELS_MANAGE}><RubriquesPage /></RequirePermission>} />

            <Route path="/recettes/journalieres" element={<RequirePermission permission={PERMISSIONS.RECETTES_SAISIE}><SaisieJournalierePage /></RequirePermission>} />
            <Route path="/recettes/historique" element={<RequireRecettesView><HistoriqueRecettesPage /></RequireRecettesView>} />
            <Route path="/recettes/validation" element={<RequirePermission permission={PERMISSIONS.RECETTES_VALIDATE}><ValidationRecettesPage /></RequirePermission>} />
            <Route path="/recettes/mensuelles" element={<RequirePermission permission={PERMISSIONS.RECETTES_SAISIE}><SaisieMensuellePage /></RequirePermission>} />

            <Route path="/portmaster" element={<RequirePortmaster><PortDashboardPage /></RequirePortmaster>} />
            <Route path="/portmaster/bateaux" element={<RequirePortmaster><BateauxPage /></RequirePortmaster>} />
            <Route path="/portmaster/bateaux/new" element={<RequirePortmaster><BateauFormPage /></RequirePortmaster>} />
            <Route path="/portmaster/bateaux/:id" element={<RequirePortmaster><BateauFormPage /></RequirePortmaster>} />
            <Route path="/portmaster/contrats" element={<RequirePortmaster><ContratsPage /></RequirePortmaster>} />
            <Route path="/portmaster/contrats/new" element={<RequirePortmaster><ContratFormPage /></RequirePortmaster>} />
            <Route path="/portmaster/contrats/:id" element={<RequirePortmaster><ContratFormPage /></RequirePortmaster>} />
            <Route path="/portmaster/emplacements" element={<RequirePortmaster><EmplacementsPage /></RequirePortmaster>} />
            <Route path="/portmaster/referentiel" element={<RequirePortmaster><ReferentielPortPage /></RequirePortmaster>} />
            <Route path="/portmaster/clients" element={<RequirePortmaster><ClientsPage /></RequirePortmaster>} />
            <Route path="/portmaster/clients/new" element={<RequirePortmaster><ClientFormPage /></RequirePortmaster>} />
            <Route path="/portmaster/clients/:id" element={<RequirePortmaster><ClientFormPage /></RequirePortmaster>} />
            <Route path="/portmaster/factures" element={<RequirePortmaster><FacturesPage /></RequirePortmaster>} />
            <Route path="/portmaster/factures/new" element={<RequirePortmaster><FactureDetailPage /></RequirePortmaster>} />
            <Route path="/portmaster/factures/:id" element={<RequirePortmaster><FactureDetailPage /></RequirePortmaster>} />
            <Route path="/portmaster/tarifs" element={<RequirePortmaster><TarifsPage /></RequirePortmaster>} />
            <Route path="/portmaster/validations" element={<RequirePortmaster><ValidationsPortPage /></RequirePortmaster>} />
            <Route path="/portmaster/mouvements" element={<RequirePortmaster><MouvementsPage /></RequirePortmaster>} />
            <Route path="/portmaster/recouvrement" element={<RequirePortmaster><RecouvrementPage /></RequirePortmaster>} />

            <Route path="/encaissements" element={<TresorerieIndexPage />}>
              <Route index element={<TresorerieBoard />} />
              <Route path="liste" element={<EncaissementsListPage />} />
              <Route path="caisse" element={<JournalCaissePage />} />
              <Route path="comptes" element={<ComptesBancairesPage />} />
            </Route>
            <Route path="/encaissements/nouveau" element={<SaisieEncaissementPage />} />

            <Route path="/facturation" element={<FacturationIndexPage />}>
              <Route index element={<FacturationBoard />} />
              <Route path="factures" element={<FacturesListPage />} />
              <Route path="clients" element={<Navigate to="/clients" replace />} />
            </Route>
            <Route path="/facturation/nouvelle" element={<NouvelleFacturePage />} />
            <Route path="/facturation/factures/:id" element={<FactureDetailFacturationPage />} />

            <Route path="/clients" element={<ClientsListPage />} />
            <Route path="/clients/nouveau" element={<NouveauClientPage />} />
            <Route path="/clients/:id" element={<ClientDetailPage />} />

            <Route path="/hebergement" element={<HebergementPage />} />
            <Route path="/tarifs" element={<HotelTarifsPage />} />

            <Route element={<RequireRh />}>
              <Route path="/rh" element={<RhPage />} />
              <Route path="/rh/:hub" element={<RhPage />} />
              <Route path="/rh/:hub/:sub" element={<RhPage />} />
            </Route>

            <Route path="/anomalies" element={<AnomaliesPage />} />
            <Route path="/decisions" element={<DecisionsPage />} />
            <Route path="/reclamations" element={<ReclamationsPage />} />
            <Route path="/parking" element={<ParkingPage />} />
            <Route path="/plage" element={<PlagePage />} />
            <Route path="/stocks" element={<StocksPage />} />
            <Route path="/achats" element={<AchatsPage />} />
            <Route path="/maintenance" element={<MaintenancePage />} />
            <Route path="/commercial" element={<CommercialPage />} />
            <Route path="/ged" element={<GedPage />} />

            <Route path="/rapports" element={<RequireReportsExport><RapportsPage /></RequireReportsExport>} />
            <Route path="/system/sync" element={<RequireSync><SyncPage /></RequireSync>} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route element={<RequireRh />}>
              <Route path="/settings/rh-referentiel" element={<RhReferentielPage />} />
            </Route>
            <Route path="/settings/interface" element={<InterfaceThemePage />} />
            <Route path="/settings/notifications" element={<NotificationsPage />} />
            <Route path="/settings/securite" element={<SecuriteAccesPage />} />
            <Route path="/settings/database" element={<RequireSystemAdmin><DatabasePage /></RequireSystemAdmin>} />
            <Route path="/settings/backup" element={<RequireSystemAdmin><BackupPage /></RequireSystemAdmin>} />
            <Route path="/audit/logs" element={<RequirePermission permission={PERMISSIONS.AUDIT_READ}><AuditLogPage /></RequirePermission>} />
            </Route>
          </Route>
        </Route>
      </Route>

      <Route path="/" element={<DefaultRedirect />} />
      <Route path="*" element={<DefaultRedirect />} />
    </Routes>
  );
}
