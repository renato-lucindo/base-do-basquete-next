/** Only browser navigation may move from an explicitly configured alias. */
export function originAliasRedirect(
  request: Request,
  env: { APP_ORIGIN: string; APP_ALIAS?: string },
) {
  const url = new URL(request.url);
  if (
    !env.APP_ALIAS ||
    url.origin !== env.APP_ALIAS ||
    !["GET", "HEAD"].includes(request.method)
  )
    return null;
  const target = new URL(env.APP_ORIGIN);
  target.pathname = url.pathname;
  target.search = url.search;
  return Response.redirect(target.href, 302);
}
