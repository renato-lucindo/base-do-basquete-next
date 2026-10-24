import { z } from "zod";
import { forbidden, providerJson, unavailable } from "../access/provider";
import { invalidSession } from "../access/vault";
import { HttpError } from "../server/http";
import type { Database } from "../server/database.types";
import { saveResultSchema } from "../competition/contract";
import {
  gameListingSchema,
  gameSnapshotSchema,
  type SaveGame,
} from "./contract";
import {
  saveSheetSchema,
  sheetSaveResultSchema,
  sheetSnapshotSchema,
  validatePersistedSheet,
  type SaveSheet,
} from "./sheet-contract";
type Functions = Database["public"]["Functions"];
export class SupabaseGames {
  constructor(
    private readonly config: { url: string; key: string },
    private readonly send: (
      url: string,
      init: RequestInit,
    ) => Promise<Response> = (url, init) => fetch(url, init),
  ) {}
  async list(token: string, disputeId: string, query: string, offset: number) {
    const r = await this.checked(
      gameListingSchema,
      "list_games",
      { p_dispute_id: disputeId, p_query: query, p_offset: offset },
      token,
    );
    if (r.items.some((g) => g.disputeId !== disputeId)) throw unavailable();
    return r;
  }
  async get(token: string, id: string) {
    const r = await this.checked(
      gameSnapshotSchema,
      "get_game",
      { p_id: id },
      token,
    );
    if (r.id !== id) throw unavailable();
    return r;
  }
  async save(token: string, command: SaveGame) {
    const r = await this.checked(
      saveResultSchema,
      "save_game",
      { p_command: command },
      token,
    );
    if (r.id !== command.game.id || r.version !== command.expectedVersion + 1)
      throw unavailable();
    return r;
  }
  async getSheet(token: string, gameId: string) {
    const r = await this.checked(
      sheetSnapshotSchema.nullable(),
      "get_game_sheet",
      { p_game_id: gameId },
      token,
    );
    if (r && r.gameId !== gameId) throw unavailable();
    if (r) {
      try {
        validatePersistedSheet(r.document);
      } catch {
        throw unavailable();
      }
    }
    return r;
  }
  async saveSheet(token: string, input: SaveSheet) {
    const parsed = saveSheetSchema.safeParse(input);
    if (!parsed.success)
      throw new HttpError(400, "invalid_input", "Dados inválidos da súmula.");
    const command = parsed.data;
    try {
      validatePersistedSheet(command.document);
    } catch {
      throw new HttpError(
        400,
        "invalid_input",
        "Revise as camisas, a participação, a comissão e a sequência de ações.",
      );
    }
    const r = await this.checked(
      sheetSaveResultSchema,
      "save_game_sheet",
      { p_command: command },
      token,
    );
    if (
      r.requestId !== command.requestId ||
      r.version !== command.baseVersion + 1
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
      const body = await providerJson(response, 1048576);
      if (body === null && name !== "get_game_sheet")
        throw new HttpError(404, "context_not_found", "Jogo não encontrado.");
      const r = schema.safeParse(body);
      if (!r.success) throw unavailable();
      return r.data;
    }
    if (response.status === 409) {
      const body = await providerJson(response);
      if (
        z
          .object({ message: z.literal("regulation_group_opponents_locked") })
          .safeParse(body).success
      )
        throw new HttpError(
          409,
          "regulation_assignment_conflict",
          "O jogo pertence a um grupo. Revise a atribuição no regulamento antes de trocar os adversários.",
        );
      const replay = z
        .object({ message: z.literal("idempotency_conflict") })
        .safeParse(body).success;
      throw new HttpError(
        409,
        replay ? "idempotency_conflict" : "version_conflict",
        replay
          ? "Este envio já foi usado com outros dados. Recarregue para continuar."
          : "O jogo foi alterado. Recarregue antes de salvar.",
      );
    }
    await response.body?.cancel().catch(() => undefined);
    if (response.status === 401) throw invalidSession();
    if (response.status === 403) throw forbidden();
    if (response.status === 400)
      throw new HttpError(
        400,
        "invalid_input",
        "Revise as duas inscrições da disputa, a data e o horário. Um jogo salvo não pode mudar de disputa.",
      );
    throw unavailable();
  }
}
