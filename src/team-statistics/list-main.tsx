import "../ui-system/readability.css";
import { createRoot } from "react-dom/client";
import { TeamsListPublicPage } from "./list-page";
import "../access/screen.css";
import "../statistics/screen.css";
import "../statistics/reference.css";
import "./screen.css";
createRoot(document.getElementById("root")!).render(<TeamsListPublicPage />);
