import { z } from "zod";
import { HttpError } from "../server/http";
export const PDF_UPLOAD_LIMIT = 10485760;
const metadata = z
  .object({
    commandId: z.uuid(),
    sourceId: z.uuid(),
    disputeId: z.uuid(),
    filename: z
      .string()
      .min(5)
      .max(160)
      .regex(/^[^\\/\u0000-\u001f\u007f]+\.pdf$/iu),
  })
  .strict();
export function pdfUploadMetadata(request: Request, origin: string) {
  if (request.method !== "POST")
    throw new HttpError(405, "invalid_method", "Método não permitido.");
  const url = new URL(request.url);
  if (
    url.origin !== origin ||
    request.headers.get("origin") !== origin ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    throw new HttpError(403, "invalid_origin", "Origem não permitida.");
  if (
    request.headers
      .get("content-type")
      ?.split(";", 1)[0]
      .trim()
      .toLowerCase() !== "application/pdf"
  )
    throw new HttpError(415, "invalid_media_type", "Envie um arquivo PDF.");
  if (
    [...url.searchParams.keys()].some(
      (k) => url.searchParams.getAll(k).length !== 1,
    )
  )
    throw badPdfInput();
  const parsed = metadata.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) throw badPdfInput();
  const length = request.headers.get("content-length");
  if (length !== null) {
    if (!/^\d+$/u.test(length)) throw badPdfInput();
    if (Number(length) > PDF_UPLOAD_LIMIT) throw tooLarge();
  }
  return parsed.data;
}
/** Called only inside the DO's fresh authorized operation, never in the HTTP Worker. */
export async function readPdfBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw badPdfInput();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > PDF_UPLOAD_LIMIT) throw tooLarge();
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw badPdfInput();
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
  if (size < 5) throw badPdfInput();
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}
export function badPdfInput() {
  return new HttpError(
    400,
    "invalid_input",
    "Revise o arquivo PDF e o destino da importação.",
  );
}
function tooLarge() {
  return new HttpError(413, "body_too_large", "O PDF pode ter até 10 MiB.");
}
