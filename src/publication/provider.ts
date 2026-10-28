import { z } from "zod";
import { forbidden, providerJson, unavailable } from "../access/provider";
import { invalidSession } from "../access/vault";
import { HttpError } from "../server/http";
import type { Database } from "../server/database.types";
import { publishSheetSchema, type PublishSheet } from "./contract";
import { prepareManualPublication } from "./manual";
import {
  savePreparationSchema,
  preparationSchema,
  preparationAckSchema,
  type SavePreparation,
} from "./preparation-contract";
import {
  publishPdfSchema,
  publicResultSchema,
  type PublishPdf,
} from "./pdf-contract";
import {
  publicationStateSchema,
  publicationVersionSchema,
  publicationSheetResultSchema,
  publicationPdfResultSchema,
} from "./data-contract";
type Functions = Database["public"]["Functions"];
type Rpc =
  | "get_game_publication_state"
  | "get_game_publication_version"
  | "get_public_game"
  | "get_pdf_publication_preparation"
  | "save_pdf_publication_preparation"
  | "publish_sheet_game"
  | "publish_pdf_game";
const messages = {
  idempotency_conflict:
    "Este envio já foi usado com outros dados. Recarregue para continuar.",
  version_conflict:
    "O jogo ou a fonte foi alterado. Recarregue antes de publicar.",
  confirmed_roster_locked:
    "Os relacionados e as camisas da súmula confirmada não podem mudar nesta revisão.",
  publication_source_game_locked:
    "Este PDF já foi publicado para outro jogo e deve manter seu destino.",
  source_upload_incomplete:
    "O envio do original ainda não está completo. Retome o envio antes de publicar.",
  review_reason_required: "Informe o motivo da revisão (10 a 500 caracteres).",
  fallback_decision_required:
    "Escolha explicitamente a fonte manual e informe o motivo do fallback.",
  pdf_domain_unavailable:
    "Esta fonte não fornece um dos domínios selecionados. Confira a escolha de fontes.",
  pdf_divergence_decision_required:
    "Confira a divergência, escolha as fontes e informe o motivo antes de publicar.",
  pdf_participation_mismatch:
    "Reconcilie os participantes das duas fontes antes de combiná-las.",
  pdf_starters_captain_required:
    "Escolha cinco titulares e um capitão por equipe.",
  invalid_pdf_participation:
    "Confira a participação dos atletas e os fatos informados pelo PDF.",
  pdf_period_score_mismatch:
    "Os períodos não correspondem ao placar selecionado.",
  pdf_overtime_without_tie: "Confira o empate anterior à prorrogação.",
  pdf_final_tie: "O resultado final não pode estar empatado.",
} as const;
function badInput() {
  return new HttpError(
    400,
    "invalid_input",
    "Revise as fontes, participantes, comissão e decisões de publicação.",
  );
}
export class SupabasePublications {
  constructor(
    private readonly config: { url: string; key: string },
    private readonly send: (
      url: string,
      init: RequestInit,
    ) => Promise<Response> = (url, init) => fetch(url, init),
  ) {}
  async getPreparation(token: string, sourceId: string) {
    if (!z.uuid().safeParse(sourceId).success) throw badInput();
    const r = await this.rpc(
      preparationSchema.nullable(),
      "get_pdf_publication_preparation",
      { p_source_id: sourceId },
      token,
    );
    if (r && r.sourceId !== sourceId) throw unavailable();
    return r;
  }
  async savePreparation(token: string, input: SavePreparation) {
    const parsed = savePreparationSchema.safeParse(input);
    if (!parsed.success) throw badInput();
    const c = parsed.data;
    const r = await this.rpc(
      preparationAckSchema,
      "save_pdf_publication_preparation",
      { p_command: c },
      token,
    );
    if (
      r.sourceId !== c.publication.source.sourceId ||
      r.requestId !== c.publication.requestId ||
      r.version !== c.expectedVersion + 1
    )
      throw unavailable();
    return r;
  }
  async getState(token: string, gameId: string, offset = 0) {
    if (
      !z.uuid().safeParse(gameId).success ||
      !Number.isSafeInteger(offset) ||
      offset < 0 ||
      offset > 100000
    )
      throw badInput();
    const r = await this.rpc(
      publicationStateSchema,
      "get_game_publication_state",
      { p_game_id: gameId, p_offset: offset },
      token,
    );
    if (r.gameId !== gameId || (r.published && r.published.id !== gameId))
      throw unavailable();
    return r;
  }
  async getVersion(token: string, gameId: string, version: number) {
    if (
      !z.uuid().safeParse(gameId).success ||
      !Number.isSafeInteger(version) ||
      version < 1 ||
      version > 2147483647
    )
      throw badInput();
    const r = await this.rpc(
      publicationVersionSchema,
      "get_game_publication_version",
      { p_game_id: gameId, p_version: version },
      token,
    );
    if (r.gameId !== gameId || r.version !== version) throw unavailable();
    return r;
  }
  async getPublic(gameId: string) {
    if (!z.uuid().safeParse(gameId).success) throw badInput();
    const r = await this.rpc(publicResultSchema.nullable(), "get_public_game", {
      p_id: gameId,
    });
    if (r && r.id !== gameId) throw unavailable();
    return r;
  }
  async publishSheet(token: string, input: PublishSheet) {
    const parsed = publishSheetSchema.safeParse(input);
    if (!parsed.success) throw badInput();
    const c = parsed.data;
    try {
      prepareManualPublication(c);
    } catch {
      throw badInput();
    }
    const r = await this.rpc(
      publicationSheetResultSchema,
      "publish_sheet_game",
      { p_command: c },
      token,
    );
    if (
      r.requestId !== c.requestId ||
      r.gameId !== c.gameId ||
      r.version !== c.basePublicationVersion + 1 ||
      r.gameVersion !== c.gameVersion + 1 ||
      r.sourceVersion !== c.source.baseSheetVersion + 1
    )
      throw unavailable();
    return r;
  }
  async publishPdf(token: string, input: PublishPdf) {
    const parsed = publishPdfSchema.safeParse(input);
    if (!parsed.success) throw badInput();
    const c = parsed.data;
    const r = await this.rpc(
      publicationPdfResultSchema,
      "publish_pdf_game",
      { p_command: c },
      token,
    );
    if (
      r.requestId !== c.requestId ||
      r.gameId !== c.gameId ||
      r.version !== c.basePublicationVersion + 1 ||
      r.gameVersion !== c.gameVersion + 1 ||
      r.sourceVersion !== c.source.sourceVersion ||
      r.reviewVersion !== c.source.reviewVersion
    )
      throw unavailable();
    return r;
  }
  private async rpc<T, N extends Rpc>(
    schema: z.ZodType<T>,
    name: N,
    args: Functions[N]["Args"],
    token?: string,
  ): Promise<T> {
    let response: Response;
    try {
      response = await this.send(this.config.url + "/rest/v1/rpc/" + name, {
        method: "POST",
        headers: {
          apikey: this.config.key,
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(args),
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      throw unavailable();
    }
    if (response.ok) {
      const body = await providerJson(response, 1048576);
      if (
        body === null &&
        name !== "get_public_game" &&
        name !== "get_pdf_publication_preparation"
      )
        throw new HttpError(
          404,
          "context_not_found",
          "Jogo ou versão não encontrado.",
        );
      const r = schema.safeParse(body);
      if (!r.success) throw unavailable();
      return r.data;
    }
    if (response.status === 400 || response.status === 409) {
      const body = z
        .object({ message: z.string() })
        .safeParse(await providerJson(response));
      const code = body.success ? body.data.message : "";
      if (Object.hasOwn(messages, code))
        throw new HttpError(
          response.status,
          code,
          messages[code as keyof typeof messages],
        );
      if (response.status === 400) throw badInput();
      throw new HttpError(409, "version_conflict", messages.version_conflict);
    }
    await response.body?.cancel().catch(() => undefined);
    if (name === "get_public_game") throw unavailable();
    if (response.status === 401) throw invalidSession();
    if (response.status === 403) throw forbidden();
    throw unavailable();
  }
}
