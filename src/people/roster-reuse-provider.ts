import { z } from "zod";
import { forbidden, providerJson, unavailable } from "../access/provider";
import { invalidSession } from "../access/vault";
import { HttpError } from "../server/http";
import type { Database } from "../server/database.types";
import {
  applyRosterReuseSchema,
  reuseContextSchema,
  rosterReuseResultSchema,
  rosterReuseSourcesSchema,
} from "./roster-reuse-contract";

type Functions = Database["public"]["Functions"];
type Rpc =
  | "list_roster_reuse_sources"
  | "get_roster_reuse_context"
  | "apply_roster_reuse";
const errors = {
  reuse_context_conflict:
    "A origem ou o destino mudou. Atualize a prévia antes de confirmar.",
  idempotency_conflict:
    "Este comando já foi enviado com outros dados. Confira o elenco salvo.",
  invalid_reuse_selection:
    "Há atletas indisponíveis na seleção. Atualize o contexto.",
  invalid_roster_reuse:
    "Confira os atletas, as camisas e a confirmação do reaproveitamento.",
  reuse_context_too_large:
    "O elenco excede o limite de vínculos desta operação.",
  reuse_registration_not_found:
    "A inscrição de origem ou destino não foi encontrada.",
} as const;
const bad = () =>
  new HttpError(400, "invalid_input", "Confira as inscrições e a seleção.");
const uuid = (value: string) => {
  const result = z
    .uuid()
    .transform((v) => v.toLowerCase())
    .safeParse(value);
  if (!result.success) throw bad();
  return result.data;
};

export class SupabaseRosterReuse {
  constructor(
    private readonly config: { url: string; key: string },
    private readonly send: (
      url: string,
      init: RequestInit,
    ) => Promise<Response> = (url, init) => fetch(url, init),
  ) {}

  async sources(token: string, targetId: string, offset: number) {
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100000)
      throw bad();
    return this.rpc(
      rosterReuseSourcesSchema,
      "list_roster_reuse_sources",
      {
        p_target_registration_id: uuid(targetId),
        p_offset: offset,
      },
      token,
    );
  }

  async context(token: string, sourceId: string, targetId: string) {
    sourceId = uuid(sourceId);
    targetId = uuid(targetId);
    const view = await this.rpc(
      reuseContextSchema,
      "get_roster_reuse_context",
      {
        p_source_registration_id: sourceId,
        p_target_registration_id: targetId,
      },
      token,
    );
    if (view.source.id !== sourceId || view.target.id !== targetId)
      throw unavailable();
    return view;
  }

  async apply(token: string, input: unknown) {
    const command = applyRosterReuseSchema.safeParse(input);
    if (!command.success) throw bad();
    // The SQL writer checks a stored receipt before checking changed context;
    // replaying the identical command recovers a response lost after commit.
    const receipt = await this.rpc(
      rosterReuseResultSchema,
      "apply_roster_reuse",
      {
        p_command: command.data,
      },
      token,
    );
    if (
      receipt.commandId !== command.data.commandId ||
      receipt.sourceRegistrationId !== command.data.sourceRegistrationId ||
      receipt.targetRegistrationId !== command.data.targetRegistrationId ||
      receipt.items.length !== command.data.items.length ||
      receipt.items.some(
        (item, i) =>
          item.sourceEntryId !== command.data.items[i].sourceEntryId ||
          item.newEntryId !== command.data.items[i].newEntryId,
      )
    )
      throw unavailable();
    return receipt;
  }

  private async rpc<T, N extends Rpc>(
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
      const value = await providerJson(response, 2097152);
      if (value === null)
        throw new HttpError(
          404,
          "context_not_found",
          errors.reuse_registration_not_found,
        );
      const parsed = schema.safeParse(value);
      if (!parsed.success) throw unavailable();
      return parsed.data;
    }
    if ([400, 404, 409, 413].includes(response.status)) {
      const body = z
        .object({ message: z.string() })
        .safeParse(await providerJson(response));
      if (body.success && Object.hasOwn(errors, body.data.message)) {
        const code = body.data.message as keyof typeof errors;
        throw new HttpError(response.status, code, errors[code]);
      }
      if (response.status === 409)
        throw new HttpError(
          409,
          "reuse_context_conflict",
          errors.reuse_context_conflict,
        );
      if (response.status === 413)
        throw new HttpError(
          413,
          "reuse_context_too_large",
          errors.reuse_context_too_large,
        );
      if (response.status === 404)
        throw new HttpError(
          404,
          "context_not_found",
          errors.reuse_registration_not_found,
        );
      throw bad();
    }
    await response.body?.cancel().catch(() => undefined);
    if (response.status === 401) throw invalidSession();
    if (response.status === 403) throw forbidden();
    throw unavailable();
  }
}
