import { z } from "zod";
import { sessionName } from "../access/cookie";
import { HttpError, jsonResponse, readMutationJson } from "../server/http";
import {
  saveTextReviewSchema,
  prepareTextTargetSchema,
  confirmTextRowSchema,
} from "./contract";
import { matchingRequestSchema } from "./matching-contract";
function invalid() {
  return new HttpError(
    400,
    "invalid_input",
    "Revise o contexto e os dados da conferência.",
  );
}
function query(url: URL, allowed: string[]) {
  if (
    [...url.searchParams.keys()].some(
      (k) => !allowed.includes(k) || url.searchParams.getAll(k).length !== 1,
    )
  )
    throw invalid();
}
function uuid(value: string | null) {
  const r = z.uuid().safeParse(value);
  if (!r.success) throw invalid();
  return r.data;
}
function result(
  r:
    | { ok: true; value: unknown }
    | { ok: false; status: number; code: string; message: string },
) {
  if (!r.ok) throw new HttpError(r.status, r.code, r.message);
  return jsonResponse(r.value);
}
export async function textImportRoute(request: Request, env: Env, url: URL) {
  const name = await sessionName(request, env.SESSION_ENCRYPTION_KEY);
  if (!name)
    throw new HttpError(
      401,
      "invalid_session",
      "Entre para acessar a área administrativa.",
    );
  const session = env.SESSIONS.getByName(name),
    root = url.pathname === "/api/text-import",
    tail = url.pathname.slice("/api/text-import/".length);
  if (root && request.method === "GET") {
    query(url, ["disputeId", "offset"]);
    const disputeId = uuid(url.searchParams.get("disputeId")),
      text = url.searchParams.get("offset") ?? "0",
      offset = Number(text);
    if (
      !/^\d+$/u.test(text) ||
      !Number.isSafeInteger(offset) ||
      offset > 100000
    )
      throw invalid();
    return result(await session.listTextReviews(disputeId, offset));
  }
  if (request.method === "GET" && tail.startsWith("people/")) {
    query(url, ["disputeId", "registrationId"]);
    const id = uuid(tail.slice("people/".length)),
      disputeId = uuid(url.searchParams.get("disputeId")),
      registrationId = url.searchParams.has("registrationId")
        ? uuid(url.searchParams.get("registrationId"))
        : null;
    return result(await session.getImportPerson(id, disputeId, registrationId));
  }
  if (!root && request.method === "GET" && !url.search)
    return result(await session.getTextReview(uuid(tail)));
  if (request.method === "POST" && !url.search) {
    if (root)
      return result(
        await session.saveTextReview(
          await readMutationJson(request, saveTextReviewSchema, {
            origin: env.APP_ORIGIN,
            maxBytes: 262144,
          }),
        ),
      );
    if (tail === "match")
      return result(
        await session.matchImportPlayers(
          await readMutationJson(request, matchingRequestSchema, {
            origin: env.APP_ORIGIN,
            maxBytes: 65536,
          }),
        ),
      );
    if (tail === "prepare")
      return result(
        await session.prepareTextTarget(
          await readMutationJson(request, prepareTextTargetSchema, {
            origin: env.APP_ORIGIN,
            maxBytes: 4096,
          }),
        ),
      );
    if (tail === "confirm")
      return result(
        await session.confirmTextRow(
          await readMutationJson(request, confirmTextRowSchema, {
            origin: env.APP_ORIGIN,
            maxBytes: 4096,
          }),
        ),
      );
  }
  throw new HttpError(405, "invalid_method", "Método não permitido.");
}
