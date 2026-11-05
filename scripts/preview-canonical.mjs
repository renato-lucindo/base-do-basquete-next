export function previewCanonicalRedirect(request, canonicalOrigin) {
  const url = new URL(request.url);
  if (
    canonicalOrigin !== "https://basedobasquete.com.br" ||
    url.origin !==
      "https://base-do-basquete-next-preview.renato-lucindo-jr.workers.dev" ||
    !["GET", "HEAD"].includes(request.method) ||
    url.pathname === "/api" ||
    url.pathname.startsWith("/api/")
  )
    return null;
  return new Response(null, {
    status: 302,
    headers: {
      Location: canonicalOrigin + url.pathname + url.search,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
