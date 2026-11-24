export type Stage =
  | "new"
  | "qualified"
  | "contacted"
  | "inspecting"
  | "offer"
  | "won"
  | "lost";

export const STAGES: Stage[] = [
  "new",
  "qualified",
  "contacted",
  "inspecting",
  "offer",
  "won",
  "lost",
];

export type Verdict = "qualify" | "disqualify" | "review";

export interface Property {
  id: string;
  address: string;
  suburb: string;
  lat: number;
  lng: number;
  askingPrice: number;
  beds: number;
  baths: number;
  landSqm: number;
  estimatedValue: number;
  weeklyRent: number;
  listingText: string;
  stage: Stage;
}

export interface Criteria {
  maxPrice: number;
  minBeds: number;
  minGrossYieldPct: number;
  minDiscountToValuePct: number;
  suburbs: string[];
}

export interface RuleResult {
  passed: boolean;
  failures: string[];
}

export interface AgentOutput {
  verdict: Verdict;
  score: number; // 0-100
  reasons: string[];
  redFlags: string[];
}

export interface Assessment extends AgentOutput {
  propertyId: string;
  source: "rules" | "llm" | "mock";
  createdAt: string;
  override?: { verdict: Verdict; note: string; at: string };
}

export interface ActivityEntry {
  at: string;
  propertyId: string;
  text: string;
}
