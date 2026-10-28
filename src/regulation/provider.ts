import { z } from "zod";
import { forbidden, providerJson, unavailable } from "../access/provider";
import { invalidSession } from "../access/vault";
import { HttpError } from "../server/http";
import type { Database } from "../server/database.types";
import {
  regulationStateSchema,
  regulationVersionSchema,
  saveRegulationSchema,
  regulationSaveResultSchema,
  previewRegulationDefinition,
  type SaveRegulation,
} from "./persistence-contract";
import {
  regulationViewSchema,
  regulationVersionViewSchema,
  previewRegulationSchema,
  regulationPreviewResultSchema,
  regulationProjectionSchema,
} from "./view-contract";
type Functions = Database["public"]["Functions"];
type Rpc =
  "get_regulation_state" | "get_regulation_version" | "save_regulation";
const messages = {
  context_conflict:
    "Os jogos ou resultados mudaram. Confira uma nova prévia antes de salvar o regulamento.",
  version_conflict:
    "O regulamento mudou. Recarregue antes de salvar, preservando sua edição para conferência.",
  idempotency_conflict:
    "Este envio já foi usado com outros dados. Recarregue para continuar.",
  regulation_impact_required:
    "Confira o impacto, informe o motivo e confirme a alteração com resultados existentes.",
  invalid_regulation_registration:
    "Uma inscrição selecionada não pertence a esta disputa. Confira os participantes.",
  invalid_regulation_assignment:
    "Confira os jogos atribuídos e os adversários de cada grupo.",
} as const;
const bad = () =>
  new HttpError(
    400,
    "invalid_input",
    "Revise as fases, grupos, confrontos e regras do regulamento.",
  );
