import { useEffect, useMemo, useRef, useState } from "react";

/* ===================================================================
   Rough monthly cost, shown live as the sliders move.

   IMPORTANT — these are illustrative figures, not quotes. The shape is
   right (cost rises steeply with age, falls per-dollar as the amount
   goes up, term is cheaper than whole life, tobacco roughly doubles it)
   but the numbers are not any carrier's rate card.

   Replace RATE_PER_1000 with real rates from your carriers before this
   goes anywhere near customers, and keep the disclaimer under it.
   =================================================================== */

/* Indicative annual cost per $1,000 of cover, by age band. */
const RATE_PER_1000 = [
  { age: 25, term: 0.9, whole: 6.4 },
  { age: 35, term: 1.1, whole: 9.1 },
  { age: 45, term: 2.2, whole: 14.2 },
  { age: 55, term: 5.4, whole: 22.8 },
  { age: 65, term: 13.6, whole: 37.5 },
  { age: 75, term: 34.0, whole: 62.0 },
];

function ratePer1000(age, kind) {
  const pts = RATE_PER_1000;
  if (age <= pts[0].age) return pts[0][kind];
  if (age >= pts[pts.length - 1].age) return pts[pts.length - 1][kind];

  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    if (age >= a.age && age <= b.age) {
      const t = (age - a.age) / (b.age - a.age);
      return a[kind] + (b[kind] - a[kind]) * t;   // straight line between bands
    }
  }
  return pts[0][kind];
}

function monthly({ age, amount, kind, tobacco }) {
  const annual = (amount / 1000) * ratePer1000(age, kind);
  const withRisk = annual * (tobacco ? 2.1 : 1);
  return Math.max(8, Math.round((withRisk / 12) * 100) / 100);
}

const money = (n) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default function Estimator({ onQuote }) {
  const [age, setAge] = useState(42);
  const [amount, setAmount] = useState(150000);
  const [kind, setKind] = useState("term");
  const [tobacco, setTobacco] = useState(false);

  const target = useMemo(() => monthly({ age, amount, kind, tobacco }), [age, amount, kind, tobacco]);

  /* The figure eases to its new value instead of snapping, so dragging a
     slider reads as one continuous thing rather than a flicker. */
  const [shown, setShown] = useState(target);
  const raf = useRef(0);
  const from = useRef(target);
  const t0 = useRef(0);

  useEffect(() => {
    from.current = shown;
    t0.current = performance.now();
    cancelAnimationFrame(raf.current);

    const tick = (now) => {
      const p = Math.min(1, (now - t0.current) / 420);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(from.current + (target - from.current) * eased);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  /* The gauge fills in proportion to cover chosen, not to price — the
     point being made is "this is how much protection", not "this is how
     expensive". */
  const fill = Math.min(1, amount / 500000);
  const R = 84;
  const CIRC = 2 * Math.PI * R;

  return (
    <div className="est">
      <div className="est-controls">
        <div className="est-row">
          <label htmlFor="est-age">
            Your age <b>{age}</b>
          </label>
          <input id="est-age" type="range" min="25" max="75" step="1"
                 value={age} onChange={(e) => setAge(+e.target.value)} />
        </div>

        <div className="est-row">
          <label htmlFor="est-amount">
            Cover amount <b>{money(amount)}</b>
          </label>
          <input id="est-amount" type="range" min="10000" max="500000" step="10000"
                 value={amount} onChange={(e) => setAmount(+e.target.value)} />
        </div>

        <div className="est-row">
          <span className="est-label">Type of cover</span>
          <div className="seg" role="group" aria-label="Type of cover">
            <button type="button" className={kind === "term" ? "is-on" : ""}
                    onClick={() => setKind("term")}>Term</button>
            <button type="button" className={kind === "whole" ? "is-on" : ""}
                    onClick={() => setKind("whole")}>Whole life</button>
          </div>
        </div>

        <label className="est-check">
          <input type="checkbox" checked={tobacco} onChange={(e) => setTobacco(e.target.checked)} />
          <span>I've used tobacco in the last 12 months</span>
        </label>
      </div>

      <div className="est-dial">
        <svg viewBox="-100 -100 200 200" width="210" height="210" aria-hidden="true">
          <circle r={R} fill="none" stroke="var(--brand-wash)" strokeWidth="14" />
          <circle
            r={R} fill="none" stroke="url(#estGrad)" strokeWidth="14" strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC * (1 - fill)}
            transform="rotate(-90)"
            style={{ transition: "stroke-dashoffset .45s cubic-bezier(.22,1,.36,1)" }}
          />
          <defs>
            <linearGradient id="estGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--royal)" />
              <stop offset="100%" stopColor="var(--azure)" />
            </linearGradient>
          </defs>
        </svg>

        <div className="est-figure">
          <span className="est-cur">$</span>
          <span className="est-num">{shown.toFixed(0)}</span>
          <span className="est-per">/mo</span>
        </div>

        <p className="est-cap">
          around {money(amount)} of {kind === "term" ? "term" : "whole life"} cover
        </p>

        <button className="btn btn-primary" style={{ marginTop: "1.1rem", width: "100%" }}
                onClick={onQuote}>
          Get this quoted properly <span className="arrow">→</span>
        </button>

        <p className="est-fine">
          An illustration, not a quote. Your real rate depends on your health, the carrier
          and underwriting — and is often lower than this.
        </p>
      </div>
    </div>
  );
}
