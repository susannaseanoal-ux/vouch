import { useEffect, useMemo, useRef, useState } from "react";

/* ===================================================================
   Command palette

   Ctrl/Cmd-K from anywhere. Search every lead, jump to a filter, change
   the theme, sign out - without touching the mouse.

   This is the thing that separates a tool people tolerate from one they
   get fast at. An agent working a list of eighty leads should never
   have to hunt for a row with a pointer.
   =================================================================== */

/* A forgiving match: the letters have to appear in order, but not
   together. "jsm" finds "John Smith". Returns a score so closer
   matches float to the top, or -1 for no match at all. */
function fuzzy(needle, haystack) {
  const n = needle.toLowerCase();
  const h = haystack.toLowerCase();
  if (!n) return 0;

  let i = 0, score = 0, streak = 0;
  for (let j = 0; j < h.length && i < n.length; j++) {
    if (h[j] === n[i]) {
      streak++;
      score += streak * 2;          // consecutive hits are worth more
      if (j === 0 || h[j - 1] === " ") score += 8;   // start of a word
      i++;
    } else {
      streak = 0;
    }
  }
  return i === n.length ? score : -1;
}

export default function CommandPalette({ leads, statuses, onOpenLead, onFilter, onTheme, onSignOut }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  /* Ctrl/Cmd-K opens it, Escape closes it. Bound once, on the window,
     so it works wherever focus happens to be. */
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (e.key === "Escape") setOpen(false);

      /* "/" is the other convention people reach for, but only when
         they are not already typing into something. */
      if (e.key === "/" && !/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQ("");
      setSel(0);
      // Wait for the element to exist before asking for focus.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const items = useMemo(() => {
    const actions = [
      { kind: "action", label: "Show all leads", hint: "filter", run: () => onFilter({ status: "all", type: "all" }) },
      ...statuses.map((s) => ({
        kind: "action", label: `Filter: ${s}`, hint: "filter", run: () => onFilter({ status: s }),
      })),
      { kind: "action", label: "Only coverage requests", hint: "filter", run: () => onFilter({ type: "coverage" }) },
      { kind: "action", label: "Only group interviews", hint: "filter", run: () => onFilter({ type: "interview" }) },
      { kind: "action", label: "Switch theme", hint: "view", run: onTheme },
      { kind: "action", label: "Sign out", hint: "account", run: onSignOut },
    ];

    const leadItems = leads.map((l) => ({
      kind: "lead",
      label: l.name,
      sub: `${l.leadId} · ${l.email || l.phone || "no contact"}`,
      hint: l.status,
      run: () => onOpenLead(l.leadId),
      haystack: `${l.name} ${l.leadId} ${l.email} ${l.phone} ${l.status}`,
    }));

    const all = [...leadItems, ...actions];
    if (!q.trim()) return all.slice(0, 9);

    return all
      .map((it) => ({ it, score: fuzzy(q.trim(), it.haystack || it.label) }))
      .filter((r) => r.score >= 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 9)
      .map((r) => r.it);
  }, [q, leads, statuses, onFilter, onOpenLead, onTheme, onSignOut]);

  function onKeyDown(e) {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(items.length - 1, s + 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
    if (e.key === "Enter") {
      e.preventDefault();
      const item = items[sel];
      if (item) { item.run(); setOpen(false); }
    }
  }

  // Keep the highlighted row in view when arrowing past the fold.
  useEffect(() => {
    listRef.current?.children[sel]?.scrollIntoView({ block: "nearest" });
  }, [sel]);

  if (!open) return null;

  return (
    <div className="cmdk-scrim" onClick={() => setOpen(false)}>
      <div className="cmdk" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true"
           aria-label="Command palette">
        <div className="cmdk-top">
          <SearchIcon />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => { setQ(e.target.value); setSel(0); }}
            onKeyDown={onKeyDown}
            placeholder="Search leads, or type a command…"
            aria-label="Search leads or commands"
          />
          <kbd>esc</kbd>
        </div>

        <div className="cmdk-list" ref={listRef} role="listbox">
          {items.length === 0 && <p className="cmdk-empty">Nothing matches “{q}”.</p>}

          {items.map((it, i) => (
            <button
              key={i}
              role="option"
              aria-selected={i === sel}
              className={"cmdk-item" + (i === sel ? " is-sel" : "")}
              onMouseEnter={() => setSel(i)}
              onClick={() => { it.run(); setOpen(false); }}
              style={{ "--i": i }}
            >
              <span className={"cmdk-ico is-" + it.kind}>
                {it.kind === "lead" ? it.label.charAt(0).toUpperCase() : "›"}
              </span>
              <span className="cmdk-body">
                <span className="cmdk-label">{it.label}</span>
                {it.sub && <span className="cmdk-sub">{it.sub}</span>}
              </span>
              <span className="cmdk-hint">{it.hint}</span>
            </button>
          ))}
        </div>

        <div className="cmdk-foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> move</span>
          <span><kbd>↵</kbd> open</span>
          <span><kbd>ctrl</kbd><kbd>K</kbd> toggle</span>
        </div>
      </div>
    </div>
  );
}

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
       strokeWidth="2.1" strokeLinecap="round" aria-hidden="true">
    <circle cx="11" cy="11" r="7" /><path d="m20 20-3.6-3.6" />
  </svg>
);
