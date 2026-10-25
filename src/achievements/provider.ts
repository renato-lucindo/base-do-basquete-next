import { z } from "zod";
import { forbidden, providerJson, unavailable } from "../access/provider";
import { invalidSession } from "../access/vault";
import { HttpError } from "../server/http";
import type { Database } from "../server/database.types";
import {
  achievementContextSchema,
  achievementCandidateListingSchema,
} from "./context-contract";
import {
  saveAchievementDraftSchema,
  achievementDraftAckSchema,
  achievementDraftVersionSchema,
} from "./draft-contract";
import {
  confirmAchievementsSchema,
  achievementConfirmationAckSchema,
  achievementPublicationVersionSchema,
  publicAchievementsSchema,
} from "./publication-contract";
import {
  achievementWorkspaceSchema,
  achievementDraftVersionViewSchema,
  previewAchievementsSchema,
  achievementSuggestionViewSchema,
} from "./view-contract";
import { suggestPlacements } from "./suggest";
type Functions = Database["public"]["Functions"];
type Rpc =
  | "get_achievement_workspace"
  | "get_achievement_context"
  | "list_achievement_athletes"
  | "save_achievement_draft"
  | "get_achievement_draft_version"
  | "confirm_achievements"
  | "get_achievement_publication_version"
  | "get_public_achievements";
const messages = {
  context_conflict:
    "A fonte mudou. Atualize e confira o rascunho antes de continuar.",
  version_conflict:
    "Esta versão já mudou. Preserve sua edição e confira o estado salvo.",
  idempotency_conflict:
    "Este envio já foi usado com outros dados. Confira o estado salvo.",
  achievement_review_required:
    "A fonte mudou desde a revisão. Confira e salve o rascunho antes de confirmar.",
  invalid_achievement_recipient:
    "Escolha um atleta com histórico nesta disputa.",
  invalid_achievement_registration:
    "A inscrição escolhida não pertence a esta disputa.",
  invalid_achievement_source:
    "Escolha um grupo ou confronto existente no regulamento atual.",
  empty_achievement_confirmation:
    "Preencha as colocações ou honrarias antes da primeira confirmação.",
} as const;
const bad = () =>
  new HttpError(
    400,
    "invalid_input",
    "Confira a disputa, as colocações, os destinatários e a confirmação da premiação.",
  );
const large = () =>
  new HttpError(
    413,
    "achievement_context_too_large",
    "A premiação excede o limite desta operação. Os dados salvos foram preservados.",
  );
