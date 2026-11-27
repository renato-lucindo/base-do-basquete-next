import { useLayoutEffect, useRef, type ReactNode } from "react";
import "./query-controls.css";

/** Controls follow the visible table, including tables narrower than their page. */
export function QueryTableLayout({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    let frame = 0;
    const resize = new ResizeObserver(schedule);
    function measure() {
      if (!root) return;
      const table = [...root.querySelectorAll("table")].find(
        (el) => el.getClientRects().length > 0,
      );
      if (!table) return;
      resize.observe(table);
      const rect = table.getBoundingClientRect(),
        area = root.getBoundingClientRect();
      const offset = Math.max(0, rect.left - area.left);
      const width = Math.min(rect.width, root.clientWidth);
      root.dataset.queryAlignment = offset > 4 ? "center" : "left";
      root.style.setProperty("--bb-query-width", `${width}px`);
      root.dataset.queryMeasured = "true";
    }
    function schedule() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    }
    const mutations = new MutationObserver(schedule);
    mutations.observe(root, { childList: true, subtree: true });
    resize.observe(root);
    measure();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      mutations.disconnect();
    };
  }, []);
  return (
    <div ref={ref} className={`bb-query-layout ${className}`}>
      {children}
    </div>
  );
}
