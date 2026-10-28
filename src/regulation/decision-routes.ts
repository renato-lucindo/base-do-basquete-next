import { z } from "zod";
import { sessionName } from "../access/cookie";
import { HttpError, jsonResponse, readMutationJson } from "../server/http";
import { saveGameOccurrenceSchema } from "./occurrence-contract";
import { saveRegistrationWithdrawalSchema } from "./withdrawal-contract";
const bad = () =>
  new HttpError(400, "invalid_input", "Contexto da decisão inválido.");
export async function decisionRoute(request: Request, env: Env, url: URL) {
  const name = await sessionName(request, env.SESSION_ENCRYPTION_KEY);
  if (!name)
    throw new HttpError(
      401,
      "invalid_session",
      "Entre para acessar a área administrativa.",
    );
  const match =
      /^\/api\/(games|registrations)\/([^/]+)\/(occurrence|withdrawal)(\/.*)?$/u.exec(
        url.pathname,
      ),
    id = z
      .uuid()
      .transform((v) => v.toLowerCase())
      .safeParse(match?.[2]);
  if (
    !match ||
    !id.success ||
    (match[1] === "games") !== (match[3] === "occurrence")
  )
    throw bad();
  const occurrence = match[3] === "occurrence",
    tail = match[4] ?? "",
    session = env.SESSIONS.getByName(name);
  if (tail === "" && request.method === "GET") {
    if (
      [...url.searchParams.keys()].some(
        (k) => k !== "offset" || url.searchParams.getAll(k).length !== 1,
      )
    )
      throw bad();
    const raw = url.searchParams.get("offset") ?? "0",
      offset = Number(raw);
    if (!/^\d+$/u.test(raw) || !Number.isSafeInteger(offset) || offset > 100000)
      throw bad();
    const r = occurrence
      ? await session.getGameOccurrence(id.data, offset)
      : await session.getRegistrationWithdrawal(id.data, offset);
    if (!r.ok) throw new HttpError(r.status, r.code, r.message);
    return jsonResponse(r.value);
  }
  if (url.search) throw bad();
  const version = /^\/versions\/([0-9]+)$/u.exec(tail);
  if (version && request.method === "GET") {
    const n = Number(version[1]);
    if (!Number.isSafeInteger(n) || n < 1 || n > 2147483647) throw bad();
    const r = occurrence
      ? await session.getGameOccurrenceVersion(id.data, n)
      : await session.getRegistrationWithdrawalVersion(id.data, n);
    if (!r.ok) throw new HttpError(r.status, r.code, r.message);
    return jsonResponse(r.value);
  }
  if (request.method === "POST" && (tail === "" || tail === "/preview")) {
    if (
      request.headers.get("origin") !== env.APP_ORIGIN ||
      request.headers.get("sec-fetch-site") === "cross-site"
    )
      throw new HttpError(403, "invalid_origin", "Origem não permitida.");
    // Fresh authorization before reading the bounded JSON body; the operation rechecks
    // authorization inside the DO to cover revocation while the body is in transit.
    const actor = await session.actor();
    if (!actor.ok) throw new HttpError(actor.status, actor.code, actor.message);
    if (occurrence) {
      const c = await readMutationJson(request, saveGameOccurrenceSchema, {
        origin: env.APP_ORIGIN,
        maxBytes: 65536,
      });
      if (c.gameId !== id.data) throw bad();
      const r = tail
        ? await session.previewGameOccurrence(c)
        : await session.saveGameOccurrence(c);
      if (!r.ok) throw new HttpError(r.status, r.code, r.message);
      return jsonResponse(r.value);
    }
    const c = await readMutationJson(
      request,
      saveRegistrationWithdrawalSchema,
      { origin: env.APP_ORIGIN, maxBytes: 1048576 },
    );
    if (c.registrationId !== id.data) throw bad();
    const r = tail
      ? await session.previewRegistrationWithdrawal(c)
      : await session.saveRegistrationWithdrawal(c);
    if (!r.ok) throw new HttpError(r.status, r.code, r.message);
    return jsonResponse(r.value);
  }
  throw new HttpError(405, "invalid_method", "Método não permitido.");
}
