import { describe, expect, it } from "vitest";
import { DEFAULT_CRITERIA, checkRules, discountToValuePct, grossYieldPct } from "@/lib/criteria";
import { feasibility } from "@/lib/feasibility";
import { canMove, assertMove, nextStages } from "@/lib/pipeline";
import { SEED } from "@/lib/seed";
import { StoreClass } from "@/lib/store";

const byId = (id: string) => SEED.find((p) => p.id === id)!;

describe("rules", () => {
  it("passes a property that meets every criterion", () => {
    expect(checkRules(byId("p1"), DEFAULT_CRITERIA)).toEqual({ passed: true, failures: [] });
  });

  it("fails on price", () => {
    const r = checkRules(byId("p4"), DEFAULT_CRITERIA);
    expect(r.passed).toBe(false);
    expect(r.failures.join(" ")).toContain("above the maximum");
  });

  it("fails on suburb", () => {
    const r = checkRules({ ...byId("p1"), suburb: "Elsewhere" }, DEFAULT_CRITERIA);
    expect(r.failures.join(" ")).toContain("not in the target suburb list");
  });

  it("fails on bedrooms and reports every failure, not just the first", () => {
    const r = checkRules({ ...byId("p1"), beds: 2, askingPrice: 900_000 }, DEFAULT_CRITERIA);
    expect(r.failures.length).toBeGreaterThanOrEqual(2);
  });

  it("computes yield and discount", () => {
    expect(grossYieldPct({ weeklyRent: 500, askingPrice: 520_000 })).toBeCloseTo(5, 5);
    expect(discountToValuePct({ estimatedValue: 600_000, askingPrice: 570_000 })).toBeCloseTo(5, 5);
  });

  it("handles zero values without dividing by zero", () => {
    expect(grossYieldPct({ weeklyRent: 500, askingPrice: 0 })).toBe(0);
    expect(discountToValuePct({ estimatedValue: 0, askingPrice: 100 })).toBe(0);
  });
});

describe("pipeline", () => {
  it("allows the normal forward path", () => {
    expect(canMove("new", "qualified")).toBe(true);
    expect(canMove("offer", "won")).toBe(true);
  });

  it("blocks skipping stages", () => {
    expect(canMove("new", "offer")).toBe(false);
    expect(() => assertMove("new", "won")).toThrow(/Cannot move/);
  });

  it("allows losing from any open stage and reopening a lost lead", () => {
    expect(canMove("inspecting", "lost")).toBe(true);
    expect(canMove("lost", "new")).toBe(true);
    expect(nextStages("won")).toEqual([]);
  });
});

describe("feasibility", () => {
  it("calculates net yield with costs and vacancy", () => {
    const r = feasibility({
      purchasePrice: 500_000,
      renovation: 0,
      weeklyRent: 500,
      annualCostsPct: 20,
      vacancyWeeks: 2,
    });
    expect(r.annualRent).toBe(25_000);
    expect(r.netAnnualIncome).toBe(20_000);
    expect(r.grossYieldPct).toBeCloseTo(5, 5);
    expect(r.netYieldPct).toBeCloseTo(4, 5);
  });

  it("includes renovation in total cost", () => {
    const r = feasibility({
      purchasePrice: 500_000,
      renovation: 50_000,
      weeklyRent: 500,
      annualCostsPct: 0,
      vacancyWeeks: 0,
    });
    expect(r.totalCost).toBe(550_000);
  });

  it("rejects negative money and impossible vacancy", () => {
    const base = { purchasePrice: 1, renovation: 0, weeklyRent: 1, annualCostsPct: 0, vacancyWeeks: 0 };
    expect(() => feasibility({ ...base, renovation: -1 })).toThrow();
    expect(() => feasibility({ ...base, vacancyWeeks: 60 })).toThrow();
  });
});

describe("store", () => {
  it("moves stage, logs it, and refuses an illegal move", () => {
    const s = new StoreClass();
    s.moveStage("p1", "qualified");
    expect(s.get("p1")!.stage).toBe("qualified");
    expect(s.activity[0].text).toContain("new to qualified");
    expect(() => s.moveStage("p1", "won")).toThrow(/Cannot move/);
  });

  it("requires a note and a prior agent run to override", async () => {
    const s = new StoreClass();
    expect(() => s.override("p1", "qualify", "ok")).toThrow(/Run the agent/);
    await s.runAgent("p1");
    expect(() => s.override("p1", "disqualify", "  ")).toThrow(/needs a note/);
    const a = s.override("p1", "disqualify", "Vendor pulled out");
    expect(a.override?.verdict).toBe("disqualify");
    expect(s.activity[0].text).toContain("Person overrode");
  });
});
