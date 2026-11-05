import { previewCanonicalRedirect } from "./preview-canonical.mjs";

// Scoped repair of an already-published compatibility bundle. Never rebuilds
// assets or replaces the application's compiled handler with a newer release.
export function patchPublishedPreview(source, expectedCommit) {
  const entry = "var index_default = { async fetch(request, env, ctx) {";
  const dispatch =
    "  const response = await worker_default.fetch(request, { ...env, ASSETS: { fetch: assets } }, ctx);";
  if (
    !/^[a-f0-9]{40}$/.test(expectedCommit) ||
    !source.includes(
      `response.headers.set("X-Bdb-Source", "${expectedCommit}")`,
    ) ||
    source.split(entry).length !== 2 ||
    source.split(dispatch).length !== 2 ||
    source.includes("function previewCanonicalRedirect(")
  )
    throw new Error("Unexpected published bundle; no repair produced");
  return source
    .replace(entry, `${previewCanonicalRedirect.toString()}\n${entry}`)
    .replace(
      dispatch,
      "  const redirect = previewCanonicalRedirect(request, env.APP_ORIGIN);\n  if (redirect) return redirect;\n" +
        dispatch,
    );
}
