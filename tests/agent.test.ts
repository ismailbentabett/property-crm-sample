import { describe, expect, it, vi } from "vitest";
import { AgentParseError, assess, buildPrompt, mockAgent, parseAgentOutput } from "@/lib/agent";
import { DEFAULT_CRITERIA } from "@/lib/criteria";
import { SEED } from "@/lib/seed";

const good = SEED.find((p) => p.id === "p1")!;
const tooExpensive = SEED.find((p) => p.id === "p4")!;
const risky = SEED.find((p) => p.id === "p5")!;
const fixedNow = () => new Date("2026-11-24T10:00:00Z");

function reply(content: string, ok = true, status = 200) {
  return vi.fn(async () => ({
    ok,
    status,
    json: async () => ({ choices: [{ message: { content } }] }),
  })) as unknown as typeof fetch;
}

describe("parseAgentOutput", () => {
  it("reads a clean JSON reply", () => {
    const out = parseAgentOutput(
      '{"verdict":"qualify","score":82,"reasons":["Tenant in place"],"redFlags":[]}',
    );
    expect(out).toEqual({ verdict: "qualify", score: 82, reasons: ["Tenant in place"], redFlags: [] });
  });

  it("reads JSON wrapped in a code fence", () => {
    const out = parseAgentOutput('```json\n{"verdict":"review","score":50,"reasons":[],"redFlags":["x"]}\n```');
    expect(out.verdict).toBe("review");
    expect(out.redFlags).toEqual(["x"]);
  });

  it("clamps the score to 0..100", () => {
    expect(parseAgentOutput('{"verdict":"qualify","score":250}').score).toBe(100);
    expect(parseAgentOutput('{"verdict":"qualify","score":-4}').score).toBe(0);
  });

  it("rejects an unknown verdict", () => {
    expect(() => parseAgentOutput('{"verdict":"buy now","score":90}')).toThrow(AgentParseError);
  });

  it("rejects text with no JSON", () => {
    expect(() => parseAgentOutput("Sure! This looks great.")).toThrow(AgentParseError);
  });

  it("rejects a non-numeric score", () => {
    expect(() => parseAgentOutput('{"verdict":"qualify","score":"high"}')).toThrow(AgentParseError);
  });
});

describe("assess", () => {
  it("disqualifies on hard rules without calling the model", async () => {
    const fetchFn = reply("{}");
    const a = await assess(tooExpensive, DEFAULT_CRITERIA, { apiKey: "k", fetchFn, now: fixedNow });
    expect(a.verdict).toBe("disqualify");
    expect(a.source).toBe("rules");
    expect(a.reasons.some((r) => r.includes("above the maximum"))).toBe(true);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("uses the offline stand-in when there is no API key", async () => {
    const a = await assess(good, DEFAULT_CRITERIA, { now: fixedNow });
    expect(a.source).toBe("mock");
    expect(a.verdict).toBe("qualify");
  });

  it("uses the model answer when the key is set", async () => {
    const fetchFn = reply('{"verdict":"qualify","score":77,"reasons":["Fixed lease"],"redFlags":[]}');
    const a = await assess(good, DEFAULT_CRITERIA, { apiKey: "k", fetchFn, now: fixedNow });
    expect(a.source).toBe("llm");
    expect(a.score).toBe(77);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("turns a bad model reply into review, never a pass", async () => {
    const a = await assess(good, DEFAULT_CRITERIA, {
      apiKey: "k",
      fetchFn: reply("I think it is fine"),
      now: fixedNow,
    });
    expect(a.verdict).toBe("review");
    expect(a.redFlags.length).toBeGreaterThan(0);
  });

  it("turns an API error into review", async () => {
    const a = await assess(good, DEFAULT_CRITERIA, {
      apiKey: "k",
      fetchFn: reply("", false, 500),
      now: fixedNow,
    });
    expect(a.verdict).toBe("review");
    expect(a.redFlags[0]).toContain("500");
  });

  it("turns a thrown network error into review", async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;
    const a = await assess(good, DEFAULT_CRITERIA, { apiKey: "k", fetchFn, now: fixedNow });
    expect(a.verdict).toBe("review");
    expect(a.redFlags[0]).toBe("network down");
  });
});

describe("mockAgent", () => {
  it("disqualifies a listing with several risk words", () => {
    const out = mockAgent(risky);
    expect(out.verdict).toBe("disqualify");
    expect(out.redFlags.length).toBeGreaterThanOrEqual(2);
  });
});

describe("buildPrompt", () => {
  it("fences the untrusted listing text and warns the model", () => {
    const { system, user } = buildPrompt(good, DEFAULT_CRITERIA);
    expect(system).toContain("untrusted");
    expect(user).toContain("<<<LISTING");
    expect(user).toContain(good.listingText);
  });
});
