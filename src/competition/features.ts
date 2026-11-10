/** Supplied by the Worker serving this document; isolated Vite fixtures remain legacy by default. */
export function flexibleCompetitionEnabled() {
  return (
    typeof document !== "undefined" &&
    document
      .querySelector('meta[name="bb-flexible-competition"]')
      ?.getAttribute("content") === "true"
  );
}
