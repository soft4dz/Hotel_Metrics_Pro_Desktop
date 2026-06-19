import type { SourceDefPartial } from './reports-sources.types';
import {
  applyDateFilter,
  applyHotelFilter,
  applyStatutFilter,
  pickColumns,
} from './reports-query.helpers';

const PERM_RH = ['rh.manage', 'rh.team', 'reports.export'];

export const RH_SOURCES: Record<string, SourceDefPartial> = {
  rh_employes: {
    id: 'rh_employes', label: 'Effectif RH', category: 'Ressources humaines',
    description: 'Liste des employés actifs avec poste, département et hôtel',
    module: 'rh', permissions: PERM_RH, icon: 'users',
    supportsDateFilter: false, supportsHotelFilter: true, supportsStatutFilter: true,
    statutOptions: [{ value: 'actif', label: 'Actif' }, { value: 'inactif', label: 'Inactif' }, { value: 'sorti', label: 'Sorti' }],
    columns: [
      { key: 'matricule', label: 'Matricule', width: 12 }, { key: 'nom', label: 'Nom', width: 18 },
      { key: 'prenom', label: 'Prénom', width: 18 }, { key: 'email', label: 'Email', width: 22 },
      { key: 'telephone', label: 'Téléphone', width: 14 }, { key: 'poste', label: 'Poste', width: 20 },
      { key: 'departement', label: 'Département', width: 18 }, { key: 'hotel', label: 'Hôtel', width: 20 },
      { key: 'date_embauche', label: 'Date embauche', width: 12 }, { key: 'statut', label: 'Statut RH', width: 10 },
    ],
    buildQuery(columns, filters, hotelIds) {
      const selectMap: Record<string, string> = {
        matricule: 'e.dlg_matricule AS matricule', nom: 'e.nom', prenom: 'e.prenom',
        email: 'e.email_personnel AS email', telephone: 'e.telephone', poste: 'po.nom AS poste',
        departement: 'd.nom AS departement', hotel: 'h.name AS hotel',
        date_embauche: 'e.date_embauche', statut: 'e.statut_rh AS statut',
      };
      const where = ['e.deleted_at IS NULL'];
      const params: unknown[] = [];
      applyHotelFilter(where, params, hotelIds, filters, 'e.hotel_id');
      applyStatutFilter(where, params, filters, 'e.statut_rh');
      return { sql: `SELECT ${pickColumns(selectMap, columns)} FROM rh_employes e LEFT JOIN rh_postes po ON po.id = e.poste_actuel_id LEFT JOIN rh_departements d ON d.id = po.departement_id LEFT JOIN hotels h ON h.id = e.hotel_id WHERE ${where.join(' AND ')} ORDER BY e.nom, e.prenom`, params };
    },
  },
  rh_contrats: {
    id: 'rh_contrats', label: 'Contrats de travail', category: 'Ressources humaines',
    description: 'Contrats CDI/CDD avec salaires et échéances',
    module: 'rh', permissions: PERM_RH, icon: 'file-signature',
    supportsDateFilter: true, supportsHotelFilter: false, supportsStatutFilter: false,
    columns: [
      { key: 'employe', label: 'Employé', width: 24 }, { key: 'poste', label: 'Poste', width: 20 },
      { key: 'type', label: 'Type contrat', width: 10 }, { key: 'date_debut', label: 'Début', width: 12 },
      { key: 'date_fin', label: 'Fin', width: 12 }, { key: 'salaire_brut', label: 'Salaire brut', width: 14 },
      { key: 'heures_hebdo', label: 'Heures/sem.', width: 10 }, { key: 'actif', label: 'Actif', width: 8 },
    ],
    buildQuery(columns, filters) {
      const selectMap: Record<string, string> = {
        employe: `e.nom || ' ' || e.prenom AS employe`, poste: 'po.nom AS poste',
        type: 'c.type', date_debut: 'c.date_debut', date_fin: 'c.date_fin',
        salaire_brut: 'c.salaire_brut', heures_hebdo: 'c.heures_hebdo',
        actif: `CASE WHEN c.actif = 1 THEN 'Oui' ELSE 'Non' END AS actif`,
      };
      const where = ['1=1'];
      const params: unknown[] = [];
      applyDateFilter(where, params, filters, 'c.date_debut');
      return { sql: `SELECT ${pickColumns(selectMap, columns)} FROM rh_contrats c INNER JOIN rh_employes e ON e.id = c.employe_id INNER JOIN rh_postes po ON po.id = c.poste_id WHERE ${where.join(' AND ')} ORDER BY c.date_debut DESC`, params };
    },
  },
  rh_pointages: {
    id: 'rh_pointages', label: 'Pointages', category: 'Ressources humaines',
    description: 'Heures travaillées par employé et jour',
    module: 'rh', permissions: PERM_RH, icon: 'clock',
    supportsDateFilter: true, supportsHotelFilter: false, supportsStatutFilter: true,
    statutOptions: [
      { value: 'brouillon', label: 'Brouillon' }, { value: 'soumis', label: 'Soumis' },
      { value: 'valide', label: 'Validé' }, { value: 'refuse', label: 'Refusé' },
    ],
    columns: [
      { key: 'employe', label: 'Employé', width: 24 }, { key: 'date', label: 'Date', width: 12 },
      { key: 'heure_entree', label: 'Entrée', width: 10 }, { key: 'heure_sortie', label: 'Sortie', width: 10 },
      { key: 'heures_travaillees', label: 'Heures', width: 10 }, { key: 'statut', label: 'Statut', width: 12 },
    ],
    buildQuery(columns, filters) {
      const selectMap: Record<string, string> = {
        employe: `e.nom || ' ' || e.prenom AS employe`, date: 'pt.date',
        heure_entree: 'pt.heure_entree', heure_sortie: 'pt.heure_sortie',
        heures_travaillees: 'pt.heures_travaillees', statut: 'pt.statut',
      };
      const where = ['1=1'];
      const params: unknown[] = [];
      applyDateFilter(where, params, filters, 'pt.date');
      applyStatutFilter(where, params, filters, 'pt.statut');
      return { sql: `SELECT ${pickColumns(selectMap, columns)} FROM rh_pointages pt INNER JOIN rh_employes e ON e.id = pt.employe_id WHERE ${where.join(' AND ')} ORDER BY pt.date DESC`, params };
    },
  },
  rh_absences: {
    id: 'rh_absences', label: 'Absences', category: 'Ressources humaines',
    description: 'Congés, maladies et absences par employé',
    module: 'rh', permissions: PERM_RH, icon: 'calendar-off',
    supportsDateFilter: true, supportsHotelFilter: false, supportsStatutFilter: true,
    statutOptions: [{ value: 'demandee', label: 'Demandée' }, { value: 'approuvee', label: 'Approuvée' }, { value: 'refusee', label: 'Refusée' }],
    columns: [
      { key: 'employe', label: 'Employé', width: 24 }, { key: 'type', label: 'Type', width: 10 },
      { key: 'date_debut', label: 'Début', width: 12 }, { key: 'date_fin', label: 'Fin', width: 12 },
      { key: 'motif', label: 'Motif', width: 24 }, { key: 'statut', label: 'Statut', width: 12 },
    ],
    buildQuery(columns, filters) {
      const selectMap: Record<string, string> = {
        employe: `e.nom || ' ' || e.prenom AS employe`, type: 'a.type',
        date_debut: 'a.date_debut', date_fin: 'a.date_fin', motif: 'a.motif', statut: 'a.statut',
      };
      const where = ['1=1'];
      const params: unknown[] = [];
      applyDateFilter(where, params, filters, 'a.date_debut');
      applyStatutFilter(where, params, filters, 'a.statut');
      return { sql: `SELECT ${pickColumns(selectMap, columns)} FROM rh_absences a INNER JOIN rh_employes e ON e.id = a.employe_id WHERE ${where.join(' AND ')} ORDER BY a.date_debut DESC`, params };
    },
  },
  rh_bulletins: {
    id: 'rh_bulletins', label: 'Bulletins de paie', category: 'Ressources humaines',
    description: 'Masse salariale par période : brut, net, charges et primes',
    module: 'rh', permissions: ['rh.manage', 'reports.export'], icon: 'banknote',
    supportsDateFilter: false, supportsHotelFilter: false, supportsStatutFilter: true,
    supportsPeriodeFilter: true,
    statutOptions: [
      { value: 'brouillon', label: 'Brouillon' }, { value: 'exporte', label: 'Exporté' },
      { value: 'importe', label: 'Importé' }, { value: 'valide', label: 'Validé' },
    ],
    columns: [
      { key: 'employe', label: 'Employé', width: 24 }, { key: 'periode', label: 'Période', width: 10 },
      { key: 'brut', label: 'Brut', width: 12 }, { key: 'net', label: 'Net', width: 12 },
      { key: 'charges', label: 'Charges', width: 12 }, { key: 'primes', label: 'Primes', width: 12 },
      { key: 'heures', label: 'Heures', width: 10 }, { key: 'jours_absence', label: 'Jours absence', width: 12 },
      { key: 'statut', label: 'Statut', width: 12 }, { key: 'source', label: 'Source', width: 10 },
    ],
    buildQuery(columns, filters) {
      const selectMap: Record<string, string> = {
        employe: `e.nom || ' ' || e.prenom AS employe`, periode: 'b.periode',
        brut: 'b.brut', net: 'b.net', charges: 'b.charges', primes: 'b.primes_total AS primes',
        heures: 'b.heures_travaillees AS heures', jours_absence: 'b.jours_absence',
        statut: 'b.statut', source: 'b.source',
      };
      const where = ['1=1'];
      const params: unknown[] = [];
      if (filters.periode) { where.push('b.periode = ?'); params.push(filters.periode); }
      applyStatutFilter(where, params, filters, 'b.statut');
      return { sql: `SELECT ${pickColumns(selectMap, columns)} FROM rh_bulletins b INNER JOIN rh_employes e ON e.id = b.employe_id WHERE ${where.join(' AND ')} ORDER BY b.periode DESC, e.nom`, params };
    },
  },
  rh_affectations: {
    id: 'rh_affectations', label: 'Affectations multi-sites', category: 'Ressources humaines',
    description: 'Affectations employés par hôtel et poste',
    module: 'rh', permissions: PERM_RH, icon: 'map-pin',
    supportsDateFilter: true, supportsHotelFilter: true, supportsStatutFilter: true,
    statutOptions: [{ value: 'active', label: 'Active' }, { value: 'terminee', label: 'Terminée' }],
    columns: [
      { key: 'employe', label: 'Employé', width: 24 }, { key: 'hotel', label: 'Hôtel', width: 20 },
      { key: 'poste', label: 'Poste', width: 18 }, { key: 'date_debut', label: 'Début', width: 12 },
      { key: 'date_fin', label: 'Fin', width: 12 }, { key: 'statut', label: 'Statut', width: 12 },
    ],
    buildQuery(columns, filters, hotelIds) {
      const selectMap: Record<string, string> = {
        employe: `e.nom || ' ' || e.prenom AS employe`, hotel: 'h.name AS hotel',
        poste: 'po.nom AS poste', date_debut: 'af.date_debut', date_fin: 'af.date_fin', statut: 'af.statut',
      };
      const where = ['1=1'];
      const params: unknown[] = [];
      applyHotelFilter(where, params, hotelIds, filters, 'af.hotel_id');
      applyDateFilter(where, params, filters, 'af.date_debut');
      applyStatutFilter(where, params, filters, 'af.statut');
      return { sql: `SELECT ${pickColumns(selectMap, columns)} FROM rh_affectations af INNER JOIN rh_employes e ON e.id = af.employe_id INNER JOIN hotels h ON h.id = af.hotel_id LEFT JOIN rh_postes po ON po.id = af.poste_id WHERE ${where.join(' AND ')} ORDER BY af.date_debut DESC`, params };
    },
  },
  rh_recrutements: {
    id: 'rh_recrutements', label: 'Recrutements', category: 'Ressources humaines',
    description: 'Pipeline recrutement et candidatures',
    module: 'rh', permissions: PERM_RH, icon: 'user-plus',
    supportsDateFilter: true, supportsHotelFilter: false, supportsStatutFilter: true,
    statutOptions: [{ value: 'en_cours', label: 'En cours' }, { value: 'valide', label: 'Validé' }, { value: 'refuse', label: 'Refusé' }],
    columns: [
      { key: 'poste', label: 'Poste visé', width: 22 }, { key: 'candidat', label: 'Candidat', width: 24 },
      { key: 'email', label: 'Email', width: 22 }, { key: 'telephone', label: 'Téléphone', width: 14 },
      { key: 'statut', label: 'Statut', width: 12 }, { key: 'date_creation', label: 'Date création', width: 14 },
    ],
    buildQuery(columns, filters) {
      const selectMap: Record<string, string> = {
        poste: 'po.nom AS poste',
        candidat: `r.candidat_nom || COALESCE(' ' || r.candidat_prenom, '') AS candidat`,
        email: 'r.candidat_email AS email', telephone: 'r.candidat_telephone AS telephone',
        statut: 'r.statut', date_creation: 'r.created_at AS date_creation',
      };
      const where = ['1=1'];
      const params: unknown[] = [];
      applyDateFilter(where, params, filters, 'r.created_at');
      applyStatutFilter(where, params, filters, 'r.statut');
      return { sql: `SELECT ${pickColumns(selectMap, columns)} FROM rh_recrutements r INNER JOIN rh_postes po ON po.id = r.poste_id WHERE ${where.join(' AND ')} ORDER BY r.created_at DESC`, params };
    },
  },
  utilisateurs: {
    id: 'utilisateurs', label: 'Utilisateurs système', category: 'Système',
    description: 'Comptes utilisateurs actifs avec rôles et hôtels',
    module: 'administration', permissions: ['users.manage', 'reports.export'], icon: 'shield-check',
    supportsDateFilter: false, supportsHotelFilter: false, supportsStatutFilter: false,
    columns: [
      { key: 'email', label: 'Email', width: 26 }, { key: 'nom', label: 'Nom complet', width: 24 },
      { key: 'role', label: 'Rôle', width: 18 }, { key: 'hotel', label: 'Hôtel principal', width: 20 },
      { key: 'statut_compte', label: 'Statut compte', width: 12 }, { key: 'actif', label: 'Actif', width: 8 },
      { key: 'derniere_connexion', label: 'Dernière connexion', width: 18 },
    ],
    buildQuery(columns) {
      const selectMap: Record<string, string> = {
        email: 'u.email', nom: 'u.full_name AS nom', role: 'r.label AS role',
        hotel: 'h.name AS hotel', statut_compte: 'u.account_status AS statut_compte',
        actif: `CASE WHEN u.is_active = 1 THEN 'Oui' ELSE 'Non' END AS actif`,
        derniere_connexion: `(SELECT MAX(lc.created_at) FROM logs_connexions lc WHERE lc.email = u.email AND lc.success = 1) AS derniere_connexion`,
      };
      return { sql: `SELECT ${pickColumns(selectMap, columns)} FROM users u INNER JOIN roles r ON r.id = u.role_id LEFT JOIN hotels h ON h.id = u.hotel_id WHERE u.deleted_at IS NULL ORDER BY u.full_name`, params: [] };
    },
  },
};
