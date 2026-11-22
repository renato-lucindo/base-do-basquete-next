const { execFileSync } = require("node:child_process");
const path = require("node:path");
for (const file of [
  "../../historico/documentacao/design/sumula/build.cjs",
  "../../historico/documentacao/design/estatisticas/react-prototype/build.cjs",
  "../../historico/documentacao/design/reforma-uiux/build.cjs",
  "catalogo/build.cjs",
]) {
  execFileSync(process.execPath, [path.join(__dirname, file)], {
    stdio: "inherit",
  });
}
