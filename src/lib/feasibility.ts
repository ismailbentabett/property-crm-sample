export interface FeasibilityInput {
  purchasePrice: number;
  renovation: number;
  weeklyRent: number;
  annualCostsPct: number; // rates, insurance, management, as % of annual rent
  vacancyWeeks: number;
}

export interface FeasibilityResult {
  totalCost: number;
  annualRent: number;
  netAnnualIncome: number;
  grossYieldPct: number;
  netYieldPct: number;
}

export function feasibility(i: FeasibilityInput): FeasibilityResult {
  if (i.purchasePrice < 0 || i.renovation < 0 || i.weeklyRent < 0) {
    throw new Error("Amounts cannot be negative");
  }
  if (i.vacancyWeeks < 0 || i.vacancyWeeks > 52) {
    throw new Error("Vacancy weeks must be between 0 and 52");
  }
  const totalCost = i.purchasePrice + i.renovation;
  const annualRent = i.weeklyRent * (52 - i.vacancyWeeks);
  const costs = annualRent * (i.annualCostsPct / 100);
  const netAnnualIncome = annualRent - costs;
  const pct = (n: number) => (totalCost > 0 ? (n / totalCost) * 100 : 0);
  return {
    totalCost,
    annualRent,
    netAnnualIncome,
    grossYieldPct: pct(annualRent),
    netYieldPct: pct(netAnnualIncome),
  };
}
