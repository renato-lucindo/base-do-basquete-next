import { z } from "zod";
import { forbidden, providerJson, unavailable } from "../access/provider";
import { invalidSession } from "../access/vault";
import { HttpError } from "../server/http";
import type { Database } from "../server/database.types";
import { SupabaseRegulations } from "./provider";
import {
  previewRegulationDefinition,
  type RegulationState,
} from "./persistence-contract";
import {
  gameOccurrenceStateSchema,
  gameOccurrenceVersionSchema,
  gameOccurrenceSaveResultSchema,
  saveGameOccurrenceSchema,
} from "./occurrence-contract";
import {
  registrationWithdrawalStateSchema,
  registrationWithdrawalVersionSchema,
  registrationWithdrawalSaveResultSchema,
  saveRegistrationWithdrawalSchema,
} from "./withdrawal-contract";
import { decisionPreviewResultSchema } from "./decision-view-contract";
import { regulationProjectionSchema } from "./view-contract";
type Functions = Database["public"]["Functions"];
type Rpc =
  | "get_game_occurrence_state"
  | "get_game_occurrence_version"
  | "save_game_occurrence"
  | "get_registration_withdrawal_state"
  | "get_registration_withdrawal_version"
  | "save_registration_withdrawal";
const messages = {
  version_conflict:
    "A decisão mudou. Recarregue os dados preservando sua edição para conferir novamente.",
  context_conflict:
    "Os jogos, resultados ou regras mudaram. Confira uma nova prévia antes de confirmar.",
  idempotency_conflict:
    "Este envio já foi usado com outros dados. Recarregue para continuar.",
  wo_rule_required:
    "Configure a regra de W.O. no regulamento antes de registrar essa decisão.",
  invalid_withdrawal_games:
    "Confira a relação completa dos resultados anteriores desta inscrição.",
  invalid_occurrence_winner:
    "O vencedor precisa ser um dos adversários deste jogo.",
  invalid_administrative_score:
    "Confira o vencedor e o placar administrativo informado.",
  occurrence_impact_required:
    "Confira o impacto e confirme a decisão sobre o resultado existente.",
  withdrawal_impact_required:
    "Confira o impacto e confirme a política para os jogos anteriores.",
} as const;
const bad = () =>
  new HttpError(
    400,
    "invalid_input",
    "Confira contexto, motivo e efeitos da decisão.",
  );
const conflict = (key: "version_conflict" | "context_conflict") =>
  new HttpError(409, key, messages[key]);
