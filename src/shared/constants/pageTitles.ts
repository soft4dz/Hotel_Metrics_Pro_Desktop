export const PAGE_TITLES: Record<string, { title: string; subtitle?: string }> = {
  '/dashboard': {
    title: 'Tableau de bord',
    subtitle: 'Synthèse recettes, objectifs, unités, rubriques, alertes et accès rapides',
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
    title: 'Dashboard PortMaster',
    subtitle: 'Pilotage portuaire',
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
    title: 'Saisie journalière',
    subtitle: 'Chiffre d\'affaires du jour',
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
};

export function getPageTitle(pathname: string): { title: string; subtitle?: string } {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];

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

  return { title: 'Hotel Metrics Pro', subtitle: undefined };
}
