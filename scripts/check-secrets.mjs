import { execFileSync } from "node:child_process";
import { readFileSync, statSync, readdirSync } from "node:fs";
import { join } from "node:path";

const files = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  { encoding: "utf8" },
)
  .split("\0")
  .filter(Boolean);
const walk = (path) =>
  readdirSync(path, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(path, e.name)) : [join(path, e.name)],
  );
files.push(...walk("dist"));
const patterns = [
  [
    "private-key",
    new RegExp("-----BEGIN " + "(?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
  ],
  ["github-token", new RegExp("gh" + "[opusr]_[A-Za-z0-9]{30,}")],
  ["github-pat", new RegExp("github_" + "pat_[A-Za-z0-9_]{40,}")],
  ["aws-key", new RegExp("AK" + "IA[0-9A-Z]{16}")],
  [
    "jwt",
    new RegExp(
      "ey" + "J[A-Za-z0-9_-]{20,}\\.[A-Za-z0-9_-]{20,}\\.[A-Za-z0-9_-]{20,}",
    ),
  ],
  ["supabase-secret", new RegExp("sb_" + "secret_[A-Za-z0-9_-]{20,}")],
];
const failures = [];
for (const path of new Set(files)) {
  if (
    !/\.(?:[cm]?[jt]sx?|json|md|html|ya?ml|toml|sql|env|vars)$/.test(path) ||
    statSync(path).size > 3_000_000
  )
    continue;
  const text = readFileSync(path, "utf8");
  for (const [name, pattern] of patterns)
    if (pattern.test(text)) failures.push(`${path}: padrão ${name}`);
}
if (failures.length) {
  process.stderr.write(failures.join("\n") + "\n");
  process.exit(1);
}
process.stdout.write(
  `PASS: ${new Set(files).size} arquivos considerados; nenhum padrão de segredo detectado.\n`,
);
