const { execFileSync } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");
const assert = require("node:assert/strict");
assert.equal(
  crypto
    .createHash("sha256")
    .update(
      fs.readFileSync(
        path.join(
          __dirname,
          "../../historico/documentacao/design/referencias/pagina-estatisticas-react-r6.zip",
        ),
      ),
    )
    .digest("hex"),
  "3ad8e05c9244dda6b879363a26b11f9e743e9356208573a8ad20440439709878",
);
for (const file of [
  "build.cjs",
  "../../historico/documentacao/design/estatisticas/react-prototype/typecheck.cjs",
  "../../historico/documentacao/design/estatisticas/react-prototype/features.test.cjs",
  "../../historico/documentacao/design/sumula/verify.cjs",
  "../../historico/documentacao/design/sumula/verify-periods.cjs",
  "../../historico/documentacao/design/estatisticas/react-prototype/verify.cjs",
  "verify-hierarchy.cjs",
  "../../historico/documentacao/design/reforma-uiux/verify.cjs",
  "catalogo/verify.cjs",
]) {
  execFileSync(process.execPath, [path.join(__dirname, file)], {
    stdio: "inherit",
  });
}