function canonicalId(value: string) {
  const parsed = z
    .uuid()
    .transform((v) => v.toLowerCase())
    .safeParse(value);
  if (!parsed.success) throw bad();
  return parsed.data;
}
function projection(
  definition: unknown,
  context: unknown,
  disputeId: string,
  version: number,
) {
  const p = previewRegulationDefinition(
    definition,
    context,
    disputeId,
    version,
  );
  return regulationProjectionSchema.parse({
    algorithmVersion: p.algorithmVersion,
    status: p.status,
    disputeId: p.disputeId,
    regulationVersion: p.regulationVersion,
    groupPhases: p.groupPhases,
    series: p.series,
    lineage: p.lineage,
  });
}
export class SupabaseRegulations {
  constructor(
    private readonly config: { url: string; key: string },
    private readonly send: (
      url: string,
      init: RequestInit,
    ) => Promise<Response> = (url, init) => fetch(url, init),
  ) {}
  async getState(token: string, disputeId: string, offset = 0) {
    disputeId = canonicalId(disputeId);
    if (
      !z.uuid().safeParse(disputeId).success ||
      !Number.isSafeInteger(offset) ||
      offset < 0 ||
      offset > 100000
    )
      throw bad();
    const r = await this.rpc(
      regulationStateSchema,
      "get_regulation_state",
      { p_dispute_id: disputeId, p_offset: offset },
      token,
    );
    if (r.disputeId !== disputeId) throw unavailable();
    return r;
  }
  async getView(token: string, disputeId: string, offset = 0) {
    const s = await this.getState(token, disputeId, offset);
    return regulationViewSchema.parse({
      disputeId: s.disputeId,
      version: s.version,
      definition: s.definition,
      savedAt: s.savedAt,
      contextFingerprint: s.contextFingerprint,
      history: s.history,
      hasMore: s.hasMore,
      registrationIds: s.context.registrationIds,
      hasPublishedResults: s.context.publishedGames.length > 0,
      preview: s.definition
        ? projection(s.definition, s.context, s.disputeId, s.version)
        : null,
    });
  }
  async getVersion(token: string, disputeId: string, version: number) {
    disputeId = canonicalId(disputeId);
    if (
      !z.uuid().safeParse(disputeId).success ||
      !Number.isSafeInteger(version) ||
      version < 1 ||
      version > 2147483647
    )
      throw bad();
    const r = await this.rpc(
      regulationVersionSchema.nullable(),
      "get_regulation_version",
      { p_dispute_id: disputeId, p_version: version },
      token,
    );
    if (!r)
      throw new HttpError(
        404,
        "context_not_found",
        "Versão do regulamento não encontrada.",
      );
    if (r.disputeId !== disputeId || r.version !== version) throw unavailable();
    return r;
  }
  async getVersionView(token: string, disputeId: string, version: number) {
    const s = await this.getVersion(token, disputeId, version);
    return regulationVersionViewSchema.parse({
      disputeId: s.disputeId,
      version: s.version,
      definition: s.definition,
      contextFingerprint: s.contextFingerprint,
      savedAt: s.savedAt,
      actorId: s.actorId,
      reason: s.reason,
      algorithmVersion: s.algorithmVersion,
      preview: projection(s.definition, s.context, s.disputeId, s.version),
    });
  }
  async preview(token: string, disputeId: string, input: unknown) {
    disputeId = canonicalId(disputeId);
    const c = previewRegulationSchema.safeParse(input);
    if (!c.success) throw bad();
    const s = await this.getState(token, disputeId);
    if (s.version !== c.data.expectedVersion)
      throw new HttpError(409, "version_conflict", messages.version_conflict);
    if (s.contextFingerprint !== c.data.expectedContextFingerprint)
      throw new HttpError(409, "context_conflict", messages.context_conflict);
    try {
      return regulationPreviewResultSchema.parse({
        disputeId,
        baseVersion: s.version,
        contextFingerprint: s.contextFingerprint,
        definition: c.data.definition,
        hasPublishedResults: s.context.publishedGames.length > 0,
        before: s.definition
          ? projection(s.definition, s.context, disputeId, s.version)
          : null,
        after: projection(
          c.data.definition,
          s.context,
          disputeId,
          s.version + 1,
        ),
      });
    } catch {
      throw bad();
    }
  }
  async save(token: string, input: SaveRegulation) {
    const parsed = saveRegulationSchema.safeParse(input);
    if (!parsed.success) throw bad();
    const c = parsed.data;
    // Do not pre-read a new head here: a lost ACK must reach the durable receipt using the same command.
    const r = await this.rpc(
      regulationSaveResultSchema,
      "save_regulation",
      { p_command: c },
      token,
    );
    if (
      r.commandId !== c.commandId ||
      r.disputeId !== c.disputeId ||
      r.version !== c.expectedVersion + 1 ||
      r.contextFingerprint !== c.expectedContextFingerprint
    )
      throw unavailable();
    return r;
  }
  private async rpc<T, N extends Rpc>(
    schema: z.ZodType<T>,
    name: N,
    args: Functions[N]["Args"],
    token: string,
  ): Promise<T> {
    let response: Response;
    try {
      response = await this.send(this.config.url + "/rest/v1/rpc/" + name, {
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
      const body = await providerJson(response, 20971520),
        r = schema.safeParse(body);
      if (!r.success) throw unavailable();
      return r.data;
    }
    if (response.status === 400 || response.status === 409) {
      const body = z
          .object({ message: z.string() })
          .safeParse(await providerJson(response)),
        key = body.success ? body.data.message : "";
      if (key in messages)
        throw new HttpError(
          response.status,
          key,
          messages[key as keyof typeof messages],
        );
      if (response.status === 409)
        throw new HttpError(409, "version_conflict", messages.version_conflict);
      throw bad();
    }
    await response.body?.cancel().catch(() => undefined);
    if (response.status === 401) throw invalidSession();
    if (response.status === 403) throw forbidden();
    if (response.status === 404)
      throw new HttpError(
        404,
        "context_not_found",
        "Disputa ou regulamento não encontrado.",
      );
    if (response.status === 413)
      throw new HttpError(
        413,
        "regulation_context_too_large",
        "O contexto excede o limite desta operação. Revise o recorte da disputa.",
      );
    throw unavailable();
  }
}
