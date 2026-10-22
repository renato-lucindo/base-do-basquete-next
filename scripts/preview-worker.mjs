// A proteção de identidade é aplicada pelo Cloudflare Access antes deste handler.
export function createPreviewHandler(bundle) {
  const hostname = "base-do-basquete-prototipo.renato-lucindo-jr.workers.dev";
  return async (request) => {
    const url = new URL(request.url);
    const headers = new Headers({
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
      "x-robots-tag": "noindex, nofollow",
      "referrer-policy": "same-origin",
      "x-prototype-source": bundle.applicationCommit,
      "x-prototype-transport": bundle.sourceCommit,
      "content-security-policy":
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    });
    if (url.hostname !== hostname)
      return new Response(null, { status: 403, headers });
    if (!["GET", "HEAD"].includes(request.method)) {
      headers.set("allow", "GET, HEAD");
      return new Response(null, { status: 405, headers });
    }
    if (url.pathname === "/docs/evidencias") {
      url.pathname += "/";
      headers.set("location", url.href);
      return new Response(null, { status: 308, headers });
    }
    const path =
      url.pathname === "/"
        ? "/index.html"
        : url.pathname === "/docs/evidencias/"
          ? "/docs/evidencias/index.html"
          : url.pathname;
    const entry = Object.hasOwn(bundle.manifest, path)
      ? bundle.manifest[path]
      : null;
    if (!entry) return new Response(null, { status: 404, headers });
    const file = bundle.files[entry.hash];
    headers.set("content-type", file.mime);
    headers.set("content-length", String(entry.size));
    headers.set("etag", `"${entry.hash}"`);
    const bytes =
      request.method === "HEAD"
        ? null
        : Uint8Array.from(atob(file.base64), (character) =>
            character.charCodeAt(0),
          );
    return new Response(bytes, { status: 200, headers });
  };
}
