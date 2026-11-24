import { notFound } from "next/navigation";
import { moveStageAction, overrideAction, runAgentAction } from "@/app/actions";
import { DEFAULT_CRITERIA, discountToValuePct, grossYieldPct } from "@/lib/criteria";
import { feasibility } from "@/lib/feasibility";
import { nextStages } from "@/lib/pipeline";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

function num(v: string | string[] | undefined, fallback: number): number {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return Number.isFinite(n) && v !== undefined && v !== "" ? n : fallback;
}

export default function PropertyPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const p = store.get(params.id);
  if (!p) notFound();
  const a = store.assessments.get(p.id);
  const shown = a?.override?.verdict ?? a?.verdict;

  const reno = num(searchParams.reno, 15_000);
  const costs = num(searchParams.costs, 25);
  const vacancy = num(searchParams.vacancy, 2);
  let f = null as ReturnType<typeof feasibility> | null;
  let feasError = "";
  try {
    f = feasibility({
      purchasePrice: p.askingPrice,
      renovation: reno,
      weeklyRent: p.weeklyRent,
      annualCostsPct: costs,
      vacancyWeeks: vacancy,
    });
  } catch (e) {
    feasError = e instanceof Error ? e.message : "Invalid input";
  }

  const d = 0.01;
  const bbox = `${p.lng - d},${p.lat - d},${p.lng + d},${p.lat + d}`;
  const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${p.lat},${p.lng}`;
  const log = store.activity.filter((x) => x.propertyId === p.id).slice(0, 8);

  return (
    <>
      <p style={{ margin: "0 0 6px" }}>
        <a href="/">← Pipeline</a>
      </p>
      <h2 style={{ margin: "0 0 4px" }}>{p.address}</h2>
      <p style={{ margin: "0 0 18px", color: "var(--muted)" }}>
        {p.suburb} · stage: <b>{p.stage}</b>
      </p>

      <div className="grid2">
        <div>
          <div className="panel">
            <h3>Property card</h3>
            <div className="facts">
              <div><b>${p.askingPrice.toLocaleString("en-AU")}</b><span>Asking</span></div>
              <div><b>${p.estimatedValue.toLocaleString("en-AU")}</b><span>Estimated value</span></div>
              <div><b>${p.weeklyRent}/wk</b><span>Rent estimate</span></div>
              <div><b>{p.beds} / {p.baths}</b><span>Beds / baths</span></div>
              <div><b>{grossYieldPct(p).toFixed(1)}%</b><span>Gross yield</span></div>
              <div><b>{discountToValuePct(p).toFixed(1)}%</b><span>Below value</span></div>
            </div>
            <p style={{ margin: "14px 0 10px" }}>{p.listingText}</p>
            <iframe className="map" title="Map" src={mapSrc} loading="lazy" />
            <p className="note">
              Map is a basic embed. Aerial imagery is not part of this sample.
            </p>
          </div>

          <div className="panel">
            <h3>Move stage</h3>
            {nextStages(p.stage).length === 0 && <span className="note">Final stage.</span>}
            {nextStages(p.stage).map((s) => (
              <form className="inline" action={moveStageAction} key={s}>
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="to" value={s} />
                <button className="alt" type="submit">→ {s}</button>
              </form>
            ))}
          </div>

          <div className="panel">
            <h3>Activity</h3>
            <ul className="log plain">
              {log.length === 0 && <li>Nothing yet.</li>}
              {log.map((x, i) => (
                <li key={i}>{new Date(x.at).toLocaleString("en-AU")}: {x.text}</li>
              ))}
            </ul>
          </div>
        </div>

        <div>
          <div className="panel">
            <h3>AI lead agent</h3>
            <p className="note" style={{ marginTop: 0 }}>
              Rules decide the hard cuts. The model only reads the listing text. A person can
              override, with a note.
            </p>
            <form action={runAgentAction}>
              <input type="hidden" name="id" value={p.id} />
              <button type="submit">{a ? "Run again" : "Screen this property"}</button>
            </form>
            {a && (
              <>
                <p style={{ margin: "14px 0 4px" }}>
                  <span className={`badge b-${shown}`}>{shown}</span>{" "}
                  <b>score {a.score}</b> · source: {a.source}
                  {a.override && " · overridden by a person"}
                </p>
                <ul className="plain">
                  {a.reasons.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
                {a.redFlags.length > 0 && (
                  <>
                    <p style={{ margin: "10px 0 0" }}><b>Red flags</b></p>
                    <ul className="plain">
                      {a.redFlags.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </>
                )}
                <form action={overrideAction} style={{ marginTop: 14 }}>
                  <input type="hidden" name="id" value={p.id} />
                  <label>
                    Override verdict
                    <select name="verdict" defaultValue="review">
                      <option value="qualify">qualify</option>
                      <option value="review">review</option>
                      <option value="disqualify">disqualify</option>
                    </select>
                  </label>
                  <label>
                    Note (required)
                    <input name="note" placeholder="Why are you changing it?" />
                  </label>
                  <button className="alt" type="submit">Save override</button>
                </form>
              </>
            )}
            <p className="note">
              Criteria in use: max ${DEFAULT_CRITERIA.maxPrice.toLocaleString("en-AU")},{" "}
              {DEFAULT_CRITERIA.minBeds}+ beds, yield ≥ {DEFAULT_CRITERIA.minGrossYieldPct}%,
              discount ≥ {DEFAULT_CRITERIA.minDiscountToValuePct}%.
            </p>
          </div>

          <div className="panel">
            <h3>Feasibility</h3>
            <form method="get">
              <label>Renovation ($)<input name="reno" defaultValue={reno} /></label>
              <label>Yearly costs (% of rent)<input name="costs" defaultValue={costs} /></label>
              <label>Vacant weeks per year<input name="vacancy" defaultValue={vacancy} /></label>
              <button className="alt" type="submit">Recalculate</button>
            </form>
            {feasError && <p style={{ color: "var(--bad)" }}>{feasError}</p>}
            {f && (
              <div className="facts" style={{ marginTop: 14 }}>
                <div><b>${f.totalCost.toLocaleString("en-AU")}</b><span>Total cost</span></div>
                <div><b>${Math.round(f.netAnnualIncome).toLocaleString("en-AU")}</b><span>Net income / yr</span></div>
                <div><b>{f.netYieldPct.toFixed(1)}%</b><span>Net yield</span></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
