import { createRoot } from "react-dom/client";
import { PlayerPublicPage } from "./public-page";
import "../access/screen.css";
import "../statistics/screen.css";
import "./public.css";
createRoot(document.getElementById("root")!).render(<PlayerPublicPage />);
