export type ErpAxisStatus = 'a_lancer' | 'en_cours' | 'socle_pret' | 'operationnel' | 'reporte';

export interface ErpImprovementAxis {
  id: number;
  code: string;
  title: string;
  domain: string;
  priority: 1 | 2 | 3 | 4 | 5;
  status: ErpAxisStatus;
  targetRoute?: string;
  description: string;
  deliveredFoundation: string[];
  nextImplementationSteps: string[];
}

export const ERP_IMPROVEMENT_AXES: ErpImprovementAxis[] = [
  {
    id: 1,
    code: 'cockpit_dec',
    title: 'Cockpit DEC',
    domain: 'Pilotage',
    priority: 5,
    status: 'socle_pret',
    targetRoute: '/dec/cockpit',
    description: 'Vue quotidienne consolidée pour la Direction de l’Exploitation et du Contrôle.',
    deliveredFoundation: [
      'Table dec_cockpit_alerts',
      'Widgets standards DEC',
      'KPI CA, occupation, encaissements, anomalies, réclamations, maintenance, RH, créances et décisions',
    ],
    nextImplementationSteps: [
      'Créer la page CockpitDecPage',
      'Ajouter le service dec-cockpit.service.ts',
      'Brancher les alertes 09h30 sur les recettes journalières',
      'Afficher les cartes par unité et niveau de gravité',
    ],
  },
  {
    id: 2,
    code: 'cloture_journaliere',
    title: 'Clôture journalière par unité',
    domain: 'Finance / Exploitation',
    priority: 5,
    status: 'socle_pret',
    targetRoute: '/recettes/cloture',
    description: 'Circuit quotidien de clôture CA, encaissements, créances, écarts caisse et validation DEC.',
    deliveredFoundation: [
      'Table daily_closures',
      'Table daily_closure_items',
      'Statuts brouillon, soumis, validé unité, validé DEC, refusé, clôturé',
    ],
    nextImplementationSteps: [
      'Créer l’écran de clôture journalière',
      'Préremplir depuis recettes et encaissements',
      'Ajouter validation directeur unité puis DEC',
      'Bloquer modification après clôture',
    ],
  },
  {
    id: 3,
    code: 'creances_globales',
    title: 'Créances globales',
    domain: 'Finance',
    priority: 5,
    status: 'socle_pret',
    targetRoute: '/creances',
    description: 'Centralisation des créances hébergement, entreprises, agences, sponsoring et PortMaster.',
    deliveredFoundation: [
      'Table global_creances',
      'Table global_creance_relances',
      'Statuts ouverte, partielle, réglée, litige, irrécouvrable et annulée',
    ],
    nextImplementationSteps: [
      'Créer un service creances.service.ts',
      'Créer une balance âgée',
      'Générer créance depuis facture impayée',
      'Ajouter relances email/courrier/mise en demeure',
    ],
  },
  {
    id: 4,
    code: 'workflow_transversal',
    title: 'Moteur transversal de workflow',
    domain: 'Contrôle',
    priority: 5,
    status: 'socle_pret',
    targetRoute: '/workflows',
    description: 'Workflow commun pour soumission, validation, refus, clôture et historique des décisions.',
    deliveredFoundation: [
      'Table erp_standard_statuses',
      'Table workflow_instances',
      'Table workflow_history',
    ],
    nextImplementationSteps: [
      'Créer le service workflow.service.ts',
      'Remplacer les validations isolées par workflow_instances',
      'Brancher recettes, facturation, achats, RH, maintenance et décisions',
      'Ajouter historique visible dans chaque fiche métier',
    ],
  },
  {
    id: 5,
    code: 'organisation_egt',
    title: 'Organisation EGT et effectifs cibles',
    domain: 'RH',
    priority: 4,
    status: 'socle_pret',
    targetRoute: '/rh/organisation/egt',
    description: 'Organigramme, directions, départements, postes, responsables et effectifs cibles.',
    deliveredFoundation: [
      'Référentiel directions EGT Sidi Fredj',
      'Départements et unités opérationnelles',
      'Table rh_effectifs_cibles_egt',
    ],
    nextImplementationSteps: [
      'Créer vue organigramme',
      'Calculer effectif réel depuis rh_employes et affectations',
      'Comparer cible/réel/écart par unité',
      'Exporter organigramme et état effectifs',
    ],
  },
  {
    id: 6,
    code: 'fiches_poste',
    title: 'Fiches de poste et compétences',
    domain: 'RH',
    priority: 4,
    status: 'socle_pret',
    targetRoute: '/rh/fiches-poste',
    description: 'Missions, responsabilités, rattachement, compétences, exigences et KPI par poste.',
    deliveredFoundation: [
      'Table rh_fiches_poste',
      'Lien poste / direction / département',
      'Versionning simple des fiches',
    ],
    nextImplementationSteps: [
      'Créer éditeur fiche de poste',
      'Ajouter modèle PDF',
      'Relier fiche de poste au recrutement et à l’évaluation',
      'Ajouter compétences obligatoires par poste',
    ],
  },
  {
    id: 7,
    code: 'dashboard_pdg',
    title: 'Dashboard PDG et rapports standards',
    domain: 'Pilotage',
    priority: 5,
    status: 'socle_pret',
    targetRoute: '/dashboard/pdg',
    description: 'Vue consolidée PDG : CA, objectifs, occupation, créances, trésorerie, RH, qualité et maintenance.',
    deliveredFoundation: [
      'Table dashboard_kpi_definitions',
      'Table standard_report_definitions',
      'KPI et rapports standards EGT',
    ],
    nextImplementationSteps: [
      'Créer dashboard PDG dédié',
      'Créer widgets KPI consolidés',
      'Brancher exports PDF/Excel',
      'Ajouter rapport mensuel CA pour Conseil d’Administration',
    ],
  },
  {
    id: 8,
    code: 'rapprochement_financier',
    title: 'Rapprochement recettes / encaissements',
    domain: 'Finance',
    priority: 5,
    status: 'socle_pret',
    targetRoute: '/finance/rapprochements',
    description: 'Contrôle quotidien CA déclaré, espèces, TPE, virements, chèques, créances et écarts.',
    deliveredFoundation: [
      'Table finance_reconciliations',
      'Champs espèces, TPE, virement, chèque, créance et écart',
      'Statuts de contrôle financier',
    ],
    nextImplementationSteps: [
      'Créer écran rapprochement financier',
      'Alimenter depuis recettes et trésorerie',
      'Générer anomalie si écart non justifié',
      'Relier au processus de clôture journalière',
    ],
  },
  {
    id: 9,
    code: 'checklists_controle',
    title: 'Checklists DEC, qualité, hygiène et maintenance',
    domain: 'Contrôle / Qualité',
    priority: 4,
    status: 'socle_pret',
    targetRoute: '/controle/checklists',
    description: 'Contrôles terrain, constats, preuves, actions correctives, délais et clôture.',
    deliveredFoundation: [
      'Tables control_checklist_templates, items, runs, results',
      'Modèles DEC CA, qualité chambres, hygiène restauration, maintenance et sécurité',
      'Gestion criticité et preuve obligatoire',
    ],
    nextImplementationSteps: [
      'Créer écran checklists',
      'Ajouter pièces jointes/photos',
      'Créer plan d’action automatique si non-conforme',
      'Afficher taux de clôture par unité',
    ],
  },
  {
    id: 10,
    code: 'securisation_ipc_tests',
    title: 'Sécurisation IPC, sauvegarde, sync et tests',
    domain: 'Système',
    priority: 5,
    status: 'socle_pret',
    targetRoute: '/settings/system-health',
    description: 'Validation des entrées, sauvegardes contrôlées, conflits de synchronisation et tests critiques.',
    deliveredFoundation: [
      'Table backup_policies',
      'Table sync_conflict_log',
      'Axes de tests critiques documentés',
    ],
    nextImplementationSteps: [
      'Ajouter validation Zod sur les payloads IPC',
      'Créer tests migrations et workflows',
      'Créer écran santé système',
      'Ajouter alerte si sauvegarde absente ou conflit sync ouvert',
    ],
  },
];

export const ERP_IMPROVEMENT_AXIS_LABELS: Record<ErpAxisStatus, string> = {
  a_lancer: 'À lancer',
  en_cours: 'En cours',
  socle_pret: 'Socle prêt',
  operationnel: 'Opérationnel',
  reporte: 'Reporté',
};

export function getErpImprovementAxis(code: string): ErpImprovementAxis | undefined {
  return ERP_IMPROVEMENT_AXES.find((axis) => axis.code === code);
}
