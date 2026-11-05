import { z } from "zod";
import { HttpError, jsonResponse, readMutationJson } from "../server/http";
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
  if (
    request.method !== "GET" &&
    !(
      request.method === "POST" &&
      url.searchParams.get("pageSize") === "all" &&
      /^\/api\/public\/teams\/[^/]+$/u.test(url.pathname)
    )
  )
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
  let params = url.searchParams;
  if (request.method === "POST") {
    const body = await readMutationJson(
      request,
      z.object({ query: z.string().max(65536) }).strict(),
      { origin: url.origin, maxBytes: 80000 },
    );
    params = new URLSearchParams(body.query);
    if (params.get("pageSize") !== "all") throw bad();
  }
  const updated = !match[2] && params.get("pageSize") === "all";
  const allowed = match[2]
    ? ["registrationId", "mode", "scope", "section", "page", "rosterPage"]
    : [
        "mode",
        "scope",
        "q",
        "sort",
        "direction",
        "page",
        "dataset",
        "preset",
        "columns",
        ...(updated ? ["pageSize", "selection", "registrationId"] : []),
      ];
  if (
    [...params.keys()].some(
      (k) =>
        !allowed.includes(k) ||
        (params.getAll(k).length !== 1 && !(updated && k === "registrationId")),
    )
  )
    throw bad();
  if (
    updated &&
    (params.getAll("registrationId").length > 1000 ||
      params
        .getAll("registrationId")
        .some((id) => !z.uuid().safeParse(id).success) ||
      (params.has("selection") &&
        !["all", "none", "custom"].includes(params.get("selection")!)))
  )
    throw bad();
  const registrationId = params.get("registrationId");
  if (registrationId !== null && !z.uuid().safeParse(registrationId).success)
    throw bad();
  const db = new SupabaseTeamStatistics({
    url: env.SUPABASE_URL,
    key: env.SUPABASE_PUBLISHABLE_KEY,
  });
  const page = match[2]
    ? await db.getDetail(id.data, match[2], registrationId, params)
    : await db.getPage(id.data, params);
  if (page === null)
    throw new HttpError(
      404,
      "public_not_found",
      "Ainda não há resultados publicados para esta equipe ou disputa.",
    );
  return jsonResponse(page);
}
