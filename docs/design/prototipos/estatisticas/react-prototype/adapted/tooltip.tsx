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
} from "react";
import { createPortal } from "react-dom";
type Tip = { anchor: HTMLElement; text: string };
type TipContext = {
  tip: Tip | null;
  show: (anchor: HTMLElement, text: string) => void;
  hide: () => void;
  leave: () => void;
};
const TooltipContext = createContext<TipContext>(null!);
export function TooltipProvider({ children }: { children: ReactNode }) {
  const [tip, setTip] = useState<Tip | null>(null);
  const [position, setPosition] = useState({ left: 12, top: 12 });
  const tipRef = useRef<HTMLDivElement>(null);
  const current = useRef<Tip | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  current.current = tip;
  const hide = () => {
    clearTimeout(timer.current);
    setTip(null);
  };
  const show = (anchor: HTMLElement, text: string) => {
    clearTimeout(timer.current);
    setTip({ anchor, text });
  };
  const leave = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (current.current?.anchor !== document.activeElement) setTip(null);
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
      if (e.key === "Escape") hide();
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
    document.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      clearTimeout(timer.current);
      document.removeEventListener("keydown", escape);
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("pointermove", move);
      document.removeEventListener("scroll", hide, true);
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
        document.body,
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
    ref: ref as RefObject<any>,
    "aria-describedby":
      tip?.anchor === ref.current ? "metric-tooltip" : undefined,
    onPointerEnter: activate,
    onPointerLeave: leave,
    onFocus: activate,
    onBlur: hide,
    onClick: activate,
  };
}
