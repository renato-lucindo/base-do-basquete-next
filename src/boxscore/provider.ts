import { z } from "zod";
import { forbidden, providerJson, unavailable } from "../access/provider";
import { invalidSession } from "../access/vault";
import { HttpError } from "../server/http";
import type { Database } from "../server/database.types";
import {
  pdfSourceSnapshotSchema,
  pdfReviewSnapshotSchema,
} from "./source-contract";
type Functions = Database["public"]["Functions"];
export class SupabasePdfSources {
  constructor(
    private readonly config: { url: string; key: string },
    private readonly send: (
      url: string,
      init: RequestInit,
    ) => Promise<Response> = (url, init) => fetch(url, init),
  ) {}
  async source(token: string, id: string) {
    const r = await this.read(
      pdfSourceSnapshotSchema,
      "get_pdf_source",
      { p_id: id },
      token,
    );
    if (r.id !== id) throw unavailable();
    return r;
  }
  async review(token: string, id: string) {
    const r = await this.read(
      pdfReviewSnapshotSchema,
      "get_pdf_review",
      { p_source_id: id },
      token,
    );
    if (r.source.id !== id || !r.source.ready) throw unavailable();
    return r;
  }
  private async read<T, N extends "get_pdf_source" | "get_pdf_review">(
    schema: z.ZodType<T>,
    name: N,
    args: Functions[N]["Args"],
    token: string,
  ): Promise<T> {
    let response: Response;
    try {
      response = await this.send(`${this.config.url}/rest/v1/rpc/${name}`, {
        method: "POST",
        headers: {
          apikey: this.config.key,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(args),
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      throw unavailable();
    }
    if (response.ok) {
      const body = await providerJson(response, 1048576);
      if (body === null)
        throw new HttpError(
          404,
          "context_not_found",
          "Documento não encontrado.",
        );
      const result = schema.safeParse(body);
      if (!result.success) throw unavailable();
      return result.data;
    }
    await response.body?.cancel().catch(() => undefined);
    if (response.status === 401) throw invalidSession();
    if (response.status === 403) throw forbidden();
    if (response.status === 409)
      throw new HttpError(
        409,
        "source_upload_incomplete",
        "O arquivo ainda não foi recebido por completo. Reenvie o mesmo PDF para concluir.",
      );
    throw unavailable();
  }
}
