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
import {
  removalContextSchema,
  removalResultSchema,
  type RegistrationRemoval,
} from "./removal-contract";
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
  async removalContext(token: string, id: string, disputeId: string) {
    const value = await this.checked(
      removalContextSchema,
      "get_registration_removal_context",
      { p_registration_id: id, p_dispute_id: disputeId },
      token,
      8192,
    );
    const context = value.state === "removed" ? value : value.registration;
    if (
      context.id.toLowerCase() !== id.toLowerCase() ||
      context.disputeId.toLowerCase() !== disputeId.toLowerCase()
    )
      throw unavailable();
    return value;
  }
  async removeRegistration(token: string, command: RegistrationRemoval) {
    const value = await this.checked(
      removalResultSchema,
      "remove_registration",
      { p_command: command },
      token,
      8192,
    );
    if (
      value.id.toLowerCase() !== command.registrationId.toLowerCase() ||
      value.disputeId.toLowerCase() !== command.disputeId.toLowerCase() ||
      value.deletedVersion !== command.expectedVersion
    )
      throw unavailable();
    return value;
  }
  private async checked<T, N extends keyof Functions>(
    schema: z.ZodType<T>,
    name: N,
    args: Functions[N]["Args"],
    token: string,
    maxBytes = 1048576,
  ): Promise<T> {
    const removal =
      name === "get_registration_removal_context" ||
      name === "remove_registration";
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
      const body = await providerJson(response, maxBytes);
      if (body === null && removal) throw unavailable();
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
      if (removal) {
        const cause = z
          .object({
            message: z.enum(["registration_in_use", "registration_removed"]),
          })
          .safeParse(body);
        if (cause.success)
          throw new HttpError(
            409,
            cause.data.message,
            cause.data.message === "registration_in_use"
              ? "A inscrição possui dependências. Atualize a conferência antes de continuar."
              : "Esta inscrição já foi excluída. Atualize a conferência.",
          );
      }
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
    if (response.status === 404 && removal) {
      const body = await providerJson(response);
      if (
        z
          .object({ message: z.literal("registration_not_found") })
          .safeParse(body).success
      )
        throw new HttpError(
          404,
          "context_not_found",
          "Inscrição não encontrada nesta disputa.",
        );
      throw unavailable();
    }
    await response.body?.cancel().catch(() => undefined);
    if (response.status === 401) throw invalidSession();
    if (response.status === 403) throw forbidden();
    if (response.status === 400)
      throw new HttpError(
        400,
        "invalid_input",
        removal
          ? "Revise a inscrição, a disputa e a conferência de exclusão."
          : "Revise nome, sigla e destino. Uma inscrição salva não pode trocar de equipe ou disputa.",
      );
    throw unavailable();
  }
}
