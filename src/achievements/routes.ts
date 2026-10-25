import { z } from "zod";
import { sessionName } from "../access/cookie";
import { HttpError, jsonResponse, readMutationJson } from "../server/http";
import { saveAchievementDraftSchema } from "./draft-contract";
import { confirmAchievementsSchema } from "./publication-contract";
import { previewAchievementsSchema } from "./view-contract";
import { SupabaseAchievements } from "./provider";
const bad = () =>
  new HttpError(400, "invalid_input", "Contexto da premiação inválido.");
function offset(url: URL, key: string) {
  const raw = url.searchParams.get(key) ?? "0",
    n = Number(raw);
  if (!/^\d+$/u.test(raw) || !Number.isSafeInteger(n) || n > 100000)
    throw bad();
  return n;
}
function query(url: URL, allowed: string[]) {
  if (
    [...url.searchParams.keys()].some(
      (k) => !allowed.includes(k) || url.searchParams.getAll(k).length !== 1,
    )
  )
    throw bad();
}
export async function achievementRoute(request: Request, env: Env, url: URL) {
  const name = await sessionName(request, env.SESSION_ENCRYPTION_KEY);
  if (!name)
    throw new HttpError(
      401,
      "invalid_session",
      "Entre para acessar a área administrativa.",
    );
  const match = /^\/api\/achievements\/([^/]+)(\/.*)?$/u.exec(url.pathname),
    id = z
      .uuid()
      .transform((v) => v.toLowerCase())
      .safeParse(match?.[1]);
  if (!match || !id.success) throw bad();
  const tail = match[2] ?? "",
    session = env.SESSIONS.getByName(name);
  if (request.method === "GET") {
    if (tail === "") {
      query(url, ["draftOffset", "publicationOffset"]);
      const r = await session.getAchievementWorkspace(
        id.data,
        offset(url, "draftOffset"),
        offset(url, "publicationOffset"),
      );
      if (!r.ok) throw new HttpError(r.status, r.code, r.message);
      return jsonResponse(r.value);
    }
    if (tail === "/athletes") {
      query(url, ["q", "offset"]);
      const r = await session.getAchievementCandidates(
        id.data,
        url.searchParams.get("q") ?? "",
        offset(url, "offset"),
      );
      if (!r.ok) throw new HttpError(r.status, r.code, r.message);
      return jsonResponse(r.value);
    }
    if (url.search) throw bad();
    const version = /^\/(drafts|confirmations)\/([0-9]+)$/u.exec(tail);
    if (version) {
      const n = Number(version[2]);
      if (!Number.isSafeInteger(n) || n < 1 || n > 2147483647) throw bad();
      const r =
        version[1] === "drafts"
          ? await session.getAchievementDraftVersion(id.data, n)
          : await session.getAchievementPublicationVersion(id.data, n);
      if (!r.ok) throw new HttpError(r.status, r.code, r.message);
      return jsonResponse(r.value);
    }
  }
  if (url.search) throw bad();
  if (
    request.method === "POST" &&
    ["", "/suggestion", "/confirm"].includes(tail)
  ) {
    if (
      request.headers.get("origin") !== env.APP_ORIGIN ||
      request.headers.get("sec-fetch-site") === "cross-site"
    )
      throw new HttpError(403, "invalid_origin", "Origem não permitida.");
    const actor = await session.actor();
    if (!actor.ok) throw new HttpError(actor.status, actor.code, actor.message);
    if (tail === "/suggestion") {
      const c = await readMutationJson(request, previewAchievementsSchema, {
        origin: env.APP_ORIGIN,
        maxBytes: 4096,
      });
      if (c.disputeId !== id.data) throw bad();
      const r = await session.previewAchievements(c);
      if (!r.ok) throw new HttpError(r.status, r.code, r.message);
      return jsonResponse(r.value);
    }
    if (tail === "/confirm") {
      const c = await readMutationJson(request, confirmAchievementsSchema, {
        origin: env.APP_ORIGIN,
        maxBytes: 16384,
      });
      if (c.disputeId !== id.data) throw bad();
      const r = await session.confirmAchievements(c);
      if (!r.ok) throw new HttpError(r.status, r.code, r.message);
      return jsonResponse(r.value);
    }
    const c = await readMutationJson(request, saveAchievementDraftSchema, {
      origin: env.APP_ORIGIN,
      maxBytes: 1048576,
    });
    if (c.draft.disputeId !== id.data) throw bad();
    const r = await session.saveAchievementDraft(c);
    if (!r.ok) throw new HttpError(r.status, r.code, r.message);
    return jsonResponse(r.value);
  }
  throw new HttpError(405, "invalid_method", "Método não permitido.");
}
export async function publicAchievementRoute(
  request: Request,
  env: Env,
  url: URL,
) {
  if (request.method !== "GET")
    throw new HttpError(405, "invalid_method", "Método não permitido.");
  const match = /^\/api\/public\/achievements\/([^/]+)$/u.exec(url.pathname),
    id = z
      .uuid()
      .transform((v) => v.toLowerCase())
      .safeParse(match?.[1]);
  if (!id.success || url.search) throw bad();
  const r = await new SupabaseAchievements({
    url: env.SUPABASE_URL,
    key: env.SUPABASE_PUBLISHABLE_KEY,
  }).getPublic(id.data);
  if (r === null)
    throw new HttpError(
      404,
      "public_not_found",
      "Premiações não confirmadas ou não encontradas.",
    );
  return jsonResponse(r);
}
