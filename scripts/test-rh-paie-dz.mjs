/**
 * Tests moteur paie DZ — npm run test:rh-paie
 * (copie des formules de rh-paie-dz-engine.ts pour exécution Node pure)
 */

const CNAS_SALARIE_TAUX = 0.09;

function calculateIrg(imposable, enfantsCharge = 0) {
  if (imposable <= 0) return 0;
  const abattement = 40_000 + enfantsCharge * 1_000;
  const base = Math.max(0, imposable - abattement);
  if (base <= 30_000) return Math.round(base * 0.23 * 100) / 100;
  if (base <= 120_000) return Math.round((6_900 + (base - 30_000) * 0.27) * 100) / 100;
  return Math.round((31_200 + (base - 120_000) * 0.33) * 100) / 100;
}

function calculatePaieDz(brut, enfantsCharge = 0) {
  const cotisationSalarie = Math.round(brut * CNAS_SALARIE_TAUX * 100) / 100;
  const imposable = brut - cotisationSalarie;
  const irg = calculateIrg(imposable, enfantsCharge);
  const net = Math.round((brut - cotisationSalarie - irg) * 100) / 100;
  return { cotisationSalarie, irg, net };
}

function calculateStcDz(input) {
  const tauxJournalier = input.salaireBrut / 30;
  const indemniteConges = Math.round(tauxJournalier * Math.max(0, input.joursCongesRestants) * 100) / 100;
  const totalBrut = indemniteConges;
  const paie = calculatePaieDz(totalBrut, 0);
  return { indemniteConges, netAPayer: paie.net };
}

function assert(cond, msg) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`OK: ${msg}`);
}

const paie30 = calculatePaieDz(30_000, 0);
assert(Math.abs(paie30.cotisationSalarie - 2700) < 0.02, 'CNAS 30k = 2700 DZD');
assert(calculateIrg(5_000, 0) === 0, 'IRG faible = 0');

const irg1 = calculateIrg(50_000, 0);
const irgEnfant = calculateIrg(50_000, 2);
assert(irgEnfant <= irg1, 'Abattement enfants');

const paie100 = calculatePaieDz(100_000, 1);
assert(paie100.net < 100_000 - paie100.cotisationSalarie, 'Net < brut - CNAS');

const stc = calculateStcDz({
  salaireBrut: 60_000,
  joursCongesRestants: 10,
});
assert(stc.indemniteConges > 0, 'Indemnité congés STC');

console.log('\nTous les tests paie DZ passés.');
