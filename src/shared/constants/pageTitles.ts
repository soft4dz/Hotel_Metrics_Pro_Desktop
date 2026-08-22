import { RH_HUBS, rhPageTitle, type RhHubId } from '@/pages/rh/rhNavigation';

export const PAGE_TITLES: Record<string, { title: string; subtitle?: string }> = {
  '/modules': {
    title: 'Applications',
    subtitle: 'Lanceur de modules — style pilotage centralisé',
  },
  '/guide': {
    title: 'Manuel d\'utilisation',
    subtitle: 'Guides par profil — procédures et bonnes pratiques',
  },
  '/rh': {
    title: 'RH & productivité',
    subtitle: 'Applications RH — pilotage, collaborateurs, paie et talents',
  },
  '/dashboard': {
    title: 'Pilotage Global',
    subtitle: 'Supervision de l\'activité consolidée du groupe',
  },
  '/objectifs': {
    title: 'Objectifs',
    subtitle: 'Budgets mensuels par unité',
  },
  '/objectifs/edit': {
    title: 'Saisie objectifs',
    subtitle: 'Objectifs et indicateurs',
  },
  '/portmaster': {
    title: 'PortMaster',
    subtitle: 'Applications portuaires',
  },
  '/portmaster/dashboard': {
    title: 'Tableau de bord Capitainerie',
    subtitle: 'Aperçu de l\'activité du port',
  },
  '/portmaster/bateaux': {
    title: 'Bateaux',
    subtitle: 'Flotte enregistrée',
  },
  '/portmaster/bateaux/new': {
    title: 'Nouveau bateau',
    subtitle: 'Enregistrement navire',
  },
  '/portmaster/contrats': {
    title: 'Contrats',
    subtitle: 'Amarrage et facturation',
  },
  '/portmaster/contrats/new': {
    title: 'Nouveau contrat',
    subtitle: 'Création contrat d\'amarrage',
  },
  '/portmaster/emplacements': {
    title: 'Emplacements',
    subtitle: 'Postes d\'amarrage',
  },
  '/portmaster/referentiel': {
    title: 'Référentiel portuaire',
    subtitle: 'Bassins, quais, plan d\'amarrage',
  },
  '/portmaster/clients': {
    title: 'Clients portuaires',
    subtitle: 'Dossiers et créances',
  },
  '/portmaster/clients/new': {
    title: 'Nouveau client',
    subtitle: 'Création dossier',
  },
  '/portmaster/factures': {
    title: 'Factures',
    subtitle: 'Facturation portuaire',
  },
  '/portmaster/factures/new': {
    title: 'Nouvelle facture',
    subtitle: 'Hors contrat',
  },
  '/portmaster/tarifs': {
    title: 'Tarifs',
    subtitle: 'Grilles et simulation',
  },
  '/portmaster/validations': {
    title: 'Validations',
    subtitle: 'Contrats et factures en attente',
  },
  '/rapports': {
    title: 'Rapports & exports',
    subtitle: 'Excel et PDF',
  },
  '/portmaster/mouvements': {
    title: 'Mouvements bateaux',
    subtitle: 'Arrivées, départs, changements',
  },
  '/portmaster/recouvrement': {
    title: 'Recouvrement',
    subtitle: 'Créances et relances',
  },
  '/system/sync': {
    title: 'Synchronisation',
    subtitle: 'Offline / API centrale',
  },
  '/settings': {
    title: 'Paramètres',
    subtitle: 'Compte et préférences',
  },
  '/settings/modules': {
    title: 'Modules activés',
    subtitle: 'Activation des modules métier pour cette installation',
  },
  '/settings/interface': {
    title: 'Interface & Thème',
    subtitle: 'Apparence et personnalisation',
  },
  '/settings/notifications': {
    title: 'Notifications',
    subtitle: 'Alertes et rapports automatiques',
  },
  '/settings/securite': {
    title: 'Sécurité & Accès',
    subtitle: 'Mot de passe, session et politique de connexion',
  },
  '/settings/database': {
    title: 'Base de données',
    subtitle: 'État SQLite, maintenance et import legacy',
  },
  '/settings/backup': {
    title: 'Sauvegarde',
    subtitle: 'Copies de sécurité et restauration',
  },
  '/admin/users': {
    title: 'Utilisateurs',
    subtitle: 'Gestion des comptes et des rôles',
  },
  '/admin/users/new': {
    title: 'Nouvel utilisateur',
    subtitle: 'Création de compte',
  },
  '/admin/hotels': {
    title: 'Hôtels / unités',
    subtitle: 'Établissements et sites',
  },
  '/admin/hotels/new': {
    title: 'Nouvel hôtel',
    subtitle: 'Ajout d\'une unité',
  },
  '/admin/roles': {
    title: 'Rôles & permissions',
    subtitle: 'Profils et droits d\'accès',
  },
  '/admin/rubriques': {
    title: 'Rubriques recettes',
    subtitle: 'Arbre hiérarchique — catégories et sous-catégories de CA',
  },
  '/recettes/journalieres': {
    title: 'CA journalier (ERP)',
    subtitle: 'Chiffre d\'affaires consolidé automatiquement depuis l\'ERP',
  },
  '/recettes/historique': {
    title: 'Historique recettes',
    subtitle: 'Consultation et corrections',
  },
  '/recettes/validation': {
    title: 'Validation recettes',
    subtitle: 'Journées en attente',
  },
  '/recettes/mensuelles': {
    title: 'Saisie mensuelle',
    subtitle: 'Consolidation et écarts',
  },
  '/audit/logs': {
    title: 'Journal d\'audit',
    subtitle: 'Traçabilité des actions',
  },
  '/encaissements': {
    title: 'Encaissements & Trésorerie',
    subtitle: 'Tableau de bord trésorerie',
  },
  '/encaissements/liste': {
    title: 'Liste des encaissements',
    subtitle: 'Suivi et validation des encaissements',
  },
  '/encaissements/nouveau': {
    title: 'Nouvel encaissement',
    subtitle: 'Saisie d\'un encaissement',
  },
  '/encaissements/caisse': {
    title: 'Journal de caisse',
    subtitle: 'Mouvements espèces entrants et sortants',
  },
  '/encaissements/comptes': {
    title: 'Comptes bancaires',
    subtitle: 'Gestion des comptes par établissement',
  },
  '/facturation': {
    title: 'Facturation',
    subtitle: 'Tableau de bord facturation',
  },
  '/facturation/factures': {
    title: 'Factures',
    subtitle: 'Gestion des factures clients',
  },
  '/facturation/nouvelle': {
    title: 'Nouvelle facture',
    subtitle: 'Création d\'une facture',
  },
  '/facturation/clients': {
    title: 'Clients',
    subtitle: 'Répertoire clients de facturation',
  },
  '/clients': {
    title: 'Clients',
    subtitle: 'Fiche client complète — identification, contact, fiscal, bancaire',
  },
  '/clients/nouveau': {
    title: 'Nouveau client',
    subtitle: 'Création d\'un dossier client',
  },
  '/hebergement': {
    title: 'Hébergement & Occupation',
    subtitle: 'Chambres, réservations et indicateurs de performance',
  },
  '/tarifs': {
    title: 'Tarifs & Conventions',
    subtitle: 'Plans tarifaires, grille journalière, promotions et conventions',
  },
  '/comptabilite': {
    title: 'Comptabilité SCF',
    subtitle: 'Plan comptable, saisie et balance',
  },
  '/comptabilite/plan': {
    title: 'Plan comptable',
    subtitle: 'Consultation des comptes SCF',
  },
  '/comptabilite/saisie': {
    title: 'Saisie OD',
    subtitle: 'Écritures manuelles journal OD',
  },
  '/comptabilite/journaux': {
    title: 'Journaux comptables',
    subtitle: 'Consultation des écritures',
  },
  '/comptabilite/balance': {
    title: 'Balance générale',
    subtitle: 'Balance par exercice et période',
  },
  '/comptabilite/exercices': {
    title: 'Exercices comptables',
    subtitle: 'Ouverture et clôture des exercices',
  },
  '/fiscalite': {
    title: 'Fiscalité DGI',
    subtitle: 'TVA, retenues et liasse fiscale',
  },
  '/fiscalite/registre-tva': {
    title: 'Registre TVA',
    subtitle: 'Registre des ventes et avoirs',
  },
  '/fiscalite/declaration-tva': {
    title: 'Déclaration TVA',
    subtitle: 'Calcul et historique des déclarations',
  },
  '/fiscalite/retenue-source': {
    title: 'Retenue à la source',
    subtitle: 'Retenues sur paiements fournisseurs',
  },
  '/fiscalite/liasse': {
    title: 'Liasse fiscale',
    subtitle: 'États G50 et export DGI',
  },
  '/fiscalite/tva-achats': {
    title: 'Registre TVA achats',
    subtitle: 'TVA déductible et import depuis achats',
  },
  '/fiscalite/teledeclarations': {
    title: 'Télédéclarations DGI',
    subtitle: 'Export G50 et suivi des dépôts',
  },
  '/fiscalite/sifec': {
    title: 'Connecteur SIFEC',
    subtitle: 'Facturation électronique DGI',
  },
  '/fiscalite/sifec/factures': {
    title: 'Transmissions SIFEC',
    subtitle: 'Envoi et suivi des factures électroniques',
  },
  '/fiscalite/sifec/config': {
    title: 'Configuration SIFEC',
    subtitle: 'Paramètres connecteur sandbox / production',
  },
  '/facturation/registre': {
    title: 'Registre des factures',
    subtitle: 'Registre légal des pièces de vente',
  },
  '/rh/paie/cloture': {
    title: 'Clôture paie mensuelle',
    subtitle: 'Validation et clôture de la paie',
  },
  '/workflows': {
    title: 'Workflows',
    subtitle: 'File d\'attente des validations transverses',
  },
  '/workflows/procedures': {
    title: 'Procédures de validation',
    subtitle: 'Paramétrage des circuits — qui, quoi, quand, comment',
  },
  '/recettes/cloture': {
    title: 'Clôture journalière',
    subtitle: 'Contrôle CA, encaissements et créances par unité',
  },
  '/finance/rapprochements': {
    title: 'Rapprochements financiers',
    subtitle: 'Rapprochement recettes / trésorerie / créances',
  },
  '/creances': {
    title: 'Créances globales',
    subtitle: 'Recouvrement, balance âgée et relances',
  },
  '/dec/cockpit': {
    title: 'Cockpit DEC',
    subtitle: 'Alertes et indicateurs opérationnels',
  },
  '/dashboard/pdg': {
    title: 'Dashboard PDG',
    subtitle: 'Vue consolidée multi-unités',
  },
  '/rh/organisation/egt': {
    title: 'Organisation EGT',
    subtitle: 'Organigramme et effectifs cible vs réel',
  },
  '/rh/fiches-poste': {
    title: 'Fiches de poste',
    subtitle: 'Missions, compétences et KPI par poste',
  },
  '/controle/checklists': {
    title: 'Checklists de contrôle',
    subtitle: 'DEC, qualité, hygiène, maintenance, sécurité',
  },
  '/hotel-legal': {
    title: 'Conformité hôtelière',
    subtitle: 'Fiche police, taxe de séjour, rapports tourisme',
  },
  '/ged/archivage-legal': {
    title: 'Archivage légal GED',
    subtitle: 'Rétention 10 ans, horodatage et intégrité',
  },
  '/settings/system-health': {
    title: 'Santé système',
    subtitle: 'Base de données, sauvegardes, sync et intégrité GED',
  },
  '/conformite/donnees-personnelles': {
    title: 'Protection des données',
    subtitle: 'Loi 18-07 / ANPDP — registre et droits des personnes',
  },
  '/conformite/donnees-personnelles/traitements': {
    title: 'Registre des traitements',
    subtitle: 'Loi 18-07 — art. 30',
  },
  '/conformite/donnees-personnelles/consentements': {
    title: 'Consentements',
    subtitle: 'Preuves et retraits de consentement',
  },
  '/conformite/donnees-personnelles/demandes': {
    title: 'Demandes d\'exercice des droits',
    subtitle: 'Accès, rectification, suppression, opposition, portabilité',
  },
  '/conformite/donnees-personnelles/incidents': {
    title: 'Incidents de données',
    subtitle: 'Violations et notification ANPDP',
  },
  '/conformite/donnees-personnelles/conservation': {
    title: 'Politiques de conservation',
    subtitle: 'Durées liées à l\'archivage GED',
  },
  '/conformite/modules-legaux': {
    title: 'Modules légaux',
    subtitle: 'Immobilisations, CASNOS et inventaire légal',
  },
  '/conformite/modules-legaux/immobilisations': {
    title: 'Immobilisations SCF',
    subtitle: 'Registre et amortissements comptables',
  },
  '/conformite/modules-legaux/casnos': {
    title: 'CASNOS — TNS',
    subtitle: 'Cotisations travailleurs non salariés',
  },
  '/conformite/modules-legaux/inventaire': {
    title: 'Inventaire légal',
    subtitle: 'Inventaire physique annuel des stocks',
  },
};

