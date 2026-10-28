import { z } from "zod";
import { forbidden, providerJson, unavailable } from "../access/provider";
import { invalidSession } from "../access/vault";
import { HttpError } from "../server/http";
import type { Database } from "../server/database.types";
import { saveResultSchema } from "../competition/contract";
import {
  textReviewListingSchema,
  textReviewSnapshotSchema,
  confirmTextResultSchema,
  prepareTextResultSchema,
  type SaveTextReview,
  type ConfirmTextRow,
  type PrepareTextTarget,
} from "./contract";
import {
  matchingResultSchema,
  importCandidateSchema,
  type MatchingRequest,
} from "./matching-contract";
type Functions = Database["public"]["Functions"];
type Send = (url: string, init: RequestInit) => Promise<Response>;
const messages = {
  transfer_required:
    "Este atleta já tem histórico na disputa. Use a operação de transferência ou retorno no elenco para abrir outro vínculo.",
  identity_confirmation_required:
    "Já existe pessoa com este nome. Escolha o cadastro ou confirme outra identidade.",
  version_conflict:
    "Os dados mudaram em outra sessão. Recarregue e revise antes de continuar.",
  idempotency_conflict:
    "Este envio já foi usado com outros dados. Recarregue a conferência.",
  row_already_applied:
    "Esta linha já foi confirmada. Recarregue a conferência.",
  birth_conflict:
    "O ano importado diverge da data completa existente. Revise os dois campos antes de aprovar.",
  invalid_import_context:
    "O vínculo ou o sexo do cadastro é incompatível com o destino escolhido.",
  invalid_import_target:
    "Revise a equipe, a inscrição e os cabeçalhos do texto.",
} as const;
export class SupabaseTextImport {
  constructor(
    private readonly config: { url: string; key: string },
    private readonly send: Send = (url, init) => fetch(url, init),
  ) {}
  async list(token: string, disputeId: string, offset: number) {
    const result = await this.checked(
      textReviewListingSchema,
      "list_text_reviews",
      { p_dispute_id: disputeId, p_offset: offset },
      token,
    );
    if (result.items.some((r) => r.disputeId !== disputeId))
      throw unavailable();
    return result;
  }
  async get(token: string, id: string) {
    const r = await this.checked(
      textReviewSnapshotSchema,
      "get_text_review",
      { p_id: id },
      token,
    );
    if (r.id !== id) throw unavailable();
    return r;
  }
  async save(token: string, command: SaveTextReview) {
    const r = await this.checked(
      saveResultSchema,
      "save_text_review",
      { p_command: command },
      token,
    );
    if (r.id !== command.review.id || r.version !== command.expectedVersion + 1)
      throw unavailable();
    return r;
  }
  async prepare(token: string, command: PrepareTextTarget) {
    const r = await this.checked(
      prepareTextResultSchema,
      "prepare_text_target",
      { p_command: command },
      token,
    );
    if (
      r.id !== command.reviewId ||
      ![command.expectedVersion, command.expectedVersion + 1].includes(
        r.version,
      )
    )
      throw unavailable();
    return r;
  }
  async confirm(token: string, command: ConfirmTextRow) {
    const r = await this.checked(
      confirmTextResultSchema,
      "confirm_text_row",
      { p_command: command },
      token,
    );
    if (
      r.id !== command.reviewId ||
      r.version !== command.expectedVersion + 1 ||
      r.result.rowId !== command.rowId
    )
      throw unavailable();
    return r;
  }
  async person(
    token: string,
    id: string,
    disputeId: string,
    registrationId: string | null,
  ) {
    const r = await this.checked(
      importCandidateSchema,
      "get_import_person",
      {
        p_id: id,
        p_dispute_id: disputeId,
        p_registration_id: registrationId ?? undefined,
      },
      token,
    );
    if (r.id !== id) throw unavailable();
    return r;
  }
  async match(token: string, query: MatchingRequest) {
    const r =
      query.registrationId === null
        ? await this.checked(
            matchingResultSchema,
            "match_import_players_new_target",
            { p_dispute_id: query.disputeId, p_players: query.players },
            token,
          )
        : await this.checked(
            matchingResultSchema,
            "match_import_players",
            {
              p_dispute_id: query.disputeId,
              p_registration_id: query.registrationId,
              p_players: query.players,
            },
            token,
          );
    if (
      r.items.length !== query.players.length ||
      new Set(r.items.map((x) => x.rowId)).size !== r.items.length ||
      r.items.some(
        (x) =>
          !query.players.some((p) => p.rowId === x.rowId) ||
          (x.status === "new") !== (x.candidates.length === 0),
      )
    )
      throw unavailable();
    return r;
  }
  private async checked<T, N extends keyof Functions>(
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
      const body = await providerJson(response);
      if (body === null)
        throw new HttpError(
          404,
          "context_not_found",
          "Conferência ou cadastro não encontrado.",
        );
      const r = schema.safeParse(body);
      if (!r.success) throw unavailable();
      return r.data;
    }
    if ([400, 409].includes(response.status)) {
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
      throw new HttpError(
        response.status,
        response.status === 409 ? "version_conflict" : "invalid_input",
        response.status === 409
          ? messages.version_conflict
          : "Revise os dados desta linha, registro federativo, camisa e vínculo com a equipe.",
      );
    }
    await response.body?.cancel().catch(() => undefined);
    if (response.status === 401) throw invalidSession();
    if (response.status === 403) throw forbidden();
    throw unavailable();
  }
}
