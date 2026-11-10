import {
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
/** Top-layer description shared by the game's abbreviations and foul cells. */
export function GameHint({
  text,
  children,
  onClick,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  text: string;
  children: ReactNode;
}) {
  const id = useId(),
    tip = useRef<HTMLSpanElement>(null),
    anchor = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const hide = () => {
    clearTimeout(timer.current);
    if (tip.current?.matches(":popover-open")) tip.current.hidePopover();
  };
  const leave = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (
        document.activeElement !== anchor.current &&
        !tip.current?.matches(":hover")
      )
        hide();
    }, 160);
  };
  const show = () => {
    clearTimeout(timer.current);
    const t = tip.current,
      a = anchor.current;
    if (!t || !a) return;
    if (!t.matches(":popover-open")) t.showPopover();
    const r = a.getBoundingClientRect(),
      b = t.getBoundingClientRect();
    t.style.left = `${Math.max(8, Math.min(innerWidth - b.width - 8, r.left + r.width / 2 - b.width / 2))}px`;
    t.style.top = `${r.top > b.height + 12 ? r.top - b.height - 8 : Math.min(innerHeight - b.height - 8, r.bottom + 8)}px`;
  };
  return (
    <>
      <button
        {...props}
        type="button"
        ref={anchor}
        aria-describedby={id}
        onPointerEnter={(e) => {
          if (e.pointerType !== "touch") show();
        }}
        onPointerLeave={leave}
        onFocus={show}
        onBlur={hide}
        onKeyDown={(e) => {
          if (e.key === "Escape" && tip.current?.matches(":popover-open")) {
            hide();
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        onClick={(e) => {
          if (onClick) {
            hide();
            onClick(e);
          } else show();
        }}
      >
        {children}
      </button>
      <span
        id={id}
        ref={tip}
        role="tooltip"
        popover="auto"
        className="game-tooltip"
        onPointerEnter={() => clearTimeout(timer.current)}
        onPointerLeave={leave}
      >
        {text}
      </span>
    </>
  );
}
