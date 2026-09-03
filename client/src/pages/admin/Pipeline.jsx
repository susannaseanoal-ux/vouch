import { useEffect, useRef, useState } from "react";

/* ===================================================================
   The pipeline

   Where every lead currently sits, as five stages read left to right.
   Clicking a stage filters the table to it, so this is a control rather
   than a picture.

   Each stage always draws its icon and its track, even at zero. An
   empty pipeline should look like an empty pipeline - five quiet stages
   waiting for work - rather than like a panel that failed to load.
   =================================================================== */

const STAGES = [
  { status: "New",                 icon: "inbox",    hint: "just arrived, nobody has called yet" },
  { status: "Contacted",           icon: "phone",    hint: "we have spoken to them" },
  { status: "Appointment Set",     icon: "calendar", hint: "a call or interview is booked" },
  { status: "Application Started", icon: "doc",      hint: "paperwork is under way" },
  { status: "Sold",                icon: "check",    hint: "policy issued" },
];

const ENDED = ["Not Interested", "Closed"];

export default function Pipeline({ byStatus, onPick, active }) {
  const [grown, setGrown] = useState(false);
  const ref = useRef(null);

  /* Bars grow once, when the section is first seen. The timer is a
     safety net: if the observer never fires - a hidden tab, a browser
     that throttles it - the bars must still end up drawn. */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setGrown(true); io.disconnect(); }
    }, { threshold: 0.15 });
    io.observe(el);

    const fallback = setTimeout(() => setGrown(true), 1200);
    return () => { io.disconnect(); clearTimeout(fallback); };
  }, []);

  if (!byStatus) return null;

  const live = STAGES.map((s) => ({ ...s, n: byStatus[s.status] || 0 }));
  const peak = Math.max(1, ...live.map((d) => d.n));
  const lost = ENDED.reduce((sum, s) => sum + (byStatus[s] || 0), 0);
  const won = byStatus.Sold || 0;
  const working = live.reduce((sum, d) => sum + d.n, 0) - won;
  const total = working + won + lost;

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
          const pct = grown && d.n ? Math.max(8, (d.n / peak) * 100) : 0;
          return (
            <button
              key={d.status}
              className={
                "pipe-bar" +
                (active === d.status ? " is-active" : "") +
                (d.n === 0 ? " is-empty" : "")
              }
              onClick={() => onPick(active === d.status ? "all" : d.status)}
              title={`${d.n} at ${d.status} - ${d.hint}. Click to filter.`}
              style={{ "--i": i }}
            >
              <span className="pipe-icon"><Icon name={d.icon} /></span>
              <span className="pipe-count">{d.n}</span>
              <span className="pipe-track">
                <span className="pipe-fill" style={{ height: pct + "%", transitionDelay: `${i * 90}ms` }} />
              </span>
              <span className="pipe-label">{d.status}</span>
            </button>
          );
        })}
      </div>

      {total === 0 && (
        <p className="pipe-none">
          No leads yet. The first one to come through the website will appear here.
        </p>
      )}
    </section>
  );
}

/* ---- stage icons --------------------------------------------------- */
const PATHS = {
  inbox: <><path d="M3.5 13.5h4l1.2 2.2h6.6l1.2-2.2h4" /><path d="M5.2 5.4h13.6l2.7 8.1v4.3a1.6 1.6 0 0 1-1.6 1.6H4.1a1.6 1.6 0 0 1-1.6-1.6v-4.3z" /></>,
  phone: <path d="M6.6 3.5h3l1.5 3.8-2 1.4a12.5 12.5 0 0 0 6.2 6.2l1.4-2 3.8 1.5v3a2 2 0 0 1-2.2 2A17.5 17.5 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2z" />,
  calendar: <><rect x="3.4" y="5.2" width="17.2" height="15.4" rx="2" /><path d="M3.4 10h17.2M8.2 3.4v3.6M15.8 3.4v3.6" /></>,
  doc: <><path d="M6 2.8h7.6L18.8 8v13.2H6z" /><path d="M13.4 2.8V8h5.4M9 12.6h6M9 16.2h6" /></>,
  check: <><circle cx="12" cy="12" r="8.6" /><path d="M8.2 12.2l2.7 2.7 5-5.2" /></>,
};

const Icon = ({ name }) => (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor"
       strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {PATHS[name]}
  </svg>
);
