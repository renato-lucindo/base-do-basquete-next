import type { z } from "zod";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

type MutationOptions = { origin: string; maxBytes: number };

/** Read a bounded JSON mutation. Origin comes from server configuration. */
export async function readMutationJson<T>(
  request: Request,
  schema: z.ZodType<T>,
  { origin, maxBytes }: MutationOptions,
): Promise<T> {
  if (
    !Number.isSafeInteger(maxBytes) ||
    maxBytes <= 0 ||
    new URL(origin).origin !== origin
  ) {
    throw new TypeError("Invalid HTTP boundary configuration");
  }
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
    throw new HttpError(405, "invalid_method", "Método não permitido.");
  }
  if (
    request.headers.get("origin") !== origin ||
    new URL(request.url).origin !== origin ||
    request.headers.get("sec-fetch-site") === "cross-site"
  ) {
    throw new HttpError(403, "invalid_origin", "Origem não permitida.");
  }
  const mediaType = request.headers
    .get("content-type")
    ?.split(";", 1)[0]
    .trim()
    .toLowerCase();
  if (mediaType !== "application/json") {
    throw new HttpError(415, "invalid_media_type", "Envie dados em JSON.");
  }
  const length = request.headers.get("content-length");
  if (length !== null && !/^\d+$/.test(length)) {
    throw invalidInput();
  }
  if (length !== null && Number(length) > maxBytes) throw tooLarge();
  const reader = request.body?.getReader();
  if (!reader) throw invalidInput();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw tooLarge();
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw invalidInput();
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    );
  } catch {
    throw invalidInput();
  }
  const result = schema.safeParse(parsed);
  if (!result.success) throw invalidInput();
  return result.data;
}

function invalidInput() {
  return new HttpError(
    400,
    "invalid_input",
    "Dados inválidos. Revise o envio.",
  );
}

function tooLarge() {
  return new HttpError(
    413,
    "body_too_large",
    "Envio acima do tamanho permitido.",
  );
}

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
