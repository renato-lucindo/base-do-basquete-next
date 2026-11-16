import { useLayoutEffect, useRef } from "react";

/** Keep the largest visited content footprint, bounded by the reading viewport.
 * Measure natural children so the minimum cannot inflate itself. */
export function useProfilePanelSpace(ready: boolean, contentKey: string) {
  const footprint = useRef(0);
  useLayoutEffect(() => {
    if (!ready) {
      footprint.current = 0;
      return;
    }
    const main = document.querySelector<HTMLElement>(".player-page")!;
    const selectors = [
      ".player-tabs-shell",
      ".player-legend",
      ".public-footer",
    ];
    const elements = selectors.map((s) =>
      document.querySelector<HTMLElement>(s)!,
    );
    const panels = [...main.querySelectorAll<HTMLElement>(".player-tab-panel")];
    let frame = 0;
    const outerHeight = (element: HTMLElement) => {
      const style = getComputedStyle(element);
      return (
        element.getBoundingClientRect().height +
        parseFloat(style.marginTop) +
        parseFloat(style.marginBottom)
      );
    };
    const measure = () => {
      const style = getComputedStyle(main);
      const occupied =
        elements.reduce((sum, el) => sum + outerHeight(el), 0) +
        parseFloat(style.paddingTop) +
        parseFloat(style.paddingBottom);
      const panel = panels.find((el) => !el.hidden)!;
      const panelStyle = getComputedStyle(panel);
      const legendHeight = outerHeight(elements[1]);
      const overviewHeight =
        panels[0].firstElementChild!.getBoundingClientRect().height;
      const naturalHeight =
        Math.max(
          panel.firstElementChild!.getBoundingClientRect().height,
          overviewHeight,
        ) +
        parseFloat(panelStyle.paddingTop) +
        parseFloat(panelStyle.paddingBottom);
      // Reuse the panel's vertical spacing as a small initial allowance. This
      // accommodates a compact tab's extra row without reserving a full screen.
      if (footprint.current === 0)
        footprint.current =
          naturalHeight +
          legendHeight +
          parseFloat(panelStyle.paddingTop) +
          parseFloat(panelStyle.paddingBottom);
      footprint.current = Math.max(
        footprint.current,
        naturalHeight + legendHeight,
      );
      const readingRoom = Math.max(0, innerHeight - occupied + legendHeight);
      main.style.setProperty(
        "--player-panel-space",
        `${Math.max(0, Math.min(readingRoom, footprint.current) - legendHeight)}px`,
      );
    };
    const resize = () => {
      footprint.current = 0;
      measure();
    };
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    });
    elements.forEach((el) => observer.observe(el));
    panels.forEach((el) => observer.observe(el));
    window.addEventListener("resize", resize);
    measure();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      main.style.removeProperty("--player-panel-space");
    };
  }, [ready, contentKey]);
}
