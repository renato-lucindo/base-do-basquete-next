import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const forbidden = [
  "SupabaseAccess",
  "admin_access",
  "SESSION_ENCRYPTION_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
  ".supabase.co",
  "access_token",
  "refresh_token",
];
function visit(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) visit(path);
    else if (/\.(js|html)$/.test(path)) {
      const content = readFileSync(path, "utf8");
      if (forbidden.some((text) => content.includes(text)))
        throw new Error(`Server boundary leaked into ${path}`);
    }
  }
}
visit("dist");
visit("dist-foundation");
process.stdout.write(
  "PASS: client artifacts contain no Auth/database/server bindings.\n",
);
