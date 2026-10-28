import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { buildRemovalServiceProof } from "../tests/fixtures/removal-service-proof.ts";

const source = readFileSync("supabase/tests/registration_removal.sql", "utf8");
const proof = buildRemovalServiceProof(source);
const path = ".preview-artifacts/removal-service-proof.sql";
writeFileSync(path, proof);
console.log(
  JSON.stringify({
    path,
    bytes: Buffer.byteLength(proof),
    sha256: createHash("sha256").update(proof).digest("hex"),
  }),
);
