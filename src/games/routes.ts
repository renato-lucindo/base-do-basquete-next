import { z } from "zod";
import { sessionName } from "../access/cookie";
import { HttpError, jsonResponse, readMutationJson } from "../server/http";
import { saveGameSchema } from "./contract";
import { saveSheetSchema } from "./sheet-contract";
export async function gamesRoute(request: Request, env: Env, url: URL) {
  const name = await sessionName(request, env.SESSION_ENCRYPTION_KEY);
  if (!name)
    throw new HttpError(
      401,
      "invalid_session",
      "Entre para acessar a área administrativa.",
    );
  const session = env.SESSIONS.getByName(name),
    root = url.pathname === "/api/games";
  const sheet = /^\/api\/games\/([^/]+)\/sheet$/u.exec(url.pathname);
  if (sheet && !url.search) {
    const id = z.uuid().safeParse(sheet[1]);
    if (!id.success) throw badInput();
    if (request.method === "GET") {
      const r = await session.getGameSheet(id.data);
      if (!r.ok) throw new HttpError(r.status, r.code, r.message);
      return jsonResponse(r.value);
    }
    if (request.method === "POST") {
      const command = await readMutationJson(request, saveSheetSchema, {
        origin: env.APP_ORIGIN,
        maxBytes: 524288,
      });
      if (command.gameId !== id.data) throw badInput();
      const r = await session.saveGameSheet(command);
      if (!r.ok) throw new HttpError(r.status, r.code, r.message);
      return jsonResponse(r.value);
    }
  }
  if (root && request.method === "GET") {
    if (
      [...url.searchParams.keys()].some(
        (k) =>
          !["q", "offset", "disputeId"].includes(k) ||
          url.searchParams.getAll(k).length !== 1,
      )
    )
      throw badInput();
    const dispute = z.uuid().safeParse(url.searchParams.get("disputeId")),
      query = url.searchParams.get("q") ?? "",
      text = url.searchParams.get("offset") ?? "0",
      offset = Number(text);
    if (
      !dispute.success ||
      query.length > 120 ||
      !/^\d+$/u.test(text) ||
      !Number.isSafeInteger(offset) ||
      offset > 100000
    )
      throw badInput();
    const r = await session.listGames(dispute.data, query, offset);
    if (!r.ok) throw new HttpError(r.status, r.code, r.message);
    return jsonResponse(r.value);
  }
  if (root && request.method === "POST" && !url.search) {
    const r = await session.saveGame(
      await readMutationJson(request, saveGameSchema, {
        origin: env.APP_ORIGIN,
        maxBytes: 8192,
      }),
    );
    if (!r.ok) throw new HttpError(r.status, r.code, r.message);
    return jsonResponse(r.value);
  }
  if (!root && !sheet && request.method === "GET" && !url.search) {
    const id = z.uuid().safeParse(url.pathname.slice("/api/games/".length));
    if (!id.success) throw badInput();
    const r = await session.getGame(id.data);
    if (!r.ok) throw new HttpError(r.status, r.code, r.message);
    return jsonResponse(r.value);
  }
  throw new HttpError(405, "invalid_method", "Método não permitido.");
}
function badInput() {
  return new HttpError(
    400,
    "invalid_input",
    "Contexto inválido. Revise os dados do jogo.",
  );
}
