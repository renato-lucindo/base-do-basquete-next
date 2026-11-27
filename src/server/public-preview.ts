import { originAliasRedirect } from "./origin-alias";

export async function publicPreviewResponse(
  request: Request,
  env: {
    APP_ORIGIN: string;
    BDB_SOURCE?: string;
    ADMIN_ORIGIN?: string;
    APP_ALIAS?: string;
  },
  readPublic: (request: Request) => Promise<Response>,
) {
  const url = new URL(request.url);
  const alias = originAliasRedirect(request, env);
  let response: Response;
  if (alias) response = alias;
  else if (url.origin !== env.APP_ORIGIN)
    response = new Response(null, { status: 421 });
  else if (!["GET", "HEAD"].includes(request.method))
    response = new Response(null, {
      status: 405,
      headers: { Allow: "GET, HEAD" },
    });
  else if (
    env.ADMIN_ORIGIN &&
    (url.pathname === "/foundation.html" ||
      url.pathname === "/admin" ||
      url.pathname.startsWith("/admin/"))
  )
    response = Response.redirect(`${env.ADMIN_ORIGIN}/admin${url.search}`, 302);
  else if (
    (url.pathname.startsWith("/api/") &&
      !url.pathname.startsWith("/api/public/") &&
      url.pathname !== "/api/health") ||
    url.pathname.startsWith("/admin") ||
    url.pathname === "/foundation.html" ||
    url.searchParams.has("previa") ||
    request.headers.has("X-Dispute-Preview")
  )
    response = new Response(null, { status: 403 });
  else if (url.pathname === "/")
    response = Response.redirect(`${env.APP_ORIGIN}/publico.html`, 302);
  else response = await readPublic(request);
  const headers = new Headers(response.headers);
  if (env.BDB_SOURCE) headers.set("X-Preview-Source", env.BDB_SOURCE);
  headers.set("X-Robots-Tag", "noindex, nofollow");
  headers.set("Cache-Control", "private, no-store");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
