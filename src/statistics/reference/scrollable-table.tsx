// Fonte: docs/design/prototipos/estatisticas/react-prototype/upstream/scrollable-table.tsx
import { type ReactNode, useEffect, useRef, useState } from "react";

export function ScrollableTable({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  const topRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLElement>(null);
  const syncing = useRef(false);
  const [scrollWidth, setScrollWidth] = useState(0);
  const [edges, setEdges] = useState({ left: false, right: false });

  useEffect(() => {
    const top = topRef.current;
    const viewport = viewportRef.current;
    if (!top || !viewport) return;

    const maximum = (element: HTMLElement) =>
      Math.max(0, element.scrollWidth - element.clientWidth);
    const position = (element: HTMLElement) =>
      Math.min(maximum(element), Math.max(0, element.scrollLeft));
    const update = () => {
      // Match the horizontal travel even when the viewport has a vertical scrollbar.
      setScrollWidth(maximum(viewport) + top.clientWidth);
      const left = position(viewport);
      setEdges({
        left: left > 1,
        right: left < maximum(viewport) - 1,
      });
    };
    const sync = (source: HTMLElement, target: HTMLElement) => {
      if (syncing.current) return;
      const next = Math.min(position(source), maximum(target));
      // Some engines round scrollLeft; don't rewrite an equivalent subpixel position.
      if (Math.abs(target.scrollLeft - next) <= 0.5) {
        update();
        return;
      }
      syncing.current = true;
      target.scrollLeft = next;
      update();
      requestAnimationFrame(() => {
        syncing.current = false;
      });
    };
    const fromTop = () => sync(top, viewport);
    const fromViewport = () => sync(viewport, top);
    const observer = new ResizeObserver(update);

    top.addEventListener("scroll", fromTop, { passive: true });
    viewport.addEventListener("scroll", fromViewport, { passive: true });
    observer.observe(viewport);
    observer.observe(top);
    if (viewport.firstElementChild)
      observer.observe(viewport.firstElementChild);
    update();

    return () => {
      top.removeEventListener("scroll", fromTop);
      viewport.removeEventListener("scroll", fromViewport);
      observer.disconnect();
    };
  }, []);

  return (
    <div
      className="scrollable-table"
      data-shadow-left={edges.left || undefined}
      data-shadow-right={edges.right || undefined}
    >
      <div
        aria-hidden="true"
        className="scrollable-table-top"
        ref={topRef}
        tabIndex={-1}
      >
        <div style={{ width: scrollWidth }} />
      </div>
      {/* biome-ignore lint/a11y/noNoninteractiveTabindex: overflow regions must be keyboard-focusable */}
      <section
        aria-label={label}
        className="statistics-table-wrap"
        ref={viewportRef}
        tabIndex={0}
      >
        {children}
      </section>
    </div>
  );
}
