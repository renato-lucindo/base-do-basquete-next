import { z } from "zod";
import { forbidden, providerJson, unavailable } from "../access/provider";
import { invalidSession } from "../access/vault";
import { HttpError } from "../server/http";
import type { Database } from "../server/database.types";
import { saveResultSchema } from "../competition/contract";
import {
  pdfSourceSnapshotSchema,
  pdfReviewSnapshotSchema,
  pdfSourceListingSchema,
  preparePdfResultSchema,
  preparePdfSourceSchema,
  finishPdfSchema,
  savePdfReviewSchema,
  type PreparePdfSource,
  type SavePdfReview,
} from "./source-contract";
type Functions = Database["public"]["Functions"];
type PdfRpc =
  | "get_pdf_source"
  | "get_pdf_review"
  | "list_pdf_sources"
  | "prepare_pdf_source"
  | "finish_pdf_source"
  | "save_pdf_review";
const conflicts = {
  source_upload_incomplete:
    "O arquivo ainda não foi recebido por completo. Reenvie o mesmo PDF para concluir.",
  version_conflict:
    "A revisão mudou em outra sessão. Recarregue antes de salvar.",
  idempotency_conflict:
    "Este envio já foi usado com outros dados. Retome a conferência para continuar.",
} as const;
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
  async list(token: string, disputeId: string, offset: number) {
    if (
      !z.uuid().safeParse(disputeId).success ||
      !Number.isSafeInteger(offset) ||
      offset < 0 ||
      offset > 100000
    )
      throw badInput();
    // SQL scopes by the CURRENT review context; source.disputeId preserves origin.
    return this.read(
      pdfSourceListingSchema,
      "list_pdf_sources",
      { p_dispute_id: disputeId, p_offset: offset },
      token,
    );
  }
  async prepare(token: string, input: PreparePdfSource) {
    const parsed = preparePdfSourceSchema.safeParse(input);
    if (!parsed.success) throw badInput();
    const command = parsed.data;
    const r = await this.read(
      preparePdfResultSchema,
      "prepare_pdf_source",
      { p_command: command },
      token,
    );
    if (
      r.sha256 !== command.source.sha256 ||
      r.byteSize !== command.source.byteSize ||
      r.storagePath !== `sources/${r.id}.pdf` ||
      (!r.duplicate && r.id !== command.source.id)
    )
      throw unavailable();
    return r;
  }
  async finish(token: string, input: z.infer<typeof finishPdfSchema>) {
    const parsed = finishPdfSchema.safeParse(input);
    if (!parsed.success) throw badInput();
    const command = parsed.data,
      r = await this.read(
        saveResultSchema,
        "finish_pdf_source",
        { p_command: command },
        token,
      );
    if (r.id !== command.sourceId || r.version !== 2) throw unavailable();
    return r;
  }
  async saveReview(token: string, input: SavePdfReview) {
    const parsed = savePdfReviewSchema.safeParse(input);
    if (!parsed.success) throw badInput();
    const command = parsed.data,
      r = await this.read(
        saveResultSchema,
        "save_pdf_review",
        { p_command: command },
        token,
      );
    if (r.id !== command.sourceId || r.version !== command.expectedVersion + 1)
      throw unavailable();
    return r;
  }
  private async read<T, N extends PdfRpc>(
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
    if (response.status === 400 || response.status === 409) {
      const body = z
        .object({ message: z.string() })
        .safeParse(await providerJson(response));
      const code = body.success ? body.data.message : "";
      if (response.status === 409 && Object.hasOwn(conflicts, code))
        throw new HttpError(
          409,
          code,
          conflicts[code as keyof typeof conflicts],
        );
      if (response.status === 400) throw badInput();
      throw new HttpError(409, "version_conflict", conflicts.version_conflict);
    }
    await response.body?.cancel().catch(() => undefined);
    if (response.status === 401) throw invalidSession();
    if (response.status === 403) throw forbidden();
    throw unavailable();
  }
}
function badInput() {
  return new HttpError(
    400,
    "invalid_input",
    "Revise o documento, o destino e os vínculos da conferência.",
  );
}
