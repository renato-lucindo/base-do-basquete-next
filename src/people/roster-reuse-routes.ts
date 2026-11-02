import { z } from "zod";
import { sessionName } from "../access/cookie";
import { HttpError, jsonResponse, readMutationJson } from "../server/http";
import { applyRosterReuseSchema } from "./roster-reuse-contract";

const invalid = () =>
  new HttpError(
    400,
    "invalid_input",
    "Confira a origem e a inscrição de destino.",
  );
export async function rosterReuseRoute(request: Request, env: Env, url: URL) {
  const name = await sessionName(request, env.SESSION_ENCRYPTION_KEY);
  if (!name)
    throw new HttpError(
      401,
      "invalid_session",
      "Entre para acessar a área administrativa.",
    );
  const session = env.SESSIONS.getByName(name);
  if (request.method === "GET") {
    const isSources = url.pathname === "/api/roster/reuse/sources";
    const isContext = url.pathname === "/api/roster/reuse/context";
    if (!isSources && !isContext) throw invalid();
    const allowed = isSources
      ? ["targetRegistrationId", "offset"]
      : ["sourceRegistrationId", "targetRegistrationId"];
    if (
      [...url.searchParams.keys()].some(
        (k) => !allowed.includes(k) || url.searchParams.getAll(k).length !== 1,
      )
    )
      throw invalid();
    const target = z
      .uuid()
      .safeParse(url.searchParams.get("targetRegistrationId"));
    if (!target.success) throw invalid();
    let result;
    if (isSources) {
      const text = url.searchParams.get("offset") ?? "0";
      if (!/^\d+$/u.test(text)) throw invalid();
      const offset = Number(text);
      if (!Number.isSafeInteger(offset) || offset > 100000) throw invalid();
      result = await session.listRosterReuseSources(target.data, offset);
    } else {
      const source = z
        .uuid()
        .safeParse(url.searchParams.get("sourceRegistrationId"));
      if (!source.success) throw invalid();
      result = await session.getRosterReuseContext(source.data, target.data);
    }
    if (!result.ok)
      throw new HttpError(result.status, result.code, result.message);
    return jsonResponse(result.value);
  }
  if (
    request.method === "POST" &&
    url.pathname === "/api/roster/reuse" &&
    !url.search
  ) {
    const command = await readMutationJson(request, applyRosterReuseSchema, {
      origin: env.APP_ORIGIN,
      maxBytes: 65536,
    });
    const actor = await session.actor();
    if (!actor.ok) throw new HttpError(actor.status, actor.code, actor.message);
    const result = await session.applyRosterReuse(command);
    if (!result.ok)
      throw new HttpError(result.status, result.code, result.message);
    return jsonResponse(result.value);
  }
  throw new HttpError(405, "invalid_method", "Método não permitido.");
}
