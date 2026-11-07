import { z } from "zod";
import { sessionName } from "../access/cookie";
import { HttpError, jsonResponse, readMutationJson } from "../server/http";
import { saveCompetitionSetupSchema } from "./setup-contract";
export async function competitionSetupRoute(
  request: Request,
  env: Env,
  url: URL,
) {
  if (env.FLEXIBLE_COMPETITION !== "true")
    throw new HttpError(404, "not_found", "Página não encontrada.");
  const name = await sessionName(request, env.SESSION_ENCRYPTION_KEY);
  if (!name)
    throw new HttpError(
      401,
      "invalid_session",
      "Entre para acessar a área administrativa.",
    );
  const match = /^\/api\/competition-setups\/([^/]+)$/u.exec(url.pathname),
    id = z.uuid().safeParse(match?.[1]);
  if (!id.success || url.search)
    throw new HttpError(400, "invalid_input", "Disputa inválida.");
  const session = env.SESSIONS.getByName(name);
  if (request.method === "GET") {
    const r = await session.getCompetitionSetup(id.data.toLowerCase());
    if (!r.ok) throw new HttpError(r.status, r.code, r.message);
    return jsonResponse(r.value);
  }
  if (request.method === "POST") {
    const c = await readMutationJson(request, saveCompetitionSetupSchema, {
      origin: env.APP_ORIGIN,
      maxBytes: 1048576,
    });
    if (c.disputeId !== id.data.toLowerCase())
      throw new HttpError(400, "invalid_input", "Disputa inválida.");
    const r = await session.saveCompetitionSetup(c);
    if (!r.ok) throw new HttpError(r.status, r.code, r.message);
    return jsonResponse(r.value);
  }
  throw new HttpError(405, "invalid_method", "Método não permitido.");
}
