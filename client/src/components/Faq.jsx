import { useState } from "react";

/**
 * An accordion. One panel open at a time — with a list this short,
 * letting several stand open just makes the section sprawl.
 *
 * The open/close height uses a 0fr -> 1fr grid row rather than
 * max-height, so it animates correctly whatever the answer's length.
 */
export default function Faq({ items }) {
  const [open, setOpen] = useState(0);

  return (
    <div>
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div className={"faq-item" + (isOpen ? " is-open" : "")} key={item.q}>
            <h3 style={{ margin: 0 }}>
              <button
                type="button"
                className="faq-q"
                aria-expanded={isOpen}
                aria-controls={`faq-a-${i}`}
                onClick={() => setOpen(isOpen ? -1 : i)}
              >
                {item.q}
                <span className="faq-sign" aria-hidden="true" />
              </button>
            </h3>

            <div className="faq-a" id={`faq-a-${i}`} role="region" hidden={false}>
              <div><p>{item.a}</p></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
