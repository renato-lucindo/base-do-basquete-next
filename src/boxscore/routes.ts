import { z } from "zod";
import { sessionName } from "../access/cookie";
import { HttpError, jsonResponse, readMutationJson } from "../server/http";
import { savePdfReviewSchema } from "./source-contract";
import { badPdfInput, pdfUploadMetadata } from "./upload";
export async function pdfSourcesRoute(request: Request, env: Env, url: URL) {
  const name = await sessionName(request, env.SESSION_ENCRYPTION_KEY);
  if (!name)
    throw new HttpError(
      401,
      "invalid_session",
      "Entre para acessar a área administrativa.",
    );
  const session = env.SESSIONS.getByName(name),
    root = url.pathname === "/api/pdf-sources";
  if (root && request.method === "POST") {
    pdfUploadMetadata(request, env.APP_ORIGIN);
    const r = await session.uploadPdf(request);
    if (!r.ok) throw new HttpError(r.status, r.code, r.message);
    return jsonResponse(r.value);
  }
  if (root && request.method === "GET") {
    if (
      [...url.searchParams.keys()].some(
        (k) =>
          !["disputeId", "offset"].includes(k) ||
          url.searchParams.getAll(k).length !== 1,
      )
    )
      throw badPdfInput();
    const id = z.uuid().safeParse(url.searchParams.get("disputeId")),
      text = url.searchParams.get("offset") ?? "0",
      offset = Number(text);
    if (
      !id.success ||
      !/^\d+$/u.test(text) ||
      !Number.isSafeInteger(offset) ||
      offset > 100000
    )
      throw badPdfInput();
    const r = await session.listPdfSources(id.data, offset);
    if (!r.ok) throw new HttpError(r.status, r.code, r.message);
    return jsonResponse(r.value);
  }
  const preparation = /^\/api\/pdf-sources\/([^/]+)\/preparation$/u.exec(
    url.pathname,
  );
  if (preparation && !url.search && request.method === "GET") {
    const id = z.uuid().safeParse(preparation[1]);
    if (!id.success) throw badPdfInput();
    const r = await session.getPdfPreparation(id.data);
    if (!r.ok) throw new HttpError(r.status, r.code, r.message);
    return jsonResponse(r.value);
  }
  const match = /^\/api\/pdf-sources\/([^/]+)(\/review)?$/u.exec(url.pathname);
  if (match && !url.search) {
    const id = z.uuid().safeParse(match[1]);
    if (!id.success) throw badPdfInput();
    if (request.method === "GET") {
      const r = match[2]
        ? await session.getPdfReview(id.data)
        : await session.getPdfSource(id.data);
      if (!r.ok) throw new HttpError(r.status, r.code, r.message);
      return jsonResponse(r.value);
    }
    if (match[2] && request.method === "POST") {
      const command = await readMutationJson(request, savePdfReviewSchema, {
        origin: env.APP_ORIGIN,
        maxBytes: 16384,
      });
      if (command.sourceId !== id.data) throw badPdfInput();
      const r = await session.savePdfReview(command);
      if (!r.ok) throw new HttpError(r.status, r.code, r.message);
      return jsonResponse(r.value);
    }
  }
  throw new HttpError(405, "invalid_method", "Método não permitido.");
}
