import { z } from "zod";
import { sessionName } from "../access/cookie";
import { HttpError, jsonResponse, readMutationJson } from "../server/http";
import { saveTransferSchema } from "./transfer-contract";
const bad = () =>
  new HttpError(
    400,
    "invalid_input",
    "Confira o vínculo e a inscrição de destino.",
  );
export async function transferRoute(request: Request, env: Env, url: URL) {
  const name = await sessionName(request, env.SESSION_ENCRYPTION_KEY);
  if (!name)
    throw new HttpError(
      401,
      "invalid_session",
      "Entre para acessar a área administrativa.",
    );
  const match = /^\/api\/roster\/([^/]+)\/transfer(\/preview)?$/u.exec(
      url.pathname,
    ),
    source = z
      .uuid()
      .transform((v) => v.toLowerCase())
      .safeParse(match?.[1]);
  if (!match || !source.success) throw bad();
  const session = env.SESSIONS.getByName(name);
  if (request.method === "GET" && !match[2]) {
    if (
      [...url.searchParams.keys()].some(
        (k) => k !== "destinationRegistrationId",
      ) ||
      url.searchParams.getAll("destinationRegistrationId").length !== 1
    )
      throw bad();
    const destination = z
      .uuid()
      .transform((v) => v.toLowerCase())
      .safeParse(url.searchParams.get("destinationRegistrationId"));
    if (!destination.success) throw bad();
    const r = await session.getTransferContext(source.data, destination.data);
    if (!r.ok) throw new HttpError(r.status, r.code, r.message);
    return jsonResponse(r.value);
  }
  if (url.search) throw bad();
  if (request.method === "POST") {
    if (
      request.headers.get("origin") !== env.APP_ORIGIN ||
      request.headers.get("sec-fetch-site") === "cross-site"
    )
      throw new HttpError(403, "invalid_origin", "Origem não permitida.");
    const actor = await session.actor();
    if (!actor.ok) throw new HttpError(actor.status, actor.code, actor.message);
    const command = await readMutationJson(request, saveTransferSchema, {
      origin: env.APP_ORIGIN,
      maxBytes: 16384,
    });
    if (command.sourceEntryId !== source.data) throw bad();
    const r = match[2]
      ? await session.previewTransfer(command)
      : await session.saveTransfer(command);
    if (!r.ok) throw new HttpError(r.status, r.code, r.message);
    return jsonResponse(r.value);
  }
  throw new HttpError(405, "invalid_method", "Método não permitido.");
}
