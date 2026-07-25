/** Moteur paie DZ — fonctions pures (CNAS / IRG), testables indépendamment. */

/** Heures mensuelles de référence — 40 h/semaine (Loi 90-11). */
export const HEURES_MENSUELLES_REF = 173.33;
/** Majoration heures supplémentaires (+50 %). */
export const MAJORATION_HS = 1.5;
/** Jours ouvrables mensuels de référence pour retenue absence. */
export const JOURS_MOIS_REF = 30;

export interface BrutPaieMensuelInput {
  salaireBrutContrat: number;
  heuresTravaillees: number;
  joursAbsenceNonRemuneree: number;
  primesTotal: number;
}

export interface BrutPaieMensuelResult {
  brutBase: number;
  tauxHoraire: number;
  heuresSup: number;
  montantHs: number;
  retenueAbsence: number;
  primesTotal: number;
  brut: number;
}

/** Calcule le brut mensuel avec HS (Loi 90-11) et retenues absence sans solde. */
export function calculateBrutPaieMensuel(input: BrutPaieMensuelInput): BrutPaieMensuelResult {
  const brutBase = Math.round(input.salaireBrutContrat * 100) / 100;
  const tauxHoraire = brutBase > 0 ? brutBase / HEURES_MENSUELLES_REF : 0;
  const heuresSup = Math.max(0, Math.round((input.heuresTravaillees - HEURES_MENSUELLES_REF) * 100) / 100);
  const montantHs = Math.round(heuresSup * tauxHoraire * MAJORATION_HS * 100) / 100;
  const retenueAbsence = Math.round(
    Math.max(0, input.joursAbsenceNonRemuneree) * (brutBase / JOURS_MOIS_REF) * 100,
  ) / 100;
  const primesTotal = Math.round(input.primesTotal * 100) / 100;
  const brut = Math.round((brutBase + montantHs + primesTotal - retenueAbsence) * 100) / 100;
  return {
    brutBase,
    tauxHoraire: Math.round(tauxHoraire * 100) / 100,
    heuresSup,
    montantHs,
    retenueAbsence,
    primesTotal,
    brut: Math.max(0, brut),
  };
}

export const CNAS_SALARIE_TAUX = 0.09;
export const CNAS_PATRON_TAUX = 0.26;
export const SMIG_DZD = 20_000;

export interface PaieParafiscaleParams {
  tauxAccidentTravail?: number;
  tauxAssuranceChomage?: number;
  tauxFormationPro?: number;
}

export const DEFAULT_PARAFISCAL_PARAMS: Required<PaieParafiscaleParams> = {
  tauxAccidentTravail: 0.0125,
  tauxAssuranceChomage: 0.015,
  tauxFormationPro: 0.01,
};

export function calculateParafiscalesPatronales(
  brut: number,
  params: PaieParafiscaleParams = {},
): {
  accidentTravail: number;
  assuranceChomage: number;
  formationPro: number;
  total: number;
} {
  const p = { ...DEFAULT_PARAFISCAL_PARAMS, ...params };
  const accidentTravail = Math.round(brut * p.tauxAccidentTravail * 100) / 100;
  const assuranceChomage = Math.round(brut * p.tauxAssuranceChomage * 100) / 100;
  const formationPro = Math.round(brut * p.tauxFormationPro * 100) / 100;
  return {
    accidentTravail,
    assuranceChomage,
    formationPro,
    total: Math.round((accidentTravail + assuranceChomage + formationPro) * 100) / 100,
  };
}

export function calculateIrg(imposable: number, enfantsCharge = 0): number {
  if (imposable <= 0) return 0;
  const abattement = 40_000 + enfantsCharge * 1_000;
  const base = Math.max(0, imposable - abattement);
  if (base <= 30_000) return Math.round(base * 0.23 * 100) / 100;
  if (base <= 120_000) return Math.round((6_900 + (base - 30_000) * 0.27) * 100) / 100;
  return Math.round((31_200 + (base - 120_000) * 0.33) * 100) / 100;
}

export function calculatePaieDz(brut: number, enfantsCharge = 0, parafiscales: PaieParafiscaleParams = {}): {
  cotisationSalarie: number;
  cotisationPatronale: number;
  parafiscalesPatronales: ReturnType<typeof calculateParafiscalesPatronales>;
  irg: number;
  net: number;
  chargesSalariales: number;
  coutEmployeur: number;
} {
  const cotisationSalarie = Math.round(brut * CNAS_SALARIE_TAUX * 100) / 100;
  const cotisationPatronale = Math.round(brut * CNAS_PATRON_TAUX * 100) / 100;
  const parafiscalesPatronales = calculateParafiscalesPatronales(brut, parafiscales);
  const imposable = brut - cotisationSalarie;
  const irg = calculateIrg(imposable, enfantsCharge);
  const net = Math.round((brut - cotisationSalarie - irg) * 100) / 100;
  const coutEmployeur = Math.round((brut + cotisationPatronale + parafiscalesPatronales.total) * 100) / 100;
  return {
    cotisationSalarie,
    cotisationPatronale,
    parafiscalesPatronales,
    irg,
    net,
    chargesSalariales: Math.round((cotisationSalarie + irg) * 100) / 100,
    coutEmployeur,
  };
}

export function moisAnciennete(dateEmbauche: string, dateRef: string): number {
  const start = new Date(dateEmbauche);
  const end = new Date(dateRef);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
  return Math.max(
    0,
    (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()),
  );
}

/** Estimation STC — indicatif, validation expert-comptable requise (Code du travail DZ). */
export function calculateStcDz(input: {
  salaireBrut: number;
  dateEmbauche: string;
  dateSortie: string;
  joursCongesRestants: number;
  typeRupture: 'demission' | 'licenciement' | 'fin_cdd' | 'retraite' | 'rupture_conventionnelle';
}): {
  ancienneteMois: number;
  indemniteConges: number;
  indemnitePreavis: number;
  indemniteLicenciement: number;
  totalBrut: number;
  retenues: number;
  netAPayer: number;
} {
  const { salaireBrut, dateEmbauche, dateSortie, joursCongesRestants, typeRupture } = input;
  const ancienneteMois = moisAnciennete(dateEmbauche, dateSortie);
  const tauxJournalier = salaireBrut / 30;
  const indemniteConges = Math.round(tauxJournalier * Math.max(0, joursCongesRestants) * 100) / 100;

  let indemnitePreavis = 0;
  if (typeRupture === 'licenciement' || typeRupture === 'rupture_conventionnelle') {
    if (ancienneteMois < 60) indemnitePreavis = salaireBrut;
    else if (ancienneteMois < 120) indemnitePreavis = salaireBrut * 2;
    else indemnitePreavis = salaireBrut * 3;
  }

  let indemniteLicenciement = 0;
  if (typeRupture === 'licenciement') {
    const tranches = Math.floor(ancienneteMois / 12);
    indemniteLicenciement = Math.round(salaireBrut * 0.15 * Math.min(tranches, 15) * 100) / 100;
  }

  const totalBrut = Math.round((indemniteConges + indemnitePreavis + indemniteLicenciement) * 100) / 100;
  const paie = calculatePaieDz(totalBrut, 0);
  const retenues = paie.chargesSalariales;
  const netAPayer = paie.net;

  return {
    ancienneteMois,
    indemniteConges,
    indemnitePreavis: Math.round(indemnitePreavis * 100) / 100,
    indemniteLicenciement,
    totalBrut,
    retenues,
    netAPayer,
  };
}
