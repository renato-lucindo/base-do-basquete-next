import { createRoot } from "react-dom/client";
import { PublicGamePage } from "./public-page";
import "../public-ui/legacy.css";
import "./public-view.css";
createRoot(document.getElementById("root")!).render(<PublicGamePage />);
