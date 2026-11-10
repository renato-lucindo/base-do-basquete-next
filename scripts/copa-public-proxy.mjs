// Pages serves the existing public application through a server-side service binding.
// No backend hostname is embedded in browser code or redirects.
const pages = new Set([
  "/publico.html",
  "/estatisticas.html",
  "/equipes.html",
  "/equipe.html",
  "/atleta.html",
  "/resultado.html",
]);
const publicApi =
  /^\/api\/public\/(?:catalog|search|discovery|standings|games|statistics|teams|players|achievements)(?:\/|$)/u;
const asset = /^\/assets\/[A-Za-z0-9_-]+\.(?:js|css)$/u;
const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const teamQuery = new RegExp(`^/api/public/teams/${uuid}$`, "u");
const responseHeaders = [
  "content-type",
  "content-language",
  "content-security-policy",
  "cache-control",
  "etag",
  "last-modified",
  "vary",
  "x-content-type-options",
  "referrer-policy",
  "x-bdb-source",
];
function headers() {
  return new Headers({
    "cache-control": "no-store",
    "content-type": "text/plain; charset=utf-8",
    "x-robots-tag": "noindex, nofollow",
    "x-content-type-options": "nosniff",
    "referrer-policy": "same-origin",
  });
}
const failure = (status) =>
  new Response("Consulta indisponível.", { status, headers: headers() });

export async function publicPreview(request, env) {
  const incoming = new URL(request.url);
  const path = incoming.pathname;
  const data = publicApi.test(path);
  const allowed =
    data ||
    pages.has(path) ||
    asset.test(path) ||
    ["/favicon.ico", "/favicon.svg", "/robots.txt"].includes(path);
  const read = request.method === "GET" || request.method === "HEAD";
  const query =
    data &&
    request.method === "POST" &&
    teamQuery.test(path) &&
    incoming.searchParams.get("pageSize") === "all";
  if (path === "/" && read) {
    const h = headers();
    h.set(
      "location",
      `/publico.html#${env.PUBLIC_DISPUTE_ID}?secao=classificacao`,
    );
    return new Response(null, { status: 302, headers: h });
  }
  if (!allowed) return failure(404);
  if (!read && !query) return failure(405);
  if (query && request.headers.get("origin") !== incoming.origin)
    return failure(403);
  try {
    const origin = new URL(env.PUBLIC_BACKEND_ORIGIN);
    if (
      origin.protocol !== "https:" ||
      origin.username ||
      origin.password ||
      origin.pathname !== "/" ||
      origin.search ||
      origin.hash
    )
      return failure(503);
    const target = new URL(path + incoming.search, origin);
    const h = new Headers(request.headers);
    for (const name of [
      "cookie",
      "authorization",
      "referer",
      "x-csrf-token",
      "cf-access-jwt-assertion",
      "host",
    ])
      h.delete(name);
    h.delete("origin");
    if (query) h.set("origin", origin.origin);
    const response = await env.SOURCE.fetch(
      new Request(target, {
        method: request.method === "HEAD" ? "GET" : request.method,
        headers: h,
        body: query ? request.body : undefined,
        duplex: "half",
        redirect: "manual",
      }),
    );
    if (response.status >= 300 && response.status < 400) return failure(502);
    const result = headers();
    for (const name of responseHeaders) {
      const value = response.headers.get(name);
      if (value !== null) result.set(name, value);
    }
    if (data) result.set("cache-control", "no-store");
    return new Response(request.method === "HEAD" ? null : response.body, {
      status: response.status,
      headers: result,
    });
  } catch {
    return failure(503);
  }
}

export default { fetch: publicPreview };
