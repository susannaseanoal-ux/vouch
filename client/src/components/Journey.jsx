/**
 * The customer's progress track.
 *
 * Rows are built by the server from what was actually logged against the
 * lead. A step known to have been reached but never timed says so,
 * rather than being given a plausible-looking date.
 */
export default function Journey({ journey, status }) {
  if (!journey?.length) return null;

  const done = status === "Sold";
  const stopped = status === "Closed" || status === "Not Interested";

  return (
    <div className={"journey" + (done ? " is-done" : "") + (stopped ? " is-stopped" : "")}>
      <p className="journey-title">Your progress</p>

      <div>
        {journey.map((s, i) => (
          <div
            key={`${s.key}-${i}`}
            className={
              "jstep" +
              (s.done ? " is-done" : "") +
              (s.next ? " is-next" : "") +
              (s.extra ? " is-extra" : "")
            }
          >
            <span className="jtick" aria-hidden="true">{s.done ? "✓" : ""}</span>
            <span className="jname">{s.label}</span>

            <span className="jmeta">
              {s.at && <span>{s.at}</span>}
              {s.duration && <span className="dur">Call lasted {s.duration}</span>}
              {s.scheduled && <span className="book">Booked for {s.scheduled}</span>}
              {s.done && !s.at && !s.scheduled && <span className="untimed">Time not recorded</span>}
              {s.count > 1 && <span>{s.count} times</span>}
            </span>
          </div>
        ))}
      </div>

      {stopped && (
        <p className="journey-note">This request is closed, so it will not move any further.</p>
      )}
    </div>
  );
}
