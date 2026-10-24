import { z } from "zod";
import { sessionName } from "../access/cookie";
import { HttpError, jsonResponse, readMutationJson } from "../server/http";
import { publishSheetSchema } from "./contract";
import { publishPdfSchema } from "./pdf-contract";
import { SupabasePublications } from "./provider";
function badInput() {
  return new HttpError(
    400,
    "invalid_input",
    "Contexto de publicação inválido.",
  );
}
export async function publicationRoute(request: Request, env: Env, url: URL) {
  const name = await sessionName(request, env.SESSION_ENCRYPTION_KEY);
  if (!name)
    throw new HttpError(
      401,
      "invalid_session",
      "Entre para acessar a área administrativa.",
    );
  const match = /^\/api\/games\/([^/]+)\/publication(\/.*)?$/u.exec(
    url.pathname,
  );
  const id = z.uuid().safeParse(match?.[1]);
  if (!match || !id.success) throw badInput();
  const tail = match[2] ?? "",
    session = env.SESSIONS.getByName(name);
  if (tail === "" && request.method === "GET") {
    if (
      [...url.searchParams.keys()].some(
        (k) => k !== "offset" || url.searchParams.getAll(k).length !== 1,
      )
    )
      throw badInput();
    const text = url.searchParams.get("offset") ?? "0",
      offset = Number(text);
    if (
      !/^\d+$/u.test(text) ||
      !Number.isSafeInteger(offset) ||
      offset > 100000
    )
      throw badInput();
    const r = await session.getPublicationState(id.data, offset);
    if (!r.ok) throw new HttpError(r.status, r.code, r.message);
    return jsonResponse(r.value);
  }
  if (url.search) throw badInput();
  const version = /^\/versions\/([0-9]+)$/u.exec(tail);
  if (version && request.method === "GET") {
    const n = Number(version[1]);
    if (!Number.isSafeInteger(n) || n < 1 || n > 2147483647) throw badInput();
    const r = await session.getPublicationVersion(id.data, n);
    if (!r.ok) throw new HttpError(r.status, r.code, r.message);
    return jsonResponse(r.value);
  }
  if (tail === "/sheet" && request.method === "POST") {
    const command = await readMutationJson(request, publishSheetSchema, {
      origin: env.APP_ORIGIN,
      maxBytes: 524288,
    });
    if (command.gameId !== id.data) throw badInput();
    const r = await session.publishSheet(command);
    if (!r.ok) throw new HttpError(r.status, r.code, r.message);
    return jsonResponse(r.value);
  }
  if (tail === "/pdf" && request.method === "POST") {
    const command = await readMutationJson(request, publishPdfSchema, {
      origin: env.APP_ORIGIN,
      maxBytes: 65536,
    });
    if (command.gameId !== id.data) throw badInput();
    const r = await session.publishPdf(command);
    if (!r.ok) throw new HttpError(r.status, r.code, r.message);
    return jsonResponse(r.value);
  }
  throw new HttpError(405, "invalid_method", "Método não permitido.");
}
export async function publicGameRoute(request: Request, env: Env, url: URL) {
  if (request.method !== "GET")
    throw new HttpError(405, "invalid_method", "Método não permitido.");
  const match = /^\/api\/public\/games\/([^/]+)$/u.exec(url.pathname),
    id = z.uuid().safeParse(match?.[1]);
  if (!id.success || url.search) throw badInput();
  const provider = new SupabasePublications({
      url: env.SUPABASE_URL,
      key: env.SUPABASE_PUBLISHABLE_KEY,
    }),
    r = await provider.getPublic(id.data);
  if (r === null)
    throw new HttpError(
      404,
      "public_not_found",
      "Resultado não publicado ou não encontrado.",
    );
  return jsonResponse(r);
}
