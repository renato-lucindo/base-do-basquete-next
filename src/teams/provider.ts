import { z } from "zod";
import { forbidden, providerJson, unavailable } from "../access/provider";
import { invalidSession } from "../access/vault";
import { HttpError } from "../server/http";
import type { Database } from "../server/database.types";
import { saveResultSchema } from "../competition/contract";
import {
  teamListingSchema,
  registrationListingSchema,
  teamSnapshotSchema,
  registrationSnapshotSchema,
  type SaveTeam,
  type SaveRegistration,
} from "./contract";
type Functions = Database["public"]["Functions"];
type Send = (url: string, init: RequestInit) => Promise<Response>;
export class SupabaseTeams {
  constructor(
    private readonly config: { url: string; key: string },
    private readonly send: Send = (url, init) => fetch(url, init),
  ) {}
  teams(token: string, query: string, offset: number) {
    return this.checked(
      teamListingSchema,
      "list_teams",
      { p_query: query, p_offset: offset },
      token,
    );
  }
  registrations(
    token: string,
    disputeId: string,
    query: string,
    offset: number,
  ) {
    return this.checked(
      registrationListingSchema,
      "list_registrations",
      { p_dispute_id: disputeId, p_query: query, p_offset: offset },
      token,
    );
  }
  getTeam(token: string, id: string) {
    return this.checked(teamSnapshotSchema, "get_team", { p_id: id }, token);
  }
  getRegistration(token: string, id: string) {
    return this.checked(
      registrationSnapshotSchema,
      "get_registration",
      { p_id: id },
      token,
    );
  }
  saveTeam(token: string, command: SaveTeam) {
    return this.checked(
      saveResultSchema,
      "save_team",
      { p_command: command },
      token,
    );
  }
  saveRegistration(token: string, command: SaveRegistration) {
    return this.checked(
      saveResultSchema,
      "save_registration",
      { p_command: command },
      token,
    );
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
      if (body === null)
        throw new HttpError(
          404,
          "context_not_found",
          "Equipe ou inscrição não encontrada.",
        );
      const parsed = schema.safeParse(body);
      if (!parsed.success) throw unavailable();
      return parsed.data;
    }
    if (response.status === 409) {
      const body = await providerJson(response);
      const replay = z
        .object({ message: z.literal("idempotency_conflict") })
        .safeParse(body).success;
      throw new HttpError(
        409,
        replay ? "idempotency_conflict" : "version_conflict",
        replay
          ? "Este envio já foi usado com outros dados. Recarregue para continuar."
          : "O cadastro foi alterado em outra sessão. Recarregue antes de salvar.",
      );
    }
    await response.body?.cancel().catch(() => undefined);
    if (response.status === 401) throw invalidSession();
    if (response.status === 403) throw forbidden();
    if (response.status === 400)
      throw new HttpError(
        400,
        "invalid_input",
        "Revise nome, sigla e destino. Uma inscrição salva não pode trocar de equipe ou disputa.",
      );
    throw unavailable();
  }
}
