const fs = require("node:fs");
const path = require("node:path");
const esbuild = require("esbuild");
async function main() {
  const result = await esbuild.build({
    absWorkingDir: __dirname,
    entryPoints: ["app.tsx"],
    bundle: true,
    write: false,
    outfile: "dist/pilot.js",
    format: "iife",
    platform: "browser",
    jsx: "automatic",
    target: ["es2022"],
    minify: true,
    legalComments: "inline",
    define: { "process.env.NODE_ENV": '"production"' },
  });
  const js = result.outputFiles.find((f) => f.path.endsWith(".js")).text;
  const css = result.outputFiles.find((f) => f.path.endsWith(".css")).text;
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#075fca"><meta name="description" content="Piloto navegável da reforma de UI/UX. Todos os dados são fictícios."><title>Piloto UI/UX · Base do Basquete</title><link rel="icon" href="data:,"><style>${css.replace(/<\/style/gi, "<\\/style")}</style></head><body><div id="root"></div><script>${js.replace(/<\/script/gi, "<\\/script")}</script></body></html>`;
  fs.writeFileSync(path.join(__dirname, "Piloto UIUX.html"), html);
  console.log(
    `Piloto UI/UX: ${Buffer.byteLength(html)} bytes, autocontido, sem rede.`,
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
