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
      const panelSpacing =
        parseFloat(panelStyle.paddingTop) +
        parseFloat(panelStyle.paddingBottom);
      const legendHeight = outerHeight(elements[1]);
      const overviewHeight =
        panels[0].firstElementChild!.getBoundingClientRect().height;
      const naturalHeight =
        Math.max(
          panel.firstElementChild!.getBoundingClientRect().height,
          overviewHeight,
        ) + panelSpacing;
      // Leave room for three lines in a slightly taller tab, even when the
      // panel's padding is smaller than the text.
      const allowance = Math.max(
        panelSpacing,
        3 *
          (parseFloat(panelStyle.lineHeight) ||
            parseFloat(panelStyle.fontSize) * 1.5),
      );
      if (footprint.current === 0)
        footprint.current = naturalHeight + legendHeight + allowance;
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