function uuid(value: string) {
  const r = z
    .uuid()
    .transform((v) => v.toLowerCase())
    .safeParse(value);
  if (!r.success) throw bad();
  return r.data;
}
function offset(value: number) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 100000) throw bad();
  return value;
}
function version(value: number) {
  if (!Number.isSafeInteger(value) || value < 1 || value > 2147483647)
    throw bad();
  return value;
}
function emptyDefinition() {
  return {
    registrationIds: [],
    occurrenceRules: { wo: null },
    groupPhases: [],
    knockoutPhases: [],
    series: [],
  };
}
function calculate(s: RegulationState) {
  return previewRegulationDefinition(
    s.definition ?? emptyDefinition(),
    s.context,
    s.disputeId,
    Math.max(1, s.version),
  );
}
type Preview = ReturnType<typeof calculate>;
function projection(p: Preview, s: RegulationState) {
  if (!s.definition) return null;
  const { games: _games, ...value } = p;
  void _games;
  return regulationProjectionSchema.parse(value);
}
function affected(p: Preview, ids: Set<string>) {
  return p.games
    .filter((g) => ids.has(g.gameId))
    .map((g) => ({
      gameId: g.gameId,
      disputeId: p.disputeId,
      homeRegistrationId: g.homeRegistrationId,
      awayRegistrationId: g.awayRegistrationId,
      state: g.state,
      needs: g.needs,
      outcome: g.outcome,
    }));
}
function priorGames(s: RegulationState, rid: string) {
  const pubs = new Map(s.context.publishedGames.map((p) => [p.gameId, p])),
    occ = new Map(s.context.occurrences.map((o) => [o.gameId, o]));
  return s.context.games
    .filter((g) => {
      if (![g.homeRegistrationId, g.awayRegistrationId].includes(rid))
        return false;
      if (pubs.has(g.id)) return true;
      const o = occ.get(g.id);
      return (
        o &&
        o.gameVersion === g.version &&
        o.publicationVersion === 0 &&
        ((o.effect.kind === "administrative" &&
          o.effect.decision.kind === "award") ||
          (o.effect.kind === "wo" && !!s.definition?.occurrenceRules.wo))
      );
    })
    .map((g) => g.id)
    .sort();
}
export class SupabaseDecisions {
  private readonly regulations: SupabaseRegulations;
  constructor(
    private readonly config: { url: string; key: string },
    private readonly send: (
      url: string,
      init: RequestInit,
    ) => Promise<Response> = (url, init) => fetch(url, init),
  ) {
    this.regulations = new SupabaseRegulations(config, send);
  }
  async getOccurrence(token: string, gameId: string, start = 0) {
    gameId = uuid(gameId);
    const s = await this.rpc(
      gameOccurrenceStateSchema,
      "get_game_occurrence_state",
      { p_game_id: gameId, p_offset: offset(start) },
      token,
    );
    if (s.gameId !== gameId) throw unavailable();
    return s;
  }
  async getWithdrawal(token: string, registrationId: string, start = 0) {
    registrationId = uuid(registrationId);
    const s = await this.rpc(
      registrationWithdrawalStateSchema,
      "get_registration_withdrawal_state",
      { p_registration_id: registrationId, p_offset: offset(start) },
      token,
    );
    if (s.registrationId !== registrationId) throw unavailable();
    return s;
  }
  async getOccurrenceVersion(token: string, gameId: string, wanted: number) {
    gameId = uuid(gameId);
    const s = await this.rpc(
      gameOccurrenceVersionSchema.nullable(),
      "get_game_occurrence_version",
      { p_game_id: gameId, p_version: version(wanted) },
      token,
    );
    if (!s)
      throw new HttpError(
        404,
        "context_not_found",
        "Versão da ocorrência não encontrada.",
      );
    if (s.gameId !== gameId || s.version !== wanted) throw unavailable();
    return s;
  }
  async getWithdrawalVersion(
    token: string,
    registrationId: string,
    wanted: number,
  ) {
    registrationId = uuid(registrationId);
    const s = await this.rpc(
      registrationWithdrawalVersionSchema.nullable(),
      "get_registration_withdrawal_version",
      { p_registration_id: registrationId, p_version: version(wanted) },
      token,
    );
    if (!s)
      throw new HttpError(
        404,
        "context_not_found",
        "Versão da desistência não encontrada.",
      );
    if (s.registrationId !== registrationId || s.version !== wanted)
      throw unavailable();
    return s;
  }
  private async source(
    token: string,
    disputeId: string,
    expected: { regulationVersion: number; contextFingerprint: string },
  ) {
    const s = await this.regulations.getState(token, disputeId);
    if (
      s.version !== expected.regulationVersion ||
      s.contextFingerprint !== expected.contextFingerprint
    )
      throw conflict("context_conflict");
    return s;
  }
  async previewOccurrence(token: string, input: unknown) {
    const parsed = saveGameOccurrenceSchema.safeParse(input);
    if (!parsed.success) throw bad();
    const c = parsed.data,
      s = await this.getOccurrence(token, c.gameId);
    if (s.disputeId !== c.disputeId) throw bad();
    if (
      (s.head?.version ?? 0) !== c.expectedVersion ||
      (s.head && s.head.id !== c.occurrenceId)
    )
      throw conflict("version_conflict");
    if (
      s.gameVersion !== c.expectedGameVersion ||
      s.publicationVersion !== c.expectedPublicationVersion ||
      s.regulationVersion !== c.expectedRegulationVersion ||
      s.contextFingerprint !== c.expectedContextFingerprint
    )
      throw conflict("context_conflict");
    const r = await this.source(token, c.disputeId, s),
      g = r.context.games.find((g) => g.id === c.gameId),
      pub = r.context.publishedGames.find((g) => g.gameId === c.gameId);
    if (
      !g ||
      g.version !== s.gameVersion ||
      (pub?.publicationVersion ?? 0) !== s.publicationVersion
    )
      throw unavailable();
    const active = r.context.occurrences.find((o) => o.gameId === c.gameId);
    if (s.head?.effect) {
      if (
        !active ||
        active.id !== s.head.id ||
        active.version !== s.head.version ||
        active.gameVersion !== s.head.gameVersion ||
        active.publicationVersion !== s.head.publicationVersion
      )
        throw unavailable();
    } else if (active) throw unavailable();
    if (c.effect?.kind === "wo" && !r.definition?.occurrenceRules.wo)
      throw new HttpError(400, "wo_rule_required", messages.wo_rule_required);
    const before = calculate(r),
      next = structuredClone(r);
    next.context.occurrences = next.context.occurrences.filter(
      (o) => o.gameId !== c.gameId,
    );
    if (c.effect)
      next.context.occurrences.push({
        id: c.occurrenceId,
        version: c.expectedVersion + 1,
        gameId: c.gameId,
        gameVersion: c.expectedGameVersion,
        publicationVersion: c.expectedPublicationVersion,
        effect: c.effect,
        reason: c.reason,
      });
    let after: Preview;
    try {
      after = calculate(next);
    } catch {
      throw bad();
    }
    const ids = new Set([c.gameId]);
    return decisionPreviewResultSchema.parse({
      kind: "game_occurrence",
      targetId: c.gameId,
      disputeId: c.disputeId,
      commandId: c.commandId,
      baseVersion: c.expectedVersion,
      regulationVersion: r.version,
      contextFingerprint: r.contextFingerprint,
      definition: r.definition,
      before: projection(before, r),
      after: projection(after, r),
      requiresImpact: s.publicationVersion > 0 || s.head !== null,
      affected: { before: affected(before, ids), after: affected(after, ids) },
    });
  }
  async previewWithdrawal(token: string, input: unknown) {
    const parsed = saveRegistrationWithdrawalSchema.safeParse(input);
    if (!parsed.success) throw bad();
    const c = parsed.data,
      s = await this.getWithdrawal(token, c.registrationId);
    if (s.disputeId !== c.disputeId) throw bad();
    if (
      (s.head?.version ?? 0) !== c.expectedVersion ||
      (s.head && s.head.id !== c.withdrawalId)
    )
      throw conflict("version_conflict");
    if (
      s.regulationVersion !== c.expectedRegulationVersion ||
      s.contextFingerprint !== c.expectedContextFingerprint
    )
      throw conflict("context_conflict");
    const r = await this.source(token, c.disputeId, s);
    const active = r.context.withdrawals.find(
      (w) => w.registrationId === c.registrationId,
    );
    if (s.head?.policy) {
      if (
        !active ||
        active.id !== s.head.id ||
        active.version !== s.head.version
      )
        throw unavailable();
    } else if (active) throw unavailable();
    if (
      !r.context.registrationIds.includes(c.registrationId) ||
      JSON.stringify(priorGames(r, c.registrationId)) !==
        JSON.stringify([...s.previousGameIds].sort())
    )
      throw unavailable();
    if (
      c.policy !== null &&
      JSON.stringify([...c.previousGameIds].sort()) !==
        JSON.stringify([...s.previousGameIds].sort())
    )
      throw new HttpError(
        400,
        "invalid_withdrawal_games",
        messages.invalid_withdrawal_games,
      );
    const before = calculate(r),
      next = structuredClone(r);
    next.context.withdrawals = next.context.withdrawals.filter(
      (w) => w.registrationId !== c.registrationId,
    );
    if (c.policy)
      next.context.withdrawals.push({
        id: c.withdrawalId,
        version: c.expectedVersion + 1,
        registrationId: c.registrationId,
        policy: c.policy,
        previousGameIds: c.previousGameIds,
        reason: c.reason,
      });
    let after: Preview;
    try {
      after = calculate(next);
    } catch {
      throw bad();
    }
    const ids = new Set(
      r.context.games
        .filter((g) =>
          [g.homeRegistrationId, g.awayRegistrationId].includes(
            c.registrationId,
          ),
        )
        .map((g) => g.id),
    );
    return decisionPreviewResultSchema.parse({
      kind: "registration_withdrawal",
      targetId: c.registrationId,
      disputeId: c.disputeId,
      commandId: c.commandId,
      baseVersion: c.expectedVersion,
      regulationVersion: r.version,
      contextFingerprint: r.contextFingerprint,
      definition: r.definition,
      before: projection(before, r),
      after: projection(after, r),
      requiresImpact: s.previousGameIds.length > 0 || s.head !== null,
      affected: { before: affected(before, ids), after: affected(after, ids) },
    });
  }
  async saveOccurrence(token: string, input: unknown) {
    const c = saveGameOccurrenceSchema.safeParse(input);
    if (!c.success) throw bad();
    const v = c.data;
    const r = await this.rpc(
      gameOccurrenceSaveResultSchema,
      "save_game_occurrence",
      { p_command: v },
      token,
    );
    if (
      r.commandId !== v.commandId ||
      r.disputeId !== v.disputeId ||
      r.gameId !== v.gameId ||
      r.occurrenceId !== v.occurrenceId ||
      r.version !== v.expectedVersion + 1 ||
      r.contextFingerprint !== v.expectedContextFingerprint
    )
      throw unavailable();
    return r;
  }
  async saveWithdrawal(token: string, input: unknown) {
    const c = saveRegistrationWithdrawalSchema.safeParse(input);
    if (!c.success) throw bad();
    const v = c.data;
    const r = await this.rpc(
      registrationWithdrawalSaveResultSchema,
      "save_registration_withdrawal",
      { p_command: v },
      token,
    );
    if (
      r.commandId !== v.commandId ||
      r.disputeId !== v.disputeId ||
      r.registrationId !== v.registrationId ||
      r.withdrawalId !== v.withdrawalId ||
      r.version !== v.expectedVersion + 1 ||
      r.contextFingerprint !== v.expectedContextFingerprint
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
      if (response.status === 409) throw conflict("version_conflict");
      throw bad();
    }
    await response.body?.cancel().catch(() => undefined);
    if (response.status === 401) throw invalidSession();
    if (response.status === 403) throw forbidden();
    if (response.status === 404)
      throw new HttpError(
        404,
        "context_not_found",
        "Jogo, inscrição ou decisão não encontrada.",
      );
    if (response.status === 413)
      throw new HttpError(
        413,
        "decision_context_too_large",
        "O contexto excede o limite desta operação.",
      );
    throw unavailable();
  }
}
