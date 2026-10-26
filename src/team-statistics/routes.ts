import { z } from "zod";
import { HttpError, jsonResponse } from "../server/http";
import { SupabaseTeamStatistics } from "./provider";
const bad = () =>
  new HttpError(
    400,
    "invalid_input",
    "Confira a disputa, a equipe, a inscrição e os filtros.",
  );
export async function publicTeamsRoute(
  request: Request,
  env: Env,
  url: URL,
): Promise<Response> {
  if (request.method !== "GET")
    throw new HttpError(405, "invalid_method", "Método não permitido.");
  if (url.search.length > 8192)
    throw new HttpError(414, "query_too_long", "A consulta é muito longa.");
  const match = /^\/api\/public\/teams\/([^/]+)(?:\/([^/]+))?$/u.exec(
      url.pathname,
    ),
    id = z.uuid().safeParse(match?.[1]);
  if (
    !match ||
    !id.success ||
    (match[2] && !z.uuid().safeParse(match[2]).success)
  )
    throw bad();
  const allowed = match[2]
    ? ["registrationId", "mode", "scope", "section", "page", "rosterPage"]
    : ["mode", "scope", "q", "sort", "direction", "page"];
  if (
    [...url.searchParams.keys()].some(
      (k) => !allowed.includes(k) || url.searchParams.getAll(k).length !== 1,
    )
  )
    throw bad();
  const registrationId = url.searchParams.get("registrationId");
  if (registrationId !== null && !z.uuid().safeParse(registrationId).success)
    throw bad();
  const db = new SupabaseTeamStatistics({
    url: env.SUPABASE_URL,
    key: env.SUPABASE_PUBLISHABLE_KEY,
  });
  const page = match[2]
    ? await db.getDetail(id.data, match[2], registrationId, url.searchParams)
    : await db.getPage(id.data, url.searchParams);
  if (page === null)
    throw new HttpError(
      404,
      "public_not_found",
      "Ainda não há resultados publicados para esta equipe ou disputa.",
    );
  return jsonResponse(page);
}
