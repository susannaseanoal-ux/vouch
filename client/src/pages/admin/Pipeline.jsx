import { useEffect, useRef, useState } from "react";

/* ===================================================================
   The pipeline

   Where every lead currently sits, as one row of bars that grow from
   nothing when the panel loads. Clicking a stage filters the table to
   it, so the chart is a control rather than a picture.

   Deliberately not a pie chart. The question an agent has is "where is
   the work piling up", and length answers that far better than angle.
   =================================================================== */

const ACTIVE = ["New", "Contacted", "Appointment Set", "Application Started", "Sold"];
const ENDED = ["Not Interested", "Closed"];

export default function Pipeline({ byStatus, onPick, active }) {
  const [grown, setGrown] = useState(false);
  const ref = useRef(null);

  /* Bars grow once, when the section is first seen. */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setGrown(true); io.disconnect(); }
    }, { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  if (!byStatus) return null;

  const live = ACTIVE.map((s) => ({ status: s, n: byStatus[s] || 0 }));
  const dead = ENDED.map((s) => ({ status: s, n: byStatus[s] || 0 }));
  const peak = Math.max(1, ...live.map((d) => d.n));
  const lost = dead.reduce((sum, d) => sum + d.n, 0);
  const won = byStatus.Sold || 0;
  const working = live.reduce((sum, d) => sum + d.n, 0) - won;

  return (
    <section className="pipe" ref={ref}>
      <div className="pipe-head">
        <h2>Pipeline</h2>
        <div className="pipe-sum">
          <span><b>{working}</b> in play</span>
          <span className="is-won"><b>{won}</b> sold</span>
          <span className="is-lost"><b>{lost}</b> closed</span>
        </div>
      </div>

      <div className="pipe-bars">
        {live.map((d, i) => {
          const pct = grown ? Math.max(d.n ? 6 : 0, (d.n / peak) * 100) : 0;
          return (
            <button
              key={d.status}
              className={"pipe-bar" + (active === d.status ? " is-active" : "")}
              onClick={() => onPick(active === d.status ? "all" : d.status)}
              title={`${d.n} at ${d.status} - click to filter`}
              style={{ "--i": i }}
            >
              <span className="pipe-count">{d.n}</span>
              <span className="pipe-track">
                <span
                  className="pipe-fill"
                  style={{ height: pct + "%", transitionDelay: `${i * 90}ms` }}
                />
              </span>
              <span className="pipe-label">{d.status}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
