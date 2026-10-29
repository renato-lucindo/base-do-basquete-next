const { execFileSync } = require("node:child_process");
const path = require("node:path");
for (const file of [
  "prototipos/sumula/build.cjs",
  "prototipos/estatisticas/react-prototype/build.cjs",
]) {
  execFileSync(process.execPath, [path.join(__dirname, file)], {
    stdio: "inherit",
  });
}
