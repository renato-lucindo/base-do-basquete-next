import { z } from "zod";
import { forbidden, providerJson, unavailable } from "../access/provider";
import { invalidSession } from "../access/vault";
import { saveResultSchema } from "../competition/contract";
import { HttpError } from "../server/http";
import type { Database } from "../server/database.types";
import {
  gameEditorSnapshotSchema,
  officialListingSchema,
  saveGameEditorSchema,
  type SaveGameEditor,
} from "./officiating-contract";

type Functions = Pick<
  Database["public"]["Functions"],
  "list_game_officials" | "save_game_editor" | "get_game_editor"
>;
type Rpc = keyof Functions;
export class SupabaseOfficiating {
  async get(token: string, id: string) {
    if (!z.uuid().safeParse(id).success)
      throw new HttpError(400, "invalid_input", "Jogo inválido.");
    const result = await this.call(
      gameEditorSnapshotSchema,
      "get_game_editor",
      { p_id: id },
      token,
    );
    if (result.game.id.toLowerCase() !== id.toLowerCase()) throw unavailable();
    return result;
  }
  constructor(
    private readonly config: { url: string; key: string },
    private readonly send: (
      url: string,
      init: RequestInit,
    ) => Promise<Response> = (url, init) => fetch(url, init),
  ) {}
  list(token: string, query: string, offset: number) {
    if (
      [...query].length > 160 ||
      /[\u0000-\u001f\u007f]/u.test(query) ||
      !Number.isSafeInteger(offset) ||
      offset < 0 ||
      offset > 100000
    )
      throw new HttpError(400, "invalid_input", "Revise a busca de oficiais.");
    return this.call(
      officialListingSchema,
      "list_game_officials",
      { p_query: query, p_offset: offset },
      token,
    );
  }
  async save(token: string, command: SaveGameEditor) {
    const parsed = saveGameEditorSchema.safeParse(command);
    if (!parsed.success)
      throw new HttpError(
        400,
        "invalid_input",
        "Revise os dados do jogo e a sequência da arbitragem.",
      );
    const result = await this.call(
      saveResultSchema,
      "save_game_editor",
      { p_command: parsed.data },
      token,
    );
    if (
      result.id.toLowerCase() !== command.game.id.toLowerCase() ||
      result.version !== command.expectedVersion + 1
    )
      throw unavailable();
    return result;
  }
  private async call<T, N extends Rpc>(
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
      if (body === null && name === "get_game_editor")
        throw new HttpError(404, "context_not_found", "Jogo não encontrado.");
      const parsed = schema.safeParse(body);
      if (!parsed.success) throw unavailable();
      return parsed.data;
    }
    if (response.status === 409) {
      const error = z
        .object({ message: z.string() })
        .safeParse(await providerJson(response, 16384));
      const message = error.success ? error.data.message : "";
      if (message === "official_homonym_confirmation_required")
        throw new HttpError(
          409,
          message,
          "Há um oficial com esse nome. Selecione o cadastro existente ou confirme que é outra pessoa.",
        );
      if (message === "idempotency_conflict")
        throw new HttpError(
          409,
          message,
          "Este envio já foi usado com outros dados. Recarregue para continuar.",
        );
      if (message === "regulation_group_opponents_locked")
        throw new HttpError(
          409,
          "regulation_assignment_conflict",
          "O jogo pertence a um grupo. Revise a atribuição antes de trocar os adversários.",
        );
      throw new HttpError(
        409,
        "version_conflict",
        "O jogo foi alterado. Recarregue antes de salvar.",
      );
    }
    await response.body?.cancel().catch(() => undefined);
    if (response.status === 401) throw invalidSession();
    if (response.status === 403) throw forbidden();
    if (response.status === 400)
      throw new HttpError(
        400,
        "invalid_input",
        "Revise os dados do jogo e a arbitragem.",
      );
    throw unavailable();
  }
}
