const fs = require("node:fs/promises");
const path = require("node:path");
const esbuild = require("esbuild");

async function main() {
  const { outputFiles } = await esbuild.build({
    absWorkingDir: __dirname,
    entryPoints: ["app.tsx"],
    outfile: "perfil-equipe.js",
    bundle: true,
    write: false,
    format: "iife",
    jsx: "automatic",
    target: ["es2022"],
    minify: true,
    legalComments: "inline",
    define: { "process.env.NODE_ENV": '"production"' },
  });
  const css = outputFiles.find((file) => file.path.endsWith(".css")).text;
  const js = outputFiles.find((file) => file.path.endsWith(".js")).text;
  const directory = path.join(
    __dirname,
    "../../.preview-artifacts/perfil-equipe",
  );
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(
    path.join(directory, "index.html"),
    `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#f6f8fb">
  <title>Perfil da equipe · Base do Basquete</title>
  <link rel="icon" href="data:,">
  <style>${css.replace(/<\/style/gi, "<\\/style")}</style>
</head>
<body><div id="root"></div><script>${js.replace(/<\/script/gi, "<\\/script")}</script></body>
</html>
`,
  );
  console.log(
    "Protótipo do perfil da equipe gerado em docs/design/.preview-artifacts/perfil-equipe/index.html",
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