export function getPageTitle(pathname: string): { title: string; subtitle?: string } {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];

  const rhMatch = pathname.match(/^\/rh\/([\w-]+)(?:\/([\w-]+))?$/);
  if (rhMatch) {
    const hubId = rhMatch[1] as RhHubId;
    const sub = rhMatch[2];
    if (RH_HUBS.some((h) => h.id === hubId)) {
      return rhPageTitle(hubId, sub);
    }
  }
  if (pathname === '/rh') {
    return { title: 'RH & productivité', subtitle: 'Applications RH — pilotage, collaborateurs, paie et talents' };
  }
  const guideMatch = pathname.match(/^\/guide\/([\w-]+)$/);
  if (guideMatch) {
    return { title: 'Guide utilisateur', subtitle: guideMatch[1].replace(/-/g, ' ') };
  }
  if (pathname === '/settings/rh-referentiel') {
    return { title: 'Référentiel RH', subtitle: 'Postes, départements et modèles de dossier' };
  }

  const userEdit = pathname.match(/^\/admin\/users\/(\d+)$/);
  if (userEdit) {
    return { title: 'Modifier utilisateur', subtitle: `ID ${userEdit[1]}` };
  }

  const hotelEdit = pathname.match(/^\/admin\/hotels\/(\d+)$/);
  if (hotelEdit) {
    return { title: 'Modifier hôtel', subtitle: `ID ${hotelEdit[1]}` };
  }

  const bateauEdit = pathname.match(/^\/portmaster\/bateaux\/(\d+)$/);
  if (bateauEdit) {
    return { title: 'Modifier bateau', subtitle: `ID ${bateauEdit[1]}` };
  }

  const contratEdit = pathname.match(/^\/portmaster\/contrats\/(\d+)$/);
  if (contratEdit) {
    return { title: 'Contrat', subtitle: `ID ${contratEdit[1]}` };
  }

  const clientEdit = pathname.match(/^\/portmaster\/clients\/(\d+)$/);
  if (clientEdit) {
    return { title: 'Fiche client', subtitle: `ID ${clientEdit[1]}` };
  }

  const factureEdit = pathname.match(/^\/portmaster\/factures\/(\d+)$/);
  if (factureEdit) {
    return { title: 'Facture', subtitle: `ID ${factureEdit[1]}` };
  }

  const clientDetail = pathname.match(/^\/clients\/(\d+)$/);
  if (clientDetail) {
    return { title: 'Fiche client', subtitle: `Dossier client #${clientDetail[1]}` };
  }

  const facturationDetail = pathname.match(/^\/facturation\/factures\/(\d+)$/);
  if (facturationDetail) {
    return { title: 'Détail facture', subtitle: `Facture #${facturationDetail[1]}` };
  }

  return { title: 'Raqmi System', subtitle: undefined };
}
