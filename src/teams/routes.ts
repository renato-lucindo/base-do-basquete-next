import { z } from "zod";
import { sessionName } from "../access/cookie";
import { HttpError, jsonResponse, readMutationJson } from "../server/http";
import { saveTeamSchema, saveRegistrationSchema } from "./contract";

export async function teamsRoute(request: Request, env: Env, url: URL) {
  const name = await sessionName(request, env.SESSION_ENCRYPTION_KEY);
  if (!name)
    throw new HttpError(
      401,
      "invalid_session",
      "Entre para acessar a área administrativa.",
    );
  const session = env.SESSIONS.getByName(name);
  const teams =
    url.pathname === "/api/teams" || url.pathname.startsWith("/api/teams/");
  const prefix = teams ? "/api/teams" : "/api/registrations";
  const root = url.pathname === prefix;
  if (root && request.method === "GET") {
    const allowed = teams ? ["q", "offset"] : ["q", "offset", "disputeId"];
    if (
      [...url.searchParams.keys()].some(
        (k) => !allowed.includes(k) || url.searchParams.getAll(k).length !== 1,
      )
    )
      throw badInput();
    const query = url.searchParams.get("q") ?? "";
    const text = url.searchParams.get("offset") ?? "0";
    const offset = Number(text);
    if (
      query.length > 120 ||
      !/^\d+$/.test(text) ||
      !Number.isSafeInteger(offset) ||
      offset > 100000
    )
      throw badInput();
    const dispute = z.uuid().safeParse(url.searchParams.get("disputeId"));
    if (!teams && !dispute.success) throw badInput();
    const r = teams
      ? await session.listTeams(query, offset)
      : await session.listRegistrations(dispute.data!, query, offset);
    if (!r.ok) throw new HttpError(r.status, r.code, r.message);
    return jsonResponse(r.value);
  }
  if (root && request.method === "POST" && !url.search) {
    const r = teams
      ? await session.saveTeam(
          await readMutationJson(request, saveTeamSchema, {
            origin: env.APP_ORIGIN,
            maxBytes: 8192,
          }),
        )
      : await session.saveRegistration(
          await readMutationJson(request, saveRegistrationSchema, {
            origin: env.APP_ORIGIN,
            maxBytes: 8192,
          }),
        );
    if (!r.ok) throw new HttpError(r.status, r.code, r.message);
    return jsonResponse(r.value);
  }
  if (!root && request.method === "GET" && !url.search) {
    const id = z.uuid().safeParse(url.pathname.slice(prefix.length + 1));
    if (!id.success) throw badInput();
    const r = teams
      ? await session.getTeam(id.data)
      : await session.getRegistration(id.data);
    if (!r.ok) throw new HttpError(r.status, r.code, r.message);
    return jsonResponse(r.value);
  }
  throw new HttpError(405, "invalid_method", "Método não permitido.");
}
function badInput() {
  return new HttpError(
    400,
    "invalid_input",
    "Contexto inválido. Revise os dados.",
  );
}
