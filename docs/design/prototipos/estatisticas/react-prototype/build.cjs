const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const esbuild = require("esbuild");
const root = __dirname;
const dependencies = path.dirname(
  path.dirname(require.resolve("react/package.json")),
);
const hash = (text) => crypto.createHash("sha256").update(text).digest("hex");
async function main() {
  const result = await esbuild.build({
    absWorkingDir: root,
    entryPoints: ["app.tsx"],
    bundle: true,
    write: false,
    outfile: path.join(root, "dist/app.js"),
    platform: "browser",
    format: "iife",
    jsx: "automatic",
    minify: true,
    keepNames: true,
    metafile: true,
    nodePaths: [dependencies],
    define: { "process.env.NODE_ENV": '"production"' },
    legalComments: "inline",
    target: ["es2022"],
  });
  const js = result.outputFiles.find((f) => f.path.endsWith(".js")).text;
  const css = result.outputFiles.find((f) => f.path.endsWith(".css")).text;
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#075fca"><meta name="description" content="Protótipo de estatísticas de atletas com dados fictícios."><title>Estatísticas de atletas · Base do Basquete</title><link rel="icon" href="data:,"><style>${css.replace(/<\/style/gi, "<\\/style")}</style></head><body><div id="root"></div><script>${js.replace(/<\/script/gi, "<\\/script")}</script></body></html>`;
  fs.mkdirSync(path.join(root, "dist"), { recursive: true });
  fs.writeFileSync(path.join(root, "preview.html"), html);
  fs.writeFileSync(path.join(root, "../Estatisticas de atletas.html"), html);
  fs.writeFileSync(path.join(root, "dist/app.js"), js);
  fs.writeFileSync(path.join(root, "dist/app.css"), css);
  fs.writeFileSync(
    path.join(root, "dist/metafile.json"),
    JSON.stringify(result.metafile, null, 2),
  );
  const provenance = JSON.parse(
    fs.readFileSync(path.join(root, "provenance.json"), "utf8"),
  );
  provenance.runtimeComponents = [
    "upstream/scrollable-table.tsx",
    "upstream/resource-state.tsx",
    "adapted/scoresheet-statistics-table.tsx",
    "adapted/table-controls.ts",
    "adapted/metric-cell.tsx",
    "adapted/tooltip.tsx",
    "adapted/team-filter.tsx",
    "adapted/column-picker.tsx",
  ];
  provenance.runtimeComponents.forEach((file) => {
    if (!result.metafile.inputs[file])
      throw new Error(`Component not in bundle: ${file}`);
  });
  for (const file of provenance.sources) {
    if (hash(fs.readFileSync(path.join(root, file.local))) !== file.sha256)
      throw new Error(`Original source changed: ${file.local}`);
  }
  provenance.adapted = provenance.runtimeComponents.map((file) => ({
    file,
    sha256: hash(fs.readFileSync(path.join(root, file))),
    kind: file.startsWith("upstream/")
      ? "original-unchanged"
      : file.includes("scoresheet-statistics-table") ||
          file.includes("team-filter") ||
          file.includes("column-picker")
        ? "extracted-and-adapted"
        : file.includes("table-controls")
          ? "original-functions-extracted"
          : "integration",
  }));
  provenance.build = {
    htmlSha256: hash(html),
    htmlBytes: Buffer.byteLength(html),
    reactVersion: require(path.join(dependencies, "react/package.json"))
      .version,
    reactDomVersion: require(path.join(dependencies, "react-dom/package.json"))
      .version,
    esbuildVersion: esbuild.version,
  };
  fs.writeFileSync(
    path.join(root, "provenance.json"),
    JSON.stringify(provenance, null, 2) + "\n",
  );
  console.log(
    JSON.stringify(
      {
        built: "react-prototype/preview.html",
        ...provenance.build,
        verifiedOriginals: provenance.sources.length,
        runtimeComponents: provenance.runtimeComponents,
      },
      null,
      2,
    ),
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
