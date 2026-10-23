import { z } from "zod";
import { forbidden, providerJson, unavailable } from "../access/provider";
import { invalidSession } from "../access/vault";
import { HttpError } from "../server/http";
import type { Database } from "../server/database.types";
import {
  listingSchema,
  snapshotSchema,
  saveResultSchema,
  type SaveCompetition,
} from "./contract";

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
    if (response.ok) return providerJson(response, 1048576);
    if (response.status === 409) {
      const body = await providerJson(response);
      const mismatch = z
        .object({ message: z.literal("idempotency_conflict") })
        .safeParse(body).success;
      throw new HttpError(
        409,
        mismatch ? "idempotency_conflict" : "version_conflict",
        mismatch
          ? "Este envio já foi usado com outros dados. Recarregue para continuar."
          : "O campeonato foi alterado em outra sessão. Recarregue antes de salvar.",
      );
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
function checked<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) throw unavailable();
  return result.data;
}
