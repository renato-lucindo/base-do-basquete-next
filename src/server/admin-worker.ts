import worker from "./worker";
import { originAliasRedirect } from "./origin-alias";
export { SessionStore } from "../access/durable";

export default {
  async fetch(
    request: Request,
    env: Env & { BDB_SOURCE?: string; APP_ALIAS?: string },
  ) {
    const alias = originAliasRedirect(request, env);
    if (alias) return alias;
    const url = new URL(request.url);
    if (
      url.origin === env.APP_ORIGIN &&
      url.pathname === "/" &&
      (request.method === "GET" || request.method === "HEAD")
    ) {
      url.pathname = "/admin";
      request = new Request(url, request);
    }
    const upstream = await worker.fetch(request, env);
    const response = new Response(upstream.body, upstream);
    if (env.BDB_SOURCE) response.headers.set("X-Bdb-Source", env.BDB_SOURCE);
    return response;
  },
};
