import { useEffect, useLayoutEffect, useRef } from "react";

/** Restore a public return only after its validated data has rendered. */
export function usePublicPosition(ready: boolean) {
  const restored = useRef("");
  const key = `${location.pathname}${location.hash}`;
  useEffect(() => {
    const save = () => {
      try {
        const key = `${location.pathname}${location.hash}`;
        sessionStorage.setItem(`public-scroll:${key}`, String(window.scrollY));
        sessionStorage.setItem(
          `public-regions:${key}`,
          JSON.stringify(
            [
              ...document.querySelectorAll<HTMLElement>(
                ".statistics-table-wrap, .statistics-scroll, .public-table-scroll, .public-standings-table",
              ),
            ].map((region) => ({
              label: region.getAttribute("aria-label") ?? "",
              left: region.scrollLeft,
              top: region.scrollTop,
            })),
          ),
        );
      } catch {
        /* Public reading also works without storage. */
      }
    };
    window.addEventListener("pagehide", save);
    return () => window.removeEventListener("pagehide", save);
  }, []);
  useLayoutEffect(() => {
    if (!ready || restored.current === key) return;
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        restored.current = key;
        try {
          const value = sessionStorage.getItem(`public-scroll:${key}`);
          if (value !== null && Number.isFinite(Number(value)))
            window.scrollTo(0, Math.max(0, Number(value)));
          const regions: unknown = JSON.parse(
            sessionStorage.getItem(`public-regions:${key}`) ?? "null",
          );
          if (Array.isArray(regions))
            [
              ...document.querySelectorAll<HTMLElement>(
                ".statistics-table-wrap, .statistics-scroll, .public-table-scroll, .public-standings-table",
              ),
            ].forEach((region, index) => {
              const item: unknown = regions[index];
              if (
                !item ||
                typeof item !== "object" ||
                !("label" in item) ||
                item.label !== (region.getAttribute("aria-label") ?? "") ||
                !("left" in item) ||
                !("top" in item) ||
                typeof item.left !== "number" ||
                typeof item.top !== "number" ||
                !Number.isFinite(item.left) ||
                !Number.isFinite(item.top)
              )
                return;
              region.scrollTo(Math.max(0, item.left), Math.max(0, item.top));
            });
        } catch {
          /* Storage restoration is optional. */
        }
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [ready, key]);
}
