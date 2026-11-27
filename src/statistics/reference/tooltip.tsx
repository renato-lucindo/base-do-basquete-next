// Fonte: docs/design/prototipos/estatisticas/react-prototype/adapted/tooltip.tsx
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
  type SyntheticEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
type Tip = { anchor: HTMLElement; text: string };
type TipContext = {
  tip: Tip | null;
  show: (
    anchor: HTMLElement,
    text: string,
    explicitActivation?: boolean,
  ) => void;
  hide: () => void;
  leave: () => void;
};
const TooltipContext = createContext<TipContext>(null!);
export function TooltipProvider({ children }: { children: ReactNode }) {
  const [tip, setTip] = useState<Tip | null>(null);
  const [position, setPosition] = useState({ left: 12, top: 12 });
  const tipRef = useRef<HTMLDivElement>(null);
  const current = useRef<Tip | null>(null);
  const dismissed = useRef<HTMLElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  current.current = tip;
  const hide = () => {
    clearTimeout(timer.current);
    current.current = null;
    setTip(null);
  };
  const show = (
    anchor: HTMLElement,
    text: string,
    explicitActivation = false,
  ) => {
    if (dismissed.current === anchor && !explicitActivation) return;
    dismissed.current = null;
    clearTimeout(timer.current);
    const next = { anchor, text };
    current.current = next;
    setTip(next);
  };
  const leave = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (current.current?.anchor !== document.activeElement) hide();
    }, 160);
  };
  useLayoutEffect(() => {
    if (!tip || !tipRef.current) return;
    const r = tip.anchor.getBoundingClientRect(),
      box = tipRef.current.getBoundingClientRect();
    setPosition({
      left: Math.max(
        12,
        Math.min(
          innerWidth - box.width - 12,
          r.left + r.width / 2 - box.width / 2,
        ),
      ),
      top: r.top > box.height + 18 ? r.top - box.height - 8 : r.bottom + 8,
    });
  }, [tip]);
  useEffect(() => {
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        dismissed.current = current.current?.anchor ?? dismissed.current;
        hide();
      } else if (e.key === "Tab") dismissed.current = null;
    };
    const outside = (e: PointerEvent) => {
      if (!current.current?.anchor.contains(e.target as Node)) hide();
    };
    const move = (e: PointerEvent) => {
      const active = current.current;
      if (!active || !tipRef.current) return;
      const inside = (r: DOMRect) =>
        e.clientX >= r.left &&
        e.clientX <= r.right &&
        e.clientY >= r.top &&
        e.clientY <= r.bottom;
      if (
        inside(tipRef.current.getBoundingClientRect()) ||
        inside(active.anchor.getBoundingClientRect())
      )
        clearTimeout(timer.current);
      else if (active.anchor !== document.activeElement) leave();
    };
    document.addEventListener("keydown", escape);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("pointermove", move);
    const scroll = () => {
      const active = current.current;
      if (
        active &&
        active.anchor === document.activeElement &&
        active.anchor !== dismissed.current
      )
        setTip({ ...active });
      else hide();
    };
    document.addEventListener("scroll", scroll, true);
    window.addEventListener("resize", hide);
    return () => {
      clearTimeout(timer.current);
      document.removeEventListener("keydown", escape);
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("pointermove", move);
      document.removeEventListener("scroll", scroll, true);
      window.removeEventListener("resize", hide);
    };
  }, []);
  return (
    <TooltipContext.Provider value={{ tip, show, hide, leave }}>
      {children}
      {createPortal(
        <div
          id="metric-tooltip"
          ref={tipRef}
          className="metric-tooltip"
          role="tooltip"
          hidden={!tip}
          style={position}
        >
          {tip?.text ?? ""}
        </div>,
        document.querySelector(".statistics-public") ?? document.body,
      )}
    </TooltipContext.Provider>
  );
}
export function useNameTooltip(text: string) {
  const { tip, show, hide, leave } = useContext(TooltipContext);
  const ref = useRef<HTMLElement | null>(null);
  const activate = (event: SyntheticEvent<HTMLElement>) =>
    show(event.currentTarget, text);
  return {
    ref: ref as RefObject<HTMLButtonElement>,
    "aria-describedby":
      tip?.anchor === ref.current ? "metric-tooltip" : undefined,
    onPointerEnter: (event: ReactPointerEvent<HTMLElement>) => {
      if (event.pointerType !== "touch") show(event.currentTarget, text, true);
    },
    onPointerLeave: leave,
    onFocus: activate,
    onBlur: hide,
    onClick: (event: SyntheticEvent<HTMLElement>) => {
      // Safari does not consistently focus buttons activated by touch.
      event.currentTarget.focus({ preventScroll: true });
      show(event.currentTarget, text, true);
    },
  };
}
