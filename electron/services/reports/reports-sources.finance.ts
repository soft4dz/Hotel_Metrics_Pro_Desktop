import type { SourceDefPartial } from './reports-sources.types';
import {
  applyDateFilter,
  applyHotelFilter,
  applyStatutFilter,
  pickColumns,
} from './reports-query.helpers';

const PERM_RECETTES = ['recettes.saisie', 'recettes.validate', 'reports.export'];
const PERM_EXPORT = ['reports.export'];
const PERM_AUDIT = ['audit.read', 'reports.export'];
const PERM_PORT = ['portmaster.full', 'reports.export'];

export const FINANCE_SOURCES: Record<string, SourceDefPartial> = {
  recettes_journalieres: {
    id: 'recettes_journalieres', label: 'Recettes journalières', category: 'Finance',
    description: 'CA journalier par hôtel, rubrique, chambres et nuitées',
    module: 'recettes', permissions: PERM_RECETTES, icon: 'trending-up',
    supportsDateFilter: true, supportsHotelFilter: true, supportsStatutFilter: true,
    statutOptions: [{ value: 'validated', label: 'Validée' }, { value: 'draft', label: 'Brouillon' }],
    columns: [
      { key: 'hotel', label: 'Hôtel', width: 24 }, { key: 'date_journal', label: 'Date', width: 12 },
      { key: 'rubrique', label: 'Rubrique', width: 20 }, { key: 'montant', label: 'Montant (DZD)', width: 14 },
      { key: 'statut', label: 'Statut', width: 12 }, { key: 'chambres', label: 'Chambres', width: 10 },
      { key: 'nuitees', label: 'Nuitées', width: 10 }, { key: 'couverts', label: 'Couverts', width: 10 },
      { key: 'encaissement_ht', label: 'Encaissement HT', width: 14 }, { key: 'observation', label: 'Observation', width: 30 },
    ],
    buildQuery(columns, filters, hotelIds) {
      const selectMap: Record<string, string> = {
        hotel: 'h.name AS hotel', date_journal: 'rj.date_journal', rubrique: 'rub.label AS rubrique',
        montant: 'rj.montant', statut: 'rj.statut', chambres: 'rj.chambres', nuitees: 'rj.nuitees',
        couverts: 'rj.couverts', encaissement_ht: 'rj.encaissement_ht', observation: 'rj.observation',
      };
      const where = ['rj.deleted_at IS NULL'];
      const params: unknown[] = [];
      applyHotelFilter(where, params, hotelIds, filters, 'rj.hotel_id');
      applyDateFilter(where, params, filters, 'rj.date_journal');
      applyStatutFilter(where, params, filters, 'rj.statut');
      return { sql: `SELECT ${pickColumns(selectMap, columns)} FROM recettes_journalieres rj INNER JOIN hotels h ON h.id = rj.hotel_id INNER JOIN rubriques rub ON rub.id = rj.rubrique_id WHERE ${where.join(' AND ')} ORDER BY rj.date_journal DESC`, params };
    },
  },
  recettes_mensuelles: {
    id: 'recettes_mensuelles', label: 'Clôtures mensuelles', category: 'Finance',
    description: 'Synthèse mensuelle par hôtel avec écarts et statut de verrouillage',
    module: 'recettes', permissions: PERM_RECETTES, icon: 'calendar',
    supportsDateFilter: false, supportsHotelFilter: true, supportsStatutFilter: true,
    supportsMoisFilter: true,
    statutOptions: [{ value: 'brouillon', label: 'Brouillon' }, { value: 'valide', label: 'Validé' }, { value: 'verrouille', label: 'Verrouillé' }],
    columns: [
      { key: 'hotel', label: 'Hôtel', width: 24 }, { key: 'annee', label: 'Année', width: 8 },
      { key: 'mois', label: 'Mois', width: 8 }, { key: 'total_journalier', label: 'Total journalier', width: 14 },
      { key: 'total_mensuel', label: 'Total mensuel', width: 14 }, { key: 'ecart', label: 'Écart', width: 12 },
      { key: 'statut', label: 'Statut', width: 12 }, { key: 'verrouille', label: 'Verrouillé', width: 10 },
    ],
    buildQuery(columns, filters, hotelIds) {
      const selectMap: Record<string, string> = {
        hotel: 'h.name AS hotel', annee: 'rm.annee', mois: 'rm.mois',
        total_journalier: 'rm.total_journalier', total_mensuel: 'rm.total_mensuel',
        ecart: 'rm.ecart', statut: 'rm.statut', verrouille: 'CASE WHEN rm.verrouille = 1 THEN \'Oui\' ELSE \'Non\' END AS verrouille',
      };
      const where = ['rm.deleted_at IS NULL'];
      const params: unknown[] = [];
      applyHotelFilter(where, params, hotelIds, filters, 'rm.hotel_id');
      applyStatutFilter(where, params, filters, 'rm.statut');
      if (filters.annee) { where.push('rm.annee = ?'); params.push(filters.annee); }
      if (filters.mois) { where.push('rm.mois = ?'); params.push(filters.mois); }
      return { sql: `SELECT ${pickColumns(selectMap, columns)} FROM recettes_mensuelles rm INNER JOIN hotels h ON h.id = rm.hotel_id WHERE ${where.join(' AND ')} ORDER BY rm.annee DESC, rm.mois DESC`, params };
    },
  },
  objectifs: {
    id: 'objectifs', label: 'Objectifs budgétaires', category: 'Finance',
    description: 'Objectifs mensuels par hôtel (hébergement, restauration, boissons)',
    module: 'recettes', permissions: PERM_RECETTES, icon: 'target',
    supportsDateFilter: false, supportsHotelFilter: true, supportsStatutFilter: false,
    supportsMoisFilter: true,
    columns: [
      { key: 'hotel', label: 'Hôtel', width: 24 }, { key: 'annee', label: 'Année', width: 8 },
      { key: 'mois', label: 'Mois', width: 8 }, { key: 'objectif_hebergement', label: 'Obj. hébergement', width: 14 },
      { key: 'objectif_restauration', label: 'Obj. restauration', width: 14 }, { key: 'objectif_boissons', label: 'Obj. boissons', width: 14 },
      { key: 'objectif_autres', label: 'Obj. autres', width: 14 }, { key: 'capacite_chambres', label: 'Capacité chambres', width: 12 },
    ],
    buildQuery(columns, filters, hotelIds) {
      const selectMap: Record<string, string> = {
        hotel: 'h.name AS hotel', annee: 'o.annee', mois: 'o.mois',
        objectif_hebergement: 'o.objectif_hebergement', objectif_restauration: 'o.objectif_restauration',
        objectif_boissons: 'o.objectif_boissons', objectif_autres: 'o.objectif_autres', capacite_chambres: 'o.capacite_chambres',
      };
      const where = ['o.deleted_at IS NULL'];
      const params: unknown[] = [];
      applyHotelFilter(where, params, hotelIds, filters, 'o.hotel_id');
      if (filters.annee) { where.push('o.annee = ?'); params.push(filters.annee); }
      if (filters.mois) { where.push('o.mois = ?'); params.push(filters.mois); }
      return { sql: `SELECT ${pickColumns(selectMap, columns)} FROM objectifs o INNER JOIN hotels h ON h.id = o.hotel_id WHERE ${where.join(' AND ')} ORDER BY o.annee DESC, o.mois DESC`, params };
    },
  },
  encaissements: {
    id: 'encaissements', label: 'Encaissements', category: 'Finance',
    description: 'Encaissements trésorerie par mode de paiement et statut',
    module: 'encaissements', permissions: PERM_RECETTES, icon: 'wallet',
    supportsDateFilter: true, supportsHotelFilter: true, supportsStatutFilter: true,
    statutOptions: [{ value: 'en_attente', label: 'En attente' }, { value: 'valide', label: 'Validé' }, { value: 'annule', label: 'Annulé' }],
    columns: [
      { key: 'hotel', label: 'Hôtel', width: 24 }, { key: 'date_encaissement', label: 'Date', width: 12 },
      { key: 'montant', label: 'Montant (DZD)', width: 14 }, { key: 'mode', label: 'Mode', width: 12 },
      { key: 'reference', label: 'Référence', width: 18 }, { key: 'description', label: 'Description', width: 28 },
      { key: 'statut', label: 'Statut', width: 12 }, { key: 'compte', label: 'Compte bancaire', width: 20 },
    ],
    buildQuery(columns, filters, hotelIds) {
      const selectMap: Record<string, string> = {
        hotel: 'h.name AS hotel', date_encaissement: 'e.date_encaissement', montant: 'e.montant',
        mode: 'e.mode', reference: 'e.reference', description: 'e.description', statut: 'e.statut',
        compte: 'cb.intitule AS compte',
      };
      const where = ['e.deleted_at IS NULL'];
      const params: unknown[] = [];
      applyHotelFilter(where, params, hotelIds, filters, 'e.hotel_id');
      applyDateFilter(where, params, filters, 'e.date_encaissement');
      applyStatutFilter(where, params, filters, 'e.statut');
      return { sql: `SELECT ${pickColumns(selectMap, columns)} FROM encaissements e INNER JOIN hotels h ON h.id = e.hotel_id LEFT JOIN comptes_bancaires cb ON cb.id = e.compte_bancaire_id WHERE ${where.join(' AND ')} ORDER BY e.date_encaissement DESC`, params };
    },
  },
  journal_caisse: {
    id: 'journal_caisse', label: 'Journal de caisse', category: 'Finance',
    description: 'Mouvements caisse (entrées/sorties) par hôtel',
    module: 'encaissements', permissions: PERM_RECETTES, icon: 'book-open',
    supportsDateFilter: true, supportsHotelFilter: true, supportsStatutFilter: false,
    columns: [
      { key: 'hotel', label: 'Hôtel', width: 24 }, { key: 'date_operation', label: 'Date', width: 12 },
      { key: 'libelle', label: 'Libellé', width: 28 },       { key: 'entree', label: 'Entrée', width: 12 },
      { key: 'sortie', label: 'Sortie', width: 12 },
    ],
    buildQuery(columns, filters, hotelIds) {
      const selectMap: Record<string, string> = {
        hotel: 'h.name AS hotel', date_operation: 'jc.date_operation', libelle: 'jc.libelle',
        entree: 'jc.entree', sortie: 'jc.sortie',
      };
      const where = ['jc.deleted_at IS NULL'];
      const params: unknown[] = [];
      applyHotelFilter(where, params, hotelIds, filters, 'jc.hotel_id');
      applyDateFilter(where, params, filters, 'jc.date_operation');
      return { sql: `SELECT ${pickColumns(selectMap, columns)} FROM journal_caisse jc INNER JOIN hotels h ON h.id = jc.hotel_id WHERE ${where.join(' AND ')} ORDER BY jc.date_operation DESC`, params };
    },
  },
  factures: {
    id: 'factures', label: 'Factures clients', category: 'Finance',
    description: 'Facturation générale : émission, montants, créances et statuts',
    module: 'facturation', permissions: PERM_EXPORT, icon: 'receipt',
    supportsDateFilter: true, supportsHotelFilter: true, supportsStatutFilter: true,
    statutOptions: [
      { value: 'brouillon', label: 'Brouillon' }, { value: 'soumise', label: 'Soumise' },
      { value: 'validee', label: 'Validée' }, { value: 'payee', label: 'Payée' }, { value: 'annulee', label: 'Annulée' },
    ],
    columns: [
      { key: 'hotel', label: 'Hôtel', width: 22 }, { key: 'numero', label: 'N° facture', width: 16 },
      { key: 'client', label: 'Client', width: 26 }, { key: 'date_emission', label: 'Émission', width: 12 },
      { key: 'date_echeance', label: 'Échéance', width: 12 }, { key: 'montant_ht', label: 'HT', width: 12 },
      { key: 'montant_tva', label: 'TVA', width: 12 }, { key: 'montant_ttc', label: 'TTC', width: 12 },
      { key: 'montant_paye', label: 'Payé', width: 12 }, { key: 'reste', label: 'Reste dû', width: 12 },
      { key: 'statut', label: 'Statut', width: 12 },
    ],
    buildQuery(columns, filters, hotelIds) {
      const selectMap: Record<string, string> = {
        hotel: 'h.name AS hotel', numero: 'f.numero', client: 'f.client_nom AS client',
        date_emission: 'f.date_emission', date_echeance: 'f.date_echeance',
        montant_ht: 'f.montant_ht', montant_tva: 'f.montant_tva', montant_ttc: 'f.montant_ttc',
        montant_paye: 'f.montant_paye', reste: '(f.montant_ttc - f.montant_paye) AS reste', statut: 'f.statut',
      };
      const where = ['f.deleted_at IS NULL'];
      const params: unknown[] = [];
      applyHotelFilter(where, params, hotelIds, filters, 'f.hotel_id');
      applyDateFilter(where, params, filters, 'f.date_emission');
      applyStatutFilter(where, params, filters, 'f.statut');
      return { sql: `SELECT ${pickColumns(selectMap, columns)} FROM factures f INNER JOIN hotels h ON h.id = f.hotel_id WHERE ${where.join(' AND ')} ORDER BY f.date_emission DESC`, params };
    },
  },
  lignes_facture: {
    id: 'lignes_facture', label: 'Lignes de facturation', category: 'Finance',
    description: 'Détail des lignes facturées (désignation, quantités, TVA)',
    module: 'facturation', permissions: PERM_EXPORT, icon: 'list',
    supportsDateFilter: true, supportsHotelFilter: true, supportsStatutFilter: false,
    columns: [
      { key: 'hotel', label: 'Hôtel', width: 20 }, { key: 'numero_facture', label: 'N° facture', width: 16 },
      { key: 'client', label: 'Client', width: 24 }, { key: 'date_emission', label: 'Date', width: 12 },
      { key: 'designation', label: 'Désignation', width: 28 }, { key: 'quantite', label: 'Qté', width: 8 },
      { key: 'prix_unitaire', label: 'Prix unit.', width: 12 }, { key: 'taux_tva', label: 'TVA %', width: 8 },
      { key: 'montant_ht', label: 'HT', width: 12 }, { key: 'montant_ttc', label: 'TTC', width: 12 },
    ],
    buildQuery(columns, filters, hotelIds) {
      const selectMap: Record<string, string> = {
        hotel: 'h.name AS hotel', numero_facture: 'f.numero AS numero_facture', client: 'f.client_nom AS client',
        date_emission: 'f.date_emission', designation: 'lf.designation', quantite: 'lf.quantite',
        prix_unitaire: 'lf.prix_unitaire', taux_tva: 'lf.taux_tva', montant_ht: 'lf.montant_ht', montant_ttc: 'lf.montant_ttc',
      };
      const where = ['f.deleted_at IS NULL'];
      const params: unknown[] = [];
      applyHotelFilter(where, params, hotelIds, filters, 'f.hotel_id');
      applyDateFilter(where, params, filters, 'f.date_emission');
      return { sql: `SELECT ${pickColumns(selectMap, columns)} FROM lignes_facture lf INNER JOIN factures f ON f.id = lf.facture_id INNER JOIN hotels h ON h.id = f.hotel_id WHERE ${where.join(' AND ')} ORDER BY f.date_emission DESC`, params };
    },
  },
  paiements_facture: {
    id: 'paiements_facture', label: 'Paiements factures', category: 'Finance',
    description: 'Historique des paiements reçus sur factures clients',
    module: 'facturation', permissions: PERM_EXPORT, icon: 'credit-card',
    supportsDateFilter: true, supportsHotelFilter: true, supportsStatutFilter: false,
    columns: [
      { key: 'hotel', label: 'Hôtel', width: 20 }, { key: 'numero_facture', label: 'N° facture', width: 16 },
      { key: 'client', label: 'Client', width: 24 }, { key: 'date_paiement', label: 'Date paiement', width: 12 },
      { key: 'montant', label: 'Montant', width: 12 }, { key: 'mode', label: 'Mode', width: 12 },
      { key: 'reference', label: 'Référence', width: 18 },
    ],
    buildQuery(columns, filters, hotelIds) {
      const selectMap: Record<string, string> = {
        hotel: 'h.name AS hotel', numero_facture: 'f.numero AS numero_facture', client: 'f.client_nom AS client',
        date_paiement: 'pf.date_paiement', montant: 'pf.montant', mode: 'pf.mode', reference: 'pf.reference',
      };
      const where = ['pf.deleted_at IS NULL', 'f.deleted_at IS NULL'];
      const params: unknown[] = [];
      applyHotelFilter(where, params, hotelIds, filters, 'f.hotel_id');
      applyDateFilter(where, params, filters, 'pf.date_paiement');
      return { sql: `SELECT ${pickColumns(selectMap, columns)} FROM paiements_facture pf INNER JOIN factures f ON f.id = pf.facture_id INNER JOIN hotels h ON h.id = f.hotel_id WHERE ${where.join(' AND ')} ORDER BY pf.date_paiement DESC`, params };
    },
  },
  clients_facturation: {
    id: 'clients_facturation', label: 'Référentiel clients', category: 'Finance',
    description: 'Base clients facturation (particuliers et entreprises)',
    module: 'facturation', permissions: PERM_EXPORT, icon: 'users',
    supportsDateFilter: false, supportsHotelFilter: false, supportsStatutFilter: false,
    columns: [
      { key: 'type', label: 'Type', width: 12 }, { key: 'nom', label: 'Nom', width: 24 },
      { key: 'raison_sociale', label: 'Raison sociale', width: 24 }, { key: 'email', label: 'Email', width: 22 },
      { key: 'telephone', label: 'Téléphone', width: 14 }, { key: 'nif', label: 'NIF', width: 14 },
      { key: 'rc', label: 'RC', width: 14 }, { key: 'adresse', label: 'Adresse', width: 30 },
    ],
    buildQuery(columns, _filters, _hotelIds) {
      const selectMap: Record<string, string> = {
        type: 'c.type', nom: 'c.nom', raison_sociale: 'c.raison_sociale', email: 'c.email',
        telephone: 'c.telephone', nif: 'c.nif', rc: 'c.rc', adresse: 'c.adresse',
      };
      return { sql: `SELECT ${pickColumns(selectMap, columns)} FROM clients_facturation c WHERE c.deleted_at IS NULL ORDER BY c.nom`, params: [] };
    },
  },
  port_factures: {
    id: 'port_factures', label: 'Factures portuaires', category: 'PortMaster',
    description: 'Factures marina avec encaissements et reste à payer',
    module: 'portmaster', permissions: PERM_PORT, icon: 'anchor',
    supportsDateFilter: true, supportsHotelFilter: false, supportsStatutFilter: true,
    statutOptions: [
      { value: 'brouillon', label: 'Brouillon' }, { value: 'emise', label: 'Émise' },
      { value: 'payee', label: 'Payée' }, { value: 'annulee', label: 'Annulée' },
    ],
    columns: [
      { key: 'numero', label: 'N° facture', width: 18 }, { key: 'client', label: 'Client', width: 28 },
      { key: 'date_facture', label: 'Date', width: 12 }, { key: 'montant_ttc', label: 'TTC', width: 14 },
      { key: 'paye', label: 'Payé', width: 14 }, { key: 'reste', label: 'Reste', width: 14 }, { key: 'statut', label: 'Statut', width: 12 },
    ],
    buildQuery(columns, filters, _hotelIds) {
      const payeSub = `(SELECT COALESCE(SUM(pe.montant), 0) FROM port_encaissements pe WHERE pe.facture_id = f.id AND COALESCE(pe.statut, 'valide') = 'valide')`;
      const selectMap: Record<string, string> = {
        numero: 'f.numero', client: `COALESCE(c.raison_sociale, c.prenom || ' ' || c.nom) AS client`,
        date_facture: 'f.date_facture', montant_ttc: 'f.montant_ttc',
        paye: `${payeSub} AS paye`, reste: `(f.montant_ttc - ${payeSub}) AS reste`, statut: 'f.statut',
      };
      const where = ['f.deleted_at IS NULL'];
      const params: unknown[] = [];
      applyDateFilter(where, params, filters, 'f.date_facture');
      applyStatutFilter(where, params, filters, 'f.statut');
      return { sql: `SELECT ${pickColumns(selectMap, columns)} FROM port_factures f INNER JOIN port_clients c ON c.id = f.client_id WHERE ${where.join(' AND ')} ORDER BY f.date_facture DESC`, params };
    },
  },
  port_contrats: {
    id: 'port_contrats', label: 'Contrats d\'amarrage', category: 'PortMaster',
    description: 'Contrats marina, bateaux et emplacements',
    module: 'portmaster', permissions: PERM_PORT, icon: 'ship',
    supportsDateFilter: true, supportsHotelFilter: false, supportsStatutFilter: true,
    statutOptions: [
      { value: 'brouillon', label: 'Brouillon' }, { value: 'actif', label: 'Actif' },
      { value: 'expire', label: 'Expiré' }, { value: 'resilie', label: 'Résilié' },
    ],
    columns: [
      { key: 'numero', label: 'N° contrat', width: 16 }, { key: 'client', label: 'Client', width: 24 },
      { key: 'bateau', label: 'Bateau', width: 20 }, { key: 'emplacement', label: 'Emplacement', width: 12 },
      { key: 'date_debut', label: 'Début', width: 12 }, { key: 'date_fin', label: 'Fin', width: 12 },
      { key: 'montant_total', label: 'Montant total', width: 14 }, { key: 'statut', label: 'Statut', width: 12 },
    ],
    buildQuery(columns, filters, _hotelIds) {
      const selectMap: Record<string, string> = {
        numero: 'c.numero', client: `COALESCE(cl.raison_sociale, cl.prenom || ' ' || cl.nom) AS client`,
        bateau: 'b.nom AS bateau', emplacement: 'e.code AS emplacement',
        date_debut: 'c.date_debut', date_fin: 'c.date_fin', montant_total: 'c.montant_total', statut: 'c.statut',
      };
      const where = ['c.deleted_at IS NULL'];
      const params: unknown[] = [];
      applyDateFilter(where, params, filters, 'c.date_debut');
      applyStatutFilter(where, params, filters, 'c.statut');
      return { sql: `SELECT ${pickColumns(selectMap, columns)} FROM port_contrats c INNER JOIN port_clients cl ON cl.id = c.client_id INNER JOIN port_bateaux b ON b.id = c.bateau_id INNER JOIN port_emplacements e ON e.id = c.emplacement_id WHERE ${where.join(' AND ')} ORDER BY c.date_debut DESC`, params };
    },
  },
  port_bateaux: {
    id: 'port_bateaux', label: 'Flotte portuaire', category: 'PortMaster',
    description: 'Bateaux enregistrés avec propriétaires et caractéristiques',
    module: 'portmaster', permissions: PERM_PORT, icon: 'sailboat',
    supportsDateFilter: false, supportsHotelFilter: false, supportsStatutFilter: true,
    statutOptions: [{ value: 'actif', label: 'Actif' }, { value: 'inactif', label: 'Inactif' }],
    columns: [
      { key: 'nom', label: 'Nom bateau', width: 22 }, { key: 'client', label: 'Propriétaire', width: 24 },
      { key: 'immatriculation', label: 'Immatriculation', width: 16 }, { key: 'longueur', label: 'Longueur (m)', width: 12 },
      { key: 'tirant_eau', label: 'Tirant d\'eau (m)', width: 12 }, { key: 'statut', label: 'Statut', width: 12 },
    ],
    buildQuery(columns, filters, _hotelIds) {
      const selectMap: Record<string, string> = {
        nom: 'b.nom',
        client: `COALESCE(cl.raison_sociale, cl.prenom || ' ' || cl.nom, b.proprietaire) AS client`,
        immatriculation: 'b.immatriculation', longueur: 'b.longueur_m AS longueur',
        tirant_eau: 'b.tirant_eau_m AS tirant_eau', statut: 'b.statut',
      };
      const where = ['b.deleted_at IS NULL'];
      const params: unknown[] = [];
      applyStatutFilter(where, params, filters, 'b.statut');
      return { sql: `SELECT ${pickColumns(selectMap, columns)} FROM port_bateaux b LEFT JOIN port_clients cl ON cl.id = b.client_id WHERE b.deleted_at IS NULL AND ${where.join(' AND ')} ORDER BY b.nom`, params };
    },
  },
  audit_log: {
    id: 'audit_log', label: 'Journal d\'audit', category: 'Contrôle',
    description: 'Traçabilité des actions utilisateurs (qui, quoi, quand)',
    module: 'audit', permissions: PERM_AUDIT, icon: 'shield',
    supportsDateFilter: true, supportsHotelFilter: false, supportsStatutFilter: false,
    supportsModuleFilter: true,
    columns: [
      { key: 'date', label: 'Date/heure', width: 18 }, { key: 'utilisateur', label: 'Utilisateur', width: 22 },
      { key: 'role', label: 'Rôle', width: 14 }, { key: 'module', label: 'Module', width: 14 },
      { key: 'action', label: 'Action', width: 14 }, { key: 'description', label: 'Description', width: 36 },
    ],
    buildQuery(columns, filters, _hotelIds) {
      const selectMap: Record<string, string> = {
        date: 'a.created_at AS date', utilisateur: 'a.user_email AS utilisateur', role: 'a.role_code AS role',
        module: 'a.module', action: 'a.action', description: 'a.description',
      };
      const where = ['1=1'];
      const params: unknown[] = [];
      applyDateFilter(where, params, filters, 'a.created_at');
      if (filters.moduleFilter) { where.push('a.module = ?'); params.push(filters.moduleFilter); }
      return { sql: `SELECT ${pickColumns(selectMap, columns)} FROM audit_log a WHERE ${where.join(' AND ')} ORDER BY a.created_at DESC`, params };
    },
  },
};
