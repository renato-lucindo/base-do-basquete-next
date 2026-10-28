import { createRoot } from "react-dom/client";
import { TeamsPublicPage } from "./public-page";
import "../access/screen.css";
import "../statistics/screen.css";
import "./screen.css";
createRoot(document.getElementById("root")!).render(
  <TeamsPublicPage kind="list" />,
);
