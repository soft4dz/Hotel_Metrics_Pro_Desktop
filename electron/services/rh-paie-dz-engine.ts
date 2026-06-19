/** Moteur paie DZ — fonctions pures (CNAS / IRG), testables indépendamment. */

export const CNAS_SALARIE_TAUX = 0.09;
export const CNAS_PATRON_TAUX = 0.26;
export const SMIG_DZD = 20_000;

export function calculateIrg(imposable: number, enfantsCharge = 0): number {
  if (imposable <= 0) return 0;
  const abattement = 40_000 + enfantsCharge * 1_000;
  const base = Math.max(0, imposable - abattement);
  if (base <= 30_000) return Math.round(base * 0.23 * 100) / 100;
  if (base <= 120_000) return Math.round((6_900 + (base - 30_000) * 0.27) * 100) / 100;
  return Math.round((31_200 + (base - 120_000) * 0.33) * 100) / 100;
}

export function calculatePaieDz(brut: number, enfantsCharge = 0): {
  cotisationSalarie: number;
  cotisationPatronale: number;
  irg: number;
  net: number;
  chargesSalariales: number;
} {
  const cotisationSalarie = Math.round(brut * CNAS_SALARIE_TAUX * 100) / 100;
  const cotisationPatronale = Math.round(brut * CNAS_PATRON_TAUX * 100) / 100;
  const imposable = brut - cotisationSalarie;
  const irg = calculateIrg(imposable, enfantsCharge);
  const net = Math.round((brut - cotisationSalarie - irg) * 100) / 100;
  return {
    cotisationSalarie,
    cotisationPatronale,
    irg,
    net,
    chargesSalariales: Math.round((cotisationSalarie + irg) * 100) / 100,
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
