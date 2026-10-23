import { z } from "zod";
import { sessionName } from "../access/cookie";
import { HttpError, jsonResponse, readMutationJson } from "../server/http";
import { savePersonSchema } from "./contract";
import { saveRosterSchema } from "./roster-contract";
import { saveStaffSchema } from "./staff-contract";
export async function peopleRoute(request: Request, env: Env, url: URL) {
  const name = await sessionName(request, env.SESSION_ENCRYPTION_KEY);
  if (!name)
    throw new HttpError(
      401,
      "invalid_session",
      "Entre para acessar a área administrativa.",
    );
  const session = env.SESSIONS.getByName(name);
  const resource = url.pathname.split("/")[2];
  const prefix = `/api/${resource}`;
  const root = url.pathname === prefix;
  if (root && request.method === "GET") {
    const allowed =
      resource === "people"
        ? ["q", "kind", "offset"]
        : ["registrationId", "activeOnly", "offset"];
    if (
      [...url.searchParams.keys()].some(
        (k) => !allowed.includes(k) || url.searchParams.getAll(k).length !== 1,
      )
    )
      throw invalid();
    const text = url.searchParams.get("offset") ?? "0",
      offset = Number(text);
    if (!/^\d+$/.test(text) || !Number.isSafeInteger(offset) || offset > 100000)
      throw invalid();
    if (resource === "people") {
      const query = url.searchParams.get("q") ?? "";
      const kind = z
        .enum(["all", "athlete", "coach"])
        .safeParse(url.searchParams.get("kind") ?? "all");
      if (query.length > 120 || !kind.success) throw invalid();
      const r = await session.listPersons(query, kind.data, offset);
      if (!r.ok) throw new HttpError(r.status, r.code, r.message);
      return jsonResponse(r.value);
    }
    const id = z.uuid().safeParse(url.searchParams.get("registrationId"));
    const active = url.searchParams.get("activeOnly") ?? "1";
    if (!id.success || !["0", "1"].includes(active)) throw invalid();
    const r =
      resource === "roster"
        ? await session.listRoster(id.data, active === "1", offset)
        : await session.listStaff(id.data, active === "1", offset);
    if (!r.ok) throw new HttpError(r.status, r.code, r.message);
    return jsonResponse(r.value);
  }
  if (root && request.method === "POST" && !url.search) {
    const r =
      resource === "people"
        ? await session.savePerson(
            await readMutationJson(request, savePersonSchema, {
              origin: env.APP_ORIGIN,
              maxBytes: 16384,
            }),
          )
        : resource === "roster"
          ? await session.saveRoster(
              await readMutationJson(request, saveRosterSchema, {
                origin: env.APP_ORIGIN,
                maxBytes: 4096,
              }),
            )
          : await session.saveStaff(
              await readMutationJson(request, saveStaffSchema, {
                origin: env.APP_ORIGIN,
                maxBytes: 4096,
              }),
            );
    if (!r.ok) throw new HttpError(r.status, r.code, r.message);
    return jsonResponse(r.value);
  }
  if (!root && request.method === "GET" && !url.search) {
    const id = z.uuid().safeParse(url.pathname.slice(prefix.length + 1));
    if (!id.success) throw invalid();
    const r =
      resource === "people"
        ? await session.getPerson(id.data)
        : resource === "roster"
          ? await session.getRoster(id.data)
          : await session.getStaff(id.data);
    if (!r.ok) throw new HttpError(r.status, r.code, r.message);
    return jsonResponse(r.value);
  }
  throw new HttpError(405, "invalid_method", "Método não permitido.");
}
function invalid() {
  return new HttpError(
    400,
    "invalid_input",
    "Contexto inválido. Revise os dados.",
  );
}
