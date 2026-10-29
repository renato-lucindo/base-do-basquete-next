const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const read = (name) => fs.readFileSync(path.join(__dirname, name), "utf8");
let html = read("index.html").replace(
  /<link rel="stylesheet" href="styles.css"\s*\/?>/,
  () => `<style>${read("styles.css")}</style>`,
);
html = html.replace(
  '<script src="data.js" defer></script>',
  () => `<script>${read("data.js")}</script>`,
);
html = html.replace(/^\s*<script src="app.js" defer><\/script>\s*$/m, "");
const script = `<script>${read("app.js")}</script>`;
// Fixtures may load in <head>, but rendering must run after the document exists.
html = html.replace("</body>", () => `${script}</body>`);
const output = path.join(__dirname, "Sumula do jogo publicado.html");
fs.writeFileSync(output, html);
const sha = (value) => crypto.createHash("sha256").update(value).digest("hex");
fs.writeFileSync(
  path.join(__dirname, "build.json"),
  JSON.stringify(
    {
      output: path.basename(output),
      sha256: sha(html),
      sources: Object.fromEntries(
        ["index.html", "styles.css", "data.js", "app.js"].map((name) => [
          name,
          sha(read(name)),
        ]),
      ),
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `HTML autocontido gerado: ${output} (${Buffer.byteLength(html)} bytes)`,
);
