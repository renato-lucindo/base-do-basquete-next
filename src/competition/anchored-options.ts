import {
  useLayoutEffect,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";

// Keep a bounded menu at its input without moving the document or clipping it
// inside a form/dialog. No external overlay runtime is required.
export function useAnchoredOptions(
  anchor: RefObject<HTMLInputElement | null>,
  menu: RefObject<HTMLDivElement | null>,
  open: boolean,
) {
  const [style, setStyle] = useState<CSSProperties>({ visibility: "hidden" });
  useLayoutEffect(() => {
    if (!open) return;
    const input = anchor.current,
      options = menu.current;
    if (!input || !options) return;
    const update = () => {
      const rect = input.getBoundingClientRect();
      const below = window.innerHeight - rect.bottom - 12,
        above = rect.top - 12;
      const upwards =
        below < Math.min(options.scrollHeight, 120) && above > below;
      const next: CSSProperties = {
        position: "fixed",
        left: Math.max(8, rect.left),
        width: Math.min(rect.width, window.innerWidth - 16),
        maxHeight: Math.max(40, Math.min(340, upwards ? above : below)),
        top: upwards ? "auto" : rect.bottom + 4,
        bottom: upwards ? window.innerHeight - rect.top + 4 : "auto",
        right: "auto",
        visibility: "visible",
      };
      setStyle((previous) =>
        JSON.stringify(previous) === JSON.stringify(next) ? previous : next,
      );
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(input);
    observer.observe(options);
    window.addEventListener("resize", update);
    document.addEventListener("scroll", update, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
      document.removeEventListener("scroll", update, true);
    };
  }, [anchor, menu, open]);
  return style;
}
