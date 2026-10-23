import { z } from "zod";
import { HttpError, jsonResponse, readMutationJson } from "./http";
import {
  cookieHeader,
  clearCookieHeader,
  hashName,
  newSessionCookie,
  sessionName,
} from "../access/cookie";
export { SessionStore } from "../access/durable";

const credentialsSchema = z
  .object({ email: z.email().max(254), password: z.string().min(1).max(256) })
  .strict();
const emptySchema = z.object({}).strict();

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    let response: Response;
    try {
      const url = new URL(request.url);
      if (url.origin !== env.APP_ORIGIN)
        throw new HttpError(421, "invalid_host", "Endereço inválido.");
      if (url.pathname === "/api/health" && request.method === "GET")
        response = jsonResponse({ ok: true });
      else if (url.pathname === "/api/session" && !url.search)
        response = await sessionRoute(request, env);
      else if (!["GET", "HEAD"].includes(request.method))
        throw new HttpError(405, "invalid_method", "Método não permitido.");
      else if (!url.pathname.startsWith("/api/")) {
        if (url.pathname === "/") url.pathname = "/foundation.html";
        response = await env.ASSETS.fetch(new Request(url, request));
      } else
        response = jsonResponse(
          { error: { code: "not_found", message: "Página não encontrada." } },
          404,
        );
    } catch (error) {
      const known =
        error instanceof HttpError
          ? error
          : new HttpError(
              503,
              "access_unavailable",
              "O acesso está indisponível no momento. Tente novamente.",
            );
      response = jsonResponse(
        { error: { code: known.code, message: known.message } },
        known.status,
      );
      if ([401, 403].includes(known.status) && request.method !== "POST")
        response.headers.set("Set-Cookie", clearCookieHeader());
    }
    response = new Response(response.body, response);
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("Referrer-Policy", "no-referrer");
    response.headers.set(
      "Content-Security-Policy",
      "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
    );
    return response;
  },
} satisfies ExportedHandler<Env>;

async function sessionRoute(request: Request, env: Env): Promise<Response> {
  if (request.method === "POST") {
    const credentials = await readMutationJson(request, credentialsSchema, {
      origin: env.APP_ORIGIN,
      maxBytes: 4096,
    });
    const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
    for (const value of [
      `ip:${ip}`,
      `account:${credentials.email.toLowerCase()}`,
    ]) {
      const result = await env.LOGIN_LIMITER.limit({
        key: await hashName(value),
      });
      if (!result.success)
        throw new HttpError(
          429,
          "too_many_attempts",
          "Muitas tentativas. Aguarde um minuto e tente novamente.",
        );
    }
    const cookie = await newSessionCookie(env.SESSION_ENCRYPTION_KEY);
    const result = await env.SESSIONS.getByName(await hashName(cookie)).create(
      credentials,
    );
    if (!result.ok)
      throw new HttpError(result.status, result.code, result.message);
    const previous = await sessionName(request, env.SESSION_ENCRYPTION_KEY);
    if (previous) {
      const closed = await env.SESSIONS.getByName(previous).close();
      if (!closed.ok) {
        await env.SESSIONS.getByName(await hashName(cookie)).close();
        throw new HttpError(closed.status, closed.code, closed.message);
      }
    }
    const response = jsonResponse({ authenticated: true });
    response.headers.set("Set-Cookie", cookieHeader(cookie));
    return response;
  }
  if (request.method === "DELETE") {
    await readMutationJson(request, emptySchema, {
      origin: env.APP_ORIGIN,
      maxBytes: 64,
    });
    const name = await sessionName(request, env.SESSION_ENCRYPTION_KEY);
    if (name) {
      const closed = await env.SESSIONS.getByName(name).close();
      if (!closed.ok)
        throw new HttpError(closed.status, closed.code, closed.message);
      if (!closed.value)
        console.warn(
          JSON.stringify({ event: "upstream_logout_not_confirmed" }),
        );
    }
    return new Response(null, {
      status: 204,
      headers: {
        "Set-Cookie": clearCookieHeader(),
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
  if (request.method === "GET") {
    const name = await sessionName(request, env.SESSION_ENCRYPTION_KEY);
    if (!name)
      throw new HttpError(
        401,
        "invalid_session",
        "Entre para acessar a área administrativa.",
      );
    const result = await env.SESSIONS.getByName(name).actor();
    if (!result.ok)
      throw new HttpError(result.status, result.code, result.message);
    return jsonResponse({ authenticated: true });
  }
  throw new HttpError(405, "invalid_method", "Método não permitido.");
}
