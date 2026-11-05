import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

// WebKit on Windows does not expose CSS overscroll-behavior. CI uses macOS.
export default defineConfig({
  ...base,
  grep: /bordas|barra superior|súmula desktop|boxscore conserva/,
  projects: [
    {
      name: "webkit-desktop",
      testMatch: /player-statistics-(boundaries|refinement|desktop)\.spec\.ts/,
      use: { browserName: "webkit", viewport: { width: 1366, height: 768 } },
    },
    {
      name: "webkit-mobile",
      testMatch: /player-statistics-refinement\.spec\.ts/,
      use: {
        browserName: "webkit",
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
