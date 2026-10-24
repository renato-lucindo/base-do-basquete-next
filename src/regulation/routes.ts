import { z } from "zod";
import { sessionName } from "../access/cookie";
import { HttpError, jsonResponse, readMutationJson } from "../server/http";
import { saveRegulationSchema } from "./persistence-contract";
import { previewRegulationSchema } from "./view-contract";
const bad = () =>
  new HttpError(400, "invalid_input", "Contexto do regulamento inválido.");
export async function regulationRoute(request: Request, env: Env, url: URL) {
  const name = await sessionName(request, env.SESSION_ENCRYPTION_KEY);
  if (!name)
    throw new HttpError(
      401,
      "invalid_session",
      "Entre para acessar a área administrativa.",
    );
  const match = /^\/api\/regulations\/([^/]+)(\/.*)?$/u.exec(url.pathname),
    id = z
      .uuid()
      .transform((v) => v.toLowerCase())
      .safeParse(match?.[1]);
  if (!match || !id.success) throw bad();
  const tail = match[2] ?? "",
    session = env.SESSIONS.getByName(name);
  if (tail === "" && request.method === "GET") {
    if (
      [...url.searchParams.keys()].some(
        (key) => key !== "offset" || url.searchParams.getAll(key).length !== 1,
      )
    )
      throw bad();
    const raw = url.searchParams.get("offset") ?? "0",
      offset = Number(raw);
    if (!/^\d+$/u.test(raw) || !Number.isSafeInteger(offset) || offset > 100000)
      throw bad();
    const r = await session.getRegulationState(id.data, offset);
    if (!r.ok) throw new HttpError(r.status, r.code, r.message);
    return jsonResponse(r.value);
  }
  if (url.search) throw bad();
  const version = /^\/versions\/([0-9]+)$/u.exec(tail);
  if (version && request.method === "GET") {
    const n = Number(version[1]);
    if (!Number.isSafeInteger(n) || n < 1 || n > 2147483647) throw bad();
    const r = await session.getRegulationVersion(id.data, n);
    if (!r.ok) throw new HttpError(r.status, r.code, r.message);
    return jsonResponse(r.value);
  }
  if (tail === "/preview" && request.method === "POST") {
    const c = await readMutationJson(request, previewRegulationSchema, {
      origin: env.APP_ORIGIN,
      maxBytes: 1048576,
    });
    const r = await session.previewRegulation(id.data, c);
    if (!r.ok) throw new HttpError(r.status, r.code, r.message);
    return jsonResponse(r.value);
  }
  if (tail === "" && request.method === "POST") {
    const c = await readMutationJson(request, saveRegulationSchema, {
      origin: env.APP_ORIGIN,
      maxBytes: 1048576,
    });
    if (c.disputeId !== id.data) throw bad();
    const r = await session.saveRegulation(c);
    if (!r.ok) throw new HttpError(r.status, r.code, r.message);
    return jsonResponse(r.value);
  }
  throw new HttpError(405, "invalid_method", "Método não permitido.");
}
