import { z } from "zod";
import { providerJson, unavailable, forbidden } from "../access/provider";
import { invalidSession } from "../access/vault";
import { HttpError } from "../server/http";
import {
  buildCompetitionDefinition,
  competitionSetupSchema,
  defaultCompetitionSetup,
} from "./format";
import {
  regulationDefinitionSchema,
  previewRegulationDefinition,
} from "./persistence-contract";
import {
  competitionSetupStateSchema,
  competitionSetupViewSchema,
  saveCompetitionSetupSchema,
  competitionSetupResultSchema,
  type SaveCompetitionSetup,
} from "./setup-contract";
import { publicStandingsSourceSchema } from "./public-contract";
import { publicDisputeSchema } from "./publication-contract";
import { buildPublicStandings } from "./public";

export const liveCompetitionSourceSchema = z
  .object(publicStandingsSourceSchema.shape)
  .omit({
    schemaVersion: true,
    definition: true,
    organizationPendingGameIds: true,
  })
  .extend({
    configuration: competitionSetupSchema.nullable(),
    legacyDefinition: regulationDefinitionSchema.nullable(),
  })
  .strict();
export async function buildLivePublicStandings(input: unknown) {
  const source = liveCompetitionSourceSchema.parse(input),
    document =
      source.configuration ??
      (source.legacyDefinition
        ? {
            ...defaultCompetitionSetup(),
            mode: "custom" as const,
            customDefinition: source.legacyDefinition,
          }
        : defaultCompetitionSetup());
  // The public game list excludes private drafts. Remove stale private game
  // assignments from this read-only projection, not from the admin document.
  const publicGameIds = new Set(source.games.map((game) => game.id));
  const publicDocument = {
    ...document,
    assignments: document.assignments.filter(({ gameId }) =>
      publicGameIds.has(gameId),
    ),
  };
  const built = await buildCompetitionDefinition(
    source.disputeId,
    publicDocument,
    {
      registrationIds: source.registrations.map((r) => r.id),
      games: source.games,
    },
  );
  const definition = { ...built.definition };
  delete definition.tieNotes;
  delete definition.customReason;
  const { configuration, legacyDefinition, ...publicSource } = source;
  void configuration;
  void legacyDefinition;
  return buildPublicStandings(
    publicStandingsSourceSchema.parse({
      ...publicSource,
      schemaVersion: "public-standings-source-v1",
      definition,
      organizationPendingGameIds: built.organizationPendingGameIds,
    }),
  );
}
type Rpc =
  | "get_competition_setup"
  | "save_competition_setup"
  | "get_live_competition_source"
  | "list_live_competition_disputes";
export class SupabaseCompetitionSetups {
  constructor(
    private config: { url: string; key: string },
    private send: (url: string, init: RequestInit) => Promise<Response> = (
      url,
      init,
    ) => fetch(url, init),
  ) {}
  private async rpc<T>(
    name: Rpc,
    args: object,
    schema: z.ZodType<T>,
    token?: string,
  ): Promise<T> {
    let response: Response;
    try {
      response = await this.send(`${this.config.url}/rest/v1/rpc/${name}`, {
        method: "POST",
        headers: {
          apikey: this.config.key,
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(args),
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      throw unavailable();
    }
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      if (response.status === 401) throw invalidSession();
      if (response.status === 403) throw forbidden();
      if (response.status === 409)
        throw new HttpError(
          409,
          "setup_conflict",
          "Os dados mudaram. Recarregue para conferir, preservando sua edição.",
        );
      if (response.status === 400)
        throw new HttpError(
          400,
          "invalid_setup",
          "Revise as equipes, jogos e regras desta disputa.",
        );
      if (response.status === 404)
        throw new HttpError(
          404,
          "context_not_found",
          "Disputa não encontrada.",
        );
      throw unavailable();
    }
    const result = schema.safeParse(await providerJson(response, 20971520));
    if (!result.success) throw unavailable();
    return result.data;
  }
  async get(token: string, disputeId: string) {
    const state = await this.rpc(
      "get_competition_setup",
      { p_dispute_id: z.uuid().parse(disputeId) },
      competitionSetupStateSchema,
      token,
    );
    if (state.disputeId !== disputeId) throw unavailable();
    const document =
      state.document ??
      (state.legacyDefinition
        ? {
            ...defaultCompetitionSetup(),
            mode: "custom" as const,
            customDefinition: state.legacyDefinition,
          }
        : defaultCompetitionSetup());
    const built = await buildCompetitionDefinition(disputeId, document, {
        registrationIds: state.context.registrationIds,
        games: state.games,
      }),
      rawProjection = previewRegulationDefinition(
        built.definition,
        state.context,
        disputeId,
        Math.max(1, state.version),
      ),
      projection = {
        algorithmVersion: rawProjection.algorithmVersion,
        status: rawProjection.status,
        disputeId: rawProjection.disputeId,
        regulationVersion: rawProjection.regulationVersion,
        groupPhases: rawProjection.groupPhases,
        series: rawProjection.series,
        lineage: rawProjection.lineage,
      };
    return competitionSetupViewSchema.parse({
      disputeId,
      version: state.version,
      savedAt: state.savedAt,
      legacyRegulationVersion: state.legacyRegulationVersion,
      document,
      contextFingerprint: state.contextFingerprint,
      registrations: state.registrations,
      games: state.games,
      history: state.history,
      ...built,
      projection,
    });
  }
  async save(token: string, input: SaveCompetitionSetup) {
    const command = saveCompetitionSetupSchema.parse(input);
    const r = await this.rpc(
      "save_competition_setup",
      { p_command: command },
      competitionSetupResultSchema,
      token,
    );
    if (
      r.commandId !== command.commandId ||
      r.disputeId !== command.disputeId ||
      r.version !== command.expectedVersion + 1
    )
      throw unavailable();
    return r;
  }
  async publicStandings(disputeId: string) {
    const source = await this.rpc(
      "get_live_competition_source",
      { p_dispute_id: z.uuid().parse(disputeId) },
      liveCompetitionSourceSchema.nullable(),
    );
    if (source && source.disputeId !== disputeId) throw unavailable();
    return source ? buildLivePublicStandings(source) : null;
  }
  async disputes(disputeId: string | null) {
    const rows = await this.rpc(
      "list_live_competition_disputes",
      { p_dispute_id: disputeId ? z.uuid().parse(disputeId) : null },
      z.array(publicDisputeSchema).max(1000),
    );
    if (
      new Set(rows.map((r) => r.disputeId)).size !== rows.length ||
      rows.some((r) => disputeId && r.disputeId !== disputeId)
    )
      throw unavailable();
    return rows;
  }
}
