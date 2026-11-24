import type { Criteria, Property, RuleResult } from "./types";

export const DEFAULT_CRITERIA: Criteria = {
  maxPrice: 750_000,
  minBeds: 3,
  minGrossYieldPct: 5,
  minDiscountToValuePct: 5,
  suburbs: ["Northgate", "Riverbend", "Kellyville Park", "Oakhurst"],
};

export function grossYieldPct(p: Pick<Property, "weeklyRent" | "askingPrice">): number {
  if (p.askingPrice <= 0) return 0;
  return ((p.weeklyRent * 52) / p.askingPrice) * 100;
}

export function discountToValuePct(
  p: Pick<Property, "estimatedValue" | "askingPrice">,
): number {
  if (p.estimatedValue <= 0) return 0;
  return ((p.estimatedValue - p.askingPrice) / p.estimatedValue) * 100;
}

/**
 * Hard cuts are decided by plain code, never by the model.
 * The model only reads the messy listing text after these pass.
 */
export function checkRules(p: Property, c: Criteria): RuleResult {
  const failures: string[] = [];
  if (p.askingPrice > c.maxPrice) {
    failures.push(`Asking price ${p.askingPrice} is above the maximum ${c.maxPrice}`);
  }
  if (p.beds < c.minBeds) {
    failures.push(`${p.beds} bedrooms is below the minimum ${c.minBeds}`);
  }
  const y = grossYieldPct(p);
  if (y < c.minGrossYieldPct) {
    failures.push(`Gross yield ${y.toFixed(1)}% is below the minimum ${c.minGrossYieldPct}%`);
  }
  const d = discountToValuePct(p);
  if (d < c.minDiscountToValuePct) {
    failures.push(
      `Discount to estimated value ${d.toFixed(1)}% is below the minimum ${c.minDiscountToValuePct}%`,
    );
  }
  if (c.suburbs.length > 0 && !c.suburbs.includes(p.suburb)) {
    failures.push(`${p.suburb} is not in the target suburb list`);
  }
  return { passed: failures.length === 0, failures };
}
