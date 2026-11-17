import { z } from "zod";
import { forbidden, providerJson, unavailable } from "../access/provider";
import { invalidSession } from "../access/vault";
import { HttpError } from "../server/http";
import type { Database, Json } from "../server/database.types";
import {
  listingSchema,
  snapshotSchema,
  saveResultSchema,
  type SaveCompetition,
} from "./contract";

import {
  disputeAdministrationListSchema,
  disputeAdministrationSchema,
  type DisputeAdministrationCommand,
  type SaveCompetitionAdministration,
} from "./administration-contract";

type Functions = Database["public"]["Functions"];
type Send = (url: string, init: RequestInit) => Promise<Response>;
export class SupabaseCompetitions {
  constructor(
    private readonly config: { url: string; key: string },
    private readonly send: Send = (url, init) => fetch(url, init),
  ) {}

  async list(token: string, query: string, offset: number) {
    return checked(
      listingSchema,
      await this.rpc(
        "list_competitions",
        { p_query: query, p_offset: offset },
        token,
      ),
    );
  }
  async get(token: string, id: string) {
    const data = await this.rpc("get_competition", { p_id: id }, token);
    if (data === null)
      throw new HttpError(
        404,
        "context_not_found",
        "Campeonato não encontrado.",
      );
    return checked(snapshotSchema, data);
  }
  async save(token: string, command: SaveCompetition) {
    return checked(
      saveResultSchema,
      await this.rpc("save_competition", { p_command: command }, token),
    );
  }
  async getAdministration(token: string, id: string) {
    return checked(
      disputeAdministrationListSchema,
      await this.rpc(
        "get_dispute_administration",
        { p_competition_id: id },
        token,
      ),
    );
  }
  async saveAdministration(
    token: string,
    command: DisputeAdministrationCommand,
  ) {
    return checked(
      disputeAdministrationSchema,
      await this.rpc(
        "save_dispute_administration",
        { p_command: command },
        token,
      ),
    );
  }
  async saveWithAdministration(
    token: string,
    command: SaveCompetitionAdministration,
  ) {
    return checked(
      saveResultSchema,
      await this.rpc(
        "save_competition_administration",
        { p_command: command },
        token,
      ),
    );
  }
  async readTestDispute(
    token: string,
    id: string,
    operation: string,
    args: Json,
  ) {
    return checked(
      z.json(),
      await this.rpc(
        "read_test_dispute",
        {
          p_id: id,
          p_operation: operation,
          p_args: args,
        },
        token,
      ),
    );
  }
  private async rpc<N extends keyof Functions>(
    name: N,
    args: Functions[N]["Args"],
    token: string,
  ): Promise<unknown> {
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
    if (response.ok)
      return providerJson(
        response,
        name === "read_test_dispute" ? 20971520 : 1048576,
      );
    if (response.status === 409) {
      const body = await providerJson(response);
      const parsed = z
        .object({
          message: z.string(),
          details: z.string().nullable().optional(),
        })
        .safeParse(body);
      const code = parsed.success ? parsed.data.message : "version_conflict";
      const details = parsed.success ? parsed.data.details : null;
      const message = Object.hasOwn(conflictMessages, code)
        ? conflictMessages[code]
        : undefined;
      throw new HttpError(
        409,
        message ? code : "version_conflict",
        code === "dispute_pending_games"
          ? pendingGameMessage(details)
          : (message ?? conflictMessages.version_conflict),
      );
    }
    if (response.status === 404) {
      await response.body?.cancel().catch(() => undefined);
      throw new HttpError(404, "context_not_found", "Disputa não encontrada.");
    }
    await response.body?.cancel().catch(() => undefined);
    if (response.status === 401) throw invalidSession();
    if (response.status === 403) throw forbidden();
    if (response.status === 400)
      throw new HttpError(
        400,
        "invalid_input",
        "Revise os dados: anos e disputas não podem se repetir nem trocar de contexto.",
      );
    throw unavailable();
  }
}
const conflictMessages: Record<string, string> = {
  idempotency_conflict:
    "Este envio já foi usado com outros dados. Recarregue para continuar.",
  version_conflict:
    "O campeonato foi alterado em outra sessão. Recarregue antes de salvar.",
  dispute_identity_locked:
    "A disputa já tem dependências. Naipe, categoria e divisão estão travados.",
  season_year_locked:
    "O ano está travado porque uma disputa desta temporada já tem dependências.",
  dispute_closed: "Reabra a disputa antes de alterar dados esportivos.",
  dispute_pending_games: "Resolva os jogos pendentes antes de concluir.",
  invalid_dispute_transition:
    "A situação atual da disputa não permite esta ação.",
  test_dispute_private: "Disputas de teste são privadas. Use Abrir prévia.",
  test_dispute_creation_only: "Escolha a modalidade ao cadastrar a disputa.",
  championship_rename_reason_required:
    "Informe o motivo da alteração do nome público.",
};
function pendingGameMessage(details: string | null | undefined) {
  const base = conflictMessages.dispute_pending_games;
  if (!details) return base;
  try {
    const games = z
      .array(
        z.object({
          number: z.union([z.string(), z.number()]).nullable(),
          home: z.string(),
          away: z.string(),
        }),
      )
      .parse(JSON.parse(details));
    const list = games
      .slice(0, 3)
      .map(({ number, home, away }) =>
        [number, home + " × " + away].filter((x) => x !== null).join(" · "),
      );
    if (games.length > 3) list.push("mais " + (games.length - 3));
    return base + " " + list.join(", ") + ".";
  } catch {
    return base;
  }
}
function checked<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) throw unavailable();
  return result.data;
}
