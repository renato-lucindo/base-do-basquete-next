import { z } from "zod";
import { HttpError, jsonResponse } from "../server/http";
import { SupabaseStatistics } from "./provider";
export async function publicStatisticsRoute(
  request: Request,
  env: Env,
  url: URL,
) {
  if (request.method !== "GET")
    throw new HttpError(405, "invalid_method", "Método não permitido.");
  if (url.search.length > 8192)
    throw new HttpError(
      414,
      "query_too_long",
      "A consulta é muito longa. Reduza os filtros.",
    );
  const match = /^\/api\/public\/statistics\/([^/]+)$/u.exec(url.pathname),
    id = z.uuid().safeParse(match?.[1]);
  if (!id.success)
    throw new HttpError(400, "invalid_input", "Disputa inválida.");
  const page = await new SupabaseStatistics({
    url: env.SUPABASE_URL,
    key: env.SUPABASE_PUBLISHABLE_KEY,
  }).getPage(id.data, url.searchParams);
  if (page === null)
    throw new HttpError(
      404,
      "public_not_found",
      "Ainda não há resultados confirmados nesta disputa.",
    );
  return jsonResponse(page);
}
