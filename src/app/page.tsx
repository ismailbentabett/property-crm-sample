import { store } from "@/lib/store";
import { STAGES } from "@/lib/types";

export const dynamic = "force-dynamic";

function verdictOf(id: string) {
  const a = store.assessments.get(id);
  if (!a) return null;
  return a.override?.verdict ?? a.verdict;
}

export default function Board() {
  const props = store.list();
  return (
    <>
      <h2 style={{ margin: "0 0 14px" }}>Pipeline</h2>
      <div className="board">
        {STAGES.map((stage) => {
          const items = props.filter((p) => p.stage === stage);
          return (
            <section className="col" key={stage}>
              <h2>
                <span>{stage}</span>
                <span>{items.length}</span>
              </h2>
              {items.map((p) => {
                const v = verdictOf(p.id);
                return (
                  <a className="card" key={p.id} href={`/property/${p.id}`}>
                    <strong>{p.address}</strong>
                    <small>
                      {p.suburb} · ${p.askingPrice.toLocaleString("en-AU")}
                    </small>
                    <span className={`badge b-${v ?? "none"}`}>{v ?? "not screened"}</span>
                  </a>
                );
              })}
            </section>
          );
        })}
      </div>
    </>
  );
}
