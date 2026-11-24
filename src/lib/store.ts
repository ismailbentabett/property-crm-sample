import { assess } from "./agent";
import { DEFAULT_CRITERIA } from "./criteria";
import { assertMove } from "./pipeline";
import { SEED } from "./seed";
import type { ActivityEntry, Assessment, Property, Stage, Verdict } from "./types";

/**
 * In-memory store so the sample runs with zero setup.
 * In a real build this file is the only thing swapped for a PostgreSQL adapter.
 */
class Store {
  properties = new Map<string, Property>(SEED.map((p) => [p.id, { ...p }]));
  assessments = new Map<string, Assessment>();
  activity: ActivityEntry[] = [];

  list(): Property[] {
    return [...this.properties.values()];
  }

  get(id: string): Property | undefined {
    return this.properties.get(id);
  }

  log(propertyId: string, text: string) {
    this.activity.unshift({ at: new Date().toISOString(), propertyId, text });
  }

  moveStage(id: string, to: Stage): Property {
    const p = this.get(id);
    if (!p) throw new Error("Property not found");
    assertMove(p.stage, to);
    this.log(id, `Stage changed from ${p.stage} to ${to}`);
    p.stage = to;
    return p;
  }

  async runAgent(id: string): Promise<Assessment> {
    const p = this.get(id);
    if (!p) throw new Error("Property not found");
    const a = await assess(p, DEFAULT_CRITERIA, {
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL,
    });
    this.assessments.set(id, a);
    this.log(id, `Agent (${a.source}) said ${a.verdict}, score ${a.score}`);
    return a;
  }

  override(id: string, verdict: Verdict, note: string): Assessment {
    const a = this.assessments.get(id);
    if (!a) throw new Error("Run the agent before overriding it");
    if (!note.trim()) throw new Error("An override needs a note");
    a.override = { verdict, note: note.trim(), at: new Date().toISOString() };
    this.log(id, `Person overrode the agent: ${verdict} (${note.trim()})`);
    return a;
  }
}

const g = globalThis as unknown as { __store?: Store };
export const store: Store = g.__store ?? (g.__store = new Store());
export type { Store };
export { Store as StoreClass };
