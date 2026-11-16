const fs = require("node:fs/promises");
const path = require("node:path");
const esbuild = require("esbuild");

async function main() {
  const result = await esbuild.build({
    absWorkingDir: __dirname,
    entryPoints: ["app.tsx"],
    outfile: "catalogo.js",
    bundle: true,
    write: false,
    format: "iife",
    jsx: "automatic",
    target: ["es2022"],
    minify: true,
    legalComments: "inline",
    define: { "process.env.NODE_ENV": '"production"' },
  });
  const js = result.outputFiles.find((file) => file.path.endsWith(".js")).text;
  const css = result.outputFiles.find((file) =>
    file.path.endsWith(".css"),
  ).text;
  const directory = path.join(__dirname, "../.preview-artifacts/catalogo");
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(
    path.join(directory, "index.html"),
    `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#f6f8fb">
    <meta name="description" content="Catálogo de componentes da Base do Basquete.">
    <title>Design system · Base do Basquete</title>
    <link rel="icon" href="data:,">
    <style>${css.replace(/<\/style/gi, "<\\/style")}</style>
  </head>
  <body>
    <div id="root"></div>
    <script>${js.replace(/<\/script/gi, "<\\/script")}</script>
  </body>
</html>
`,
  );
  console.log(
    "Catálogo gerado em docs/design/.preview-artifacts/catalogo/index.html",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