function uuid(value: string) {
  const r = z
    .uuid()
    .transform((v) => v.toLowerCase())
    .safeParse(value);
  if (!r.success) throw bad();
  return r.data;
}
function page(value: number) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 100000) throw bad();
  return value;
}
function version(value: number) {
  if (!Number.isSafeInteger(value) || value < 1 || value > 2147483647)
    throw bad();
  return value;
}
export class SupabaseAchievements {
  constructor(
    private readonly config: { url: string; key: string },
    private readonly send: (
      url: string,
      init: RequestInit,
    ) => Promise<Response> = (url, init) => fetch(url, init),
  ) {}
  async getWorkspace(
    token: string,
    disputeId: string,
    draftOffset = 0,
    publicationOffset = 0,
  ) {
    disputeId = uuid(disputeId);
    const r = await this.rpc(
      achievementWorkspaceSchema,
      "get_achievement_workspace",
      {
        p_dispute_id: disputeId,
        p_draft_offset: page(draftOffset),
        p_publication_offset: page(publicationOffset),
      },
      token,
    );
    if (r.disputeId !== disputeId) throw unavailable();
    return r;
  }
  async getCandidates(token: string, disputeId: string, q = "", offset = 0) {
    disputeId = uuid(disputeId);
    if (
      !z
        .string()
        .max(120)
        .refine((v) => !/[\u0000\uD800-\uDFFF]/u.test(v))
        .safeParse(q).success
    )
      throw bad();
    const r = await this.rpc(
      achievementCandidateListingSchema,
      "list_achievement_athletes",
      { p_dispute_id: disputeId, p_query: q, p_offset: page(offset) },
      token,
    );
    if (r.disputeId !== disputeId) throw unavailable();
    return r;
  }
  async preview(token: string, input: unknown) {
    const parsed = previewAchievementsSchema.safeParse(input);
    if (!parsed.success) throw bad();
    const c = parsed.data;
    const ctx = await this.rpc(
      achievementContextSchema,
      "get_achievement_context",
      { p_dispute_id: c.disputeId },
      token,
    );
    if (ctx.disputeId !== c.disputeId) throw unavailable();
    if (ctx.contextFingerprint !== c.expectedContextFingerprint)
      throw new HttpError(409, "context_conflict", messages.context_conflict);
    const suggestion = suggestPlacements(
      {
        disputeId: c.disputeId,
        expectedRegulationVersion: ctx.regulation.version,
        expectedContextFingerprint: ctx.regulation.contextFingerprint,
        source: c.source,
      },
      ctx.regulation,
    );
    return achievementSuggestionViewSchema.parse({
      disputeId: c.disputeId,
      contextFingerprint: ctx.contextFingerprint,
      suggestion,
    });
  }
  async save(token: string, input: unknown) {
    const parsed = saveAchievementDraftSchema.safeParse(input);
    if (!parsed.success) throw bad();
    const c = parsed.data;
    // No pre-read: retries must reach the durable receipt even after the source changes.
    const r = await this.rpc(
      achievementDraftAckSchema,
      "save_achievement_draft",
      { p_command: c },
      token,
    );
    if (
      r.commandId !== c.commandId ||
      r.disputeId !== c.draft.disputeId ||
      r.version !== c.expectedVersion + 1 ||
      r.contextFingerprint !== c.expectedContextFingerprint
    )
      throw unavailable();
    return r;
  }
  async confirm(token: string, input: unknown) {
    const parsed = confirmAchievementsSchema.safeParse(input);
    if (!parsed.success) throw bad();
    const c = parsed.data;
    const r = await this.rpc(
      achievementConfirmationAckSchema,
      "confirm_achievements",
      { p_command: c },
      token,
    );
    if (
      r.commandId !== c.commandId ||
      r.disputeId !== c.disputeId ||
      r.version !== c.expectedPublicationVersion + 1 ||
      r.draftVersion !== c.expectedDraftVersion
    )
      throw unavailable();
    return r;
  }
  async getDraftVersion(token: string, disputeId: string, wanted: number) {
    disputeId = uuid(disputeId);
    const r = await this.rpc(
      achievementDraftVersionSchema.nullable(),
      "get_achievement_draft_version",
      { p_dispute_id: disputeId, p_version: version(wanted) },
      token,
    );
    if (!r)
      throw new HttpError(
        404,
        "context_not_found",
        "Versão do rascunho não encontrada.",
      );
    if (r.disputeId !== disputeId || r.version !== wanted) throw unavailable();
    const { contextSnapshot, ...value } = r;
    return achievementDraftVersionViewSchema.parse({
      ...value,
      registrations: contextSnapshot.registrations,
    });
  }
  async getPublicationVersion(
    token: string,
    disputeId: string,
    wanted: number,
  ) {
    disputeId = uuid(disputeId);
    const r = await this.rpc(
      achievementPublicationVersionSchema.nullable(),
      "get_achievement_publication_version",
      { p_dispute_id: disputeId, p_version: version(wanted) },
      token,
    );
    if (!r)
      throw new HttpError(
        404,
        "context_not_found",
        "Confirmação não encontrada.",
      );
    if (r.disputeId !== disputeId || r.version !== wanted) throw unavailable();
    return r;
  }
  async getPublic(disputeId: string) {
    disputeId = uuid(disputeId);
    const r = await this.rpc(
      publicAchievementsSchema.nullable(),
      "get_public_achievements",
      { p_dispute_id: disputeId },
    );
    if (r && r.disputeId !== disputeId) throw unavailable();
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
      response = await this.send(`${this.config.url}/rest/v1/rpc/${name}`, {
        method: "POST",
        headers: {
          apikey: this.config.key,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(args),
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      throw unavailable();
    }
    if (response.ok) {
      const data = await providerJson(response, 16777216),
        parsed = schema.safeParse(data);
      if (!parsed.success) throw unavailable();
      return parsed.data;
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
        throw new HttpError(409, "context_conflict", messages.context_conflict);
      throw bad();
    }
    await response.body?.cancel().catch(() => undefined);
    if (response.status === 401) throw invalidSession();
    if (response.status === 403) throw forbidden();
    if (response.status === 404)
      throw new HttpError(404, "context_not_found", "Disputa não encontrada.");
    if (response.status === 413) throw large();
    throw unavailable();
  }
}
