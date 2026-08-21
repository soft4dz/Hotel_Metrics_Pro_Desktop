export type RestaurantSettlement = { mode: string; montant: number };

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateDiscount(
  gross: number,
  fixedAmount: number,
  percentage: number,
): number {
  const safeGross = Math.max(0, roundMoney(gross));
  const requested = Math.max(Number(fixedAmount) || 0, roundMoney(safeGross * Math.max(0, Number(percentage) || 0) / 100));
  return Math.min(safeGross, roundMoney(requested));
}

export function assertSettlementsMatch(total: number, settlements: RestaurantSettlement[]): number {
  if (!settlements.length) throw new Error('Au moins un paiement est obligatoire.');
  if (settlements.some((payment) => !Number.isFinite(payment.montant) || payment.montant <= 0)) {
    throw new Error('Chaque paiement doit avoir un montant positif.');
  }
  const paid = roundMoney(settlements.reduce((sum, payment) => sum + payment.montant, 0));
  if (Math.abs(paid - roundMoney(total)) > 0.01) {
    throw new Error(`Le total des paiements (${paid} DA) doit égaler le ticket (${roundMoney(total)} DA).`);
  }
  return paid;
}

export function refundableBalance(total: number, alreadyRefunded: number): number {
  return Math.max(0, roundMoney(total - alreadyRefunded));
}
