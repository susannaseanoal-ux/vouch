import { useRef } from "react";

/**
 * Wraps a card so a soft light follows the pointer across it.
 *
 * The position is written straight onto the element as CSS custom
 * properties rather than held in React state — this fires on every
 * pointer move, and re-rendering a component that often to move a
 * gradient would be wasteful. Touch devices never fire it, and the
 * effect is simply absent there, which is correct.
 */
export default function Spotlight({ as: Tag = "div", className = "", children, ...rest }) {
  const ref = useRef(null);

  function onPointerMove(e) {
    const el = ref.current;
    if (!el || e.pointerType === "touch") return;

    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  }

  return (
    <Tag
      ref={ref}
      onPointerMove={onPointerMove}
      className={["spot", className].filter(Boolean).join(" ")}
      {...rest}
    >
      {children}
    </Tag>
  );
}
