import { z } from "zod";
import { HttpError, jsonResponse, readMutationJson } from "../server/http";
import { sessionName } from "../access/cookie";
import { confirmPlayerProfileSchema } from "./contract";
import { SupabasePlayerProfiles } from "./provider";
const bad = () =>
  new HttpError(
    400,
    "invalid_input",
    "Confira a identidade e a consulta do perfil.",
  );
export async function publicPlayerProfileRoute(
  request: Request,
  env: Env,
  url: URL,
) {
  if (request.method !== "GET")
    throw new HttpError(405, "invalid_method", "Método não permitido.");
  if (url.search.length > 8192)
    throw new HttpError(414, "query_too_long", "A consulta é muito longa.");
  const m = /^\/api\/public\/players\/([^/]+)$/u.exec(url.pathname),
    id = z.uuid().safeParse(m?.[1]);
  if (!id.success) throw bad();
  const page = await new SupabasePlayerProfiles({
    url: env.SUPABASE_URL,
    key: env.SUPABASE_PUBLISHABLE_KEY,
  }).getPage(id.data, url.searchParams);
  if (page === null)
    throw new HttpError(
      404,
      "public_not_found",
      "Ainda não há dados publicados deste atleta.",
    );
  return jsonResponse(page);
}
export async function privatePlayerProfileRoute(
  request: Request,
  env: Env,
  url: URL,
) {
  const name = await sessionName(request, env.SESSION_ENCRYPTION_KEY);
  if (!name)
    throw new HttpError(
      401,
      "invalid_session",
      "Entre para acessar a área administrativa.",
    );
  const match =
      /^\/api\/people\/([^/]+)\/profile(?:\/versions\/([1-9][0-9]*))?$/u.exec(
        url.pathname,
      ),
    id = z
      .uuid()
      .transform((v) => v.toLowerCase())
      .safeParse(match?.[1]);
  if (!match || !id.success) throw bad();
  const session = env.SESSIONS.getByName(name);
  if (request.method === "GET") {
    const offset = Number(url.searchParams.get("offset") ?? 0);
    if (
      (match[2] && url.search) ||
      [...url.searchParams.keys()].some((k) => k !== "offset") ||
      url.searchParams.getAll("offset").length > 1 ||
      !Number.isSafeInteger(offset) ||
      offset < 0 ||
      offset > 100000
    )
      throw bad();
    const version = Number(match[2]);
    if (match[2] && (!Number.isSafeInteger(version) || version > 2147483647))
      throw bad();
    const r = match[2]
      ? await session.getPlayerProfileVersion(id.data, version)
      : await session.getPlayerProfileWorkspace(id.data, offset);
    if (!r.ok) throw new HttpError(r.status, r.code, r.message);
    return jsonResponse(r.value);
  }
  if (request.method === "POST" && !match[2] && !url.search) {
    if (
      request.headers.get("origin") !== env.APP_ORIGIN ||
      request.headers.get("sec-fetch-site") === "cross-site"
    )
      throw new HttpError(403, "invalid_origin", "Origem não permitida.");
    const actor = await session.actor();
    if (!actor.ok) throw new HttpError(actor.status, actor.code, actor.message);
    const command = await readMutationJson(
      request,
      confirmPlayerProfileSchema,
      { origin: env.APP_ORIGIN, maxBytes: 16384 },
    );
    if (command.personId !== id.data) throw bad();
    const r = await session.confirmPlayerProfile(command);
    if (!r.ok) throw new HttpError(r.status, r.code, r.message);
    return jsonResponse(r.value);
  }
  throw new HttpError(405, "invalid_method", "Método não permitido.");
}
