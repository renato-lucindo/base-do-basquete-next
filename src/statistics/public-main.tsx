import { useEffect, useState } from "react";
import { SimpleStatisticsPageView } from "./simple-page";
import { createRoot } from "react-dom/client";
import { StatisticsPageView } from "./public-page";
import "../public-ui/legacy.css";
import "./legacy.css";
import "./reference.css";
function StatisticsPresentation() {
  const read = () =>
    new URLSearchParams(window.location.hash.split("?")[1] ?? "").get(
      "view",
    ) === "simple";
  const [simple, setSimple] = useState(read);
  useEffect(() => {
    const update = () => setSimple(read());
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  return simple ? <SimpleStatisticsPageView /> : <StatisticsPageView />;
}
createRoot(document.getElementById("root")!).render(<StatisticsPresentation />);
