import { z } from "zod";
import { forbidden, providerJson, unavailable } from "../access/provider";
import { invalidSession } from "../access/vault";
import { HttpError } from "../server/http";
import type { Database } from "../server/database.types";
import {
  saveTransferSchema,
  transferContextSchema,
  transferResultSchema,
  type TransferContext,
} from "./transfer-contract";
import { previewTransfer } from "./transfer";

type Functions = Database["public"]["Functions"];
type Rpc = "get_transfer_context" | "transfer_roster_entry";
const messages = {
  transfer_not_allowed:
    "O regulamento precisa permitir transferências antes de abrir este vínculo.",
  transfer_jersey_conflict:
    "A camisa já está em uso no destino. Escolha outra camisa.",
  transfer_context_conflict:
    "Os vínculos, a inscrição ou o regulamento mudaram. Atualize o contexto e confira outra prévia.",
  transfer_source_changed:
    "A origem já mudou. Atualize o elenco antes de conferir outra transferência.",
  idempotency_conflict:
    "Este envio já foi usado com outros dados. Confira o vínculo salvo antes de continuar.",
  same_registration:
    "O atleta já está ativo nesta inscrição. Edite a camisa no vínculo atual.",
  transfer_id_used:
    "O novo vínculo já existe. Confira o elenco antes de continuar.",
} as const;
const bad = () =>
  new HttpError(
    400,
    "invalid_input",
    "Confira a origem, o destino, a camisa, o motivo e a confirmação da transferência.",
  );
const large = () =>
  new HttpError(
    413,
    "transfer_context_too_large",
    "Este contexto excede o limite de vínculos. A transferência não foi iniciada.",
  );
function uuid(value: string) {
  const r = z
    .uuid()
    .transform((v) => v.toLowerCase())
    .safeParse(value);
  if (!r.success) throw bad();
  return r.data;
}
function command(value: unknown) {
  const c = saveTransferSchema.safeParse(value);
  if (!c.success) throw bad();
  return c.data;
}
export class SupabaseTransfers {
  constructor(
    private readonly config: { url: string; key: string },
    private readonly send: (
      url: string,
      init: RequestInit,
    ) => Promise<Response> = (url, init) => fetch(url, init),
  ) {}
  async getContext(
    token: string,
    sourceEntryId: string,
    destinationRegistrationId: string,
  ): Promise<TransferContext> {
    sourceEntryId = uuid(sourceEntryId);
    destinationRegistrationId = uuid(destinationRegistrationId);
    const ctx = await this.rpc(
      transferContextSchema,
      "get_transfer_context",
      {
        p_source_entry_id: sourceEntryId,
        p_destination_registration_id: destinationRegistrationId,
      },
      token,
    );
    if (
      !ctx.memberships.some(
        (m) => m.id === sourceEntryId && m.personId === ctx.personId,
      ) ||
      !ctx.registrations.some((r) => r.id === destinationRegistrationId)
    )
      throw unavailable();
    return ctx;
  }
  async preview(token: string, input: unknown) {
    const c = command(input),
      ctx = await this.getContext(
        token,
        c.sourceEntryId,
        c.destinationRegistrationId,
      );
    if (c.disputeId !== ctx.disputeId) throw bad();
    return previewTransfer(c, ctx);
  }
  async save(token: string, input: unknown) {
    const c = command(input);
    if (!c.acknowledgeImpact) throw bad();
    // The writer revalidates everything on a fresh operation; an existing receipt
    // must still be recoverable after later context or regulation changes.
    const ack = await this.rpc(
      transferResultSchema,
      "transfer_roster_entry",
      { p_command: c },
      token,
    );
    if (
      ack.commandId !== c.commandId ||
      ack.disputeId !== c.disputeId ||
      ack.sourceEntryId !== c.sourceEntryId ||
      ack.newEntryId !== c.newEntryId ||
      ack.destinationRegistrationId !== c.destinationRegistrationId ||
      ![c.expectedSourceVersion, c.expectedSourceVersion + 1].includes(
        ack.sourceVersion,
      )
    )
      throw unavailable();
    return ack;
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
      const body = await providerJson(response, 2097152);
      if (body === null)
        throw new HttpError(
          404,
          "context_not_found",
          "Vínculo ou destino não encontrado.",
        );
      const result = schema.safeParse(body);
      if (!result.success) throw unavailable();
      return result.data;
    }
    if (response.status === 400 || response.status === 409) {
      const body = z
        .object({ message: z.string() })
        .safeParse(await providerJson(response));
      if (body.success && Object.hasOwn(messages, body.data.message)) {
        const code = body.data.message as keyof typeof messages;
        throw new HttpError(response.status, code, messages[code]);
      }
      if (response.status === 409)
        throw new HttpError(
          409,
          "transfer_context_conflict",
          messages.transfer_context_conflict,
        );
      throw bad();
    }
    await response.body?.cancel().catch(() => undefined);
    if (response.status === 401) throw invalidSession();
    if (response.status === 403) throw forbidden();
    if (response.status === 413) throw large();
    throw unavailable();
  }
}
