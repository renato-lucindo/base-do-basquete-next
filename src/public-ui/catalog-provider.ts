import { z } from "zod";
import { providerJson, unavailable } from "../access/provider";
import { publicGameSchema } from "../publication/contract";
import { catalogGameSchema, searchPlayerSchema } from "./catalog-contract";

type Config = { url: string; key: string };
type Send = (url: string, init: RequestInit) => Promise<Response>;
const uuid = z.uuid();
/** Fixed projections over existing anonymous, RLS protected publication tables only. */
export class PublicCatalog {
  constructor(
    private config: Config,
    private send: Send = (url, init) => fetch(url, init),
  ) {}
  private async read(table: string, params: URLSearchParams) {
    let response: Response;
    try {
      response = await this.send(
        `${this.config.url}/rest/v1/${table}?${params}`,
        {
          headers: { apikey: this.config.key },
          signal: AbortSignal.timeout(8000),
        },
      );
    } catch {
      throw unavailable();
    }
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      throw unavailable();
    }
    return providerJson(response, 1024 * 1024);
  }
  async page(disputeId: string | null, after: string | null) {
    const p = new URLSearchParams({
      select:
        "id:game_id,disputeId:dispute_id,context:snapshot->context,game:snapshot->game,home:snapshot->facts->teams->home->points,away:snapshot->facts->teams->away->points",
      order: "game_id.asc",
      limit: "100",
    });
    if (disputeId) p.set("dispute_id", `eq.${uuid.parse(disputeId)}`);
    if (after) p.set("game_id", `gt.${uuid.parse(after)}`);
    const raw = z
      .array(
        catalogGameSchema
          .omit({ score: true })
          .extend({
            home: z.number().int().nonnegative(),
            away: z.number().int().nonnegative(),
          })
          .strict(),
      )
      .max(100)
      .safeParse(await this.read("published_games", p));
    if (!raw.success) throw unavailable();
    let previous = after;
    for (const row of raw.data) {
      if (
        (previous && row.id <= previous) ||
        (disputeId && row.disputeId !== disputeId)
      )
        throw unavailable();
      previous = row.id;
    }
    return {
      games: raw.data.map(({ home, away, ...row }) => ({
        ...row,
        score: { home, away },
      })),
      next: raw.data.length === 100 ? previous : null,
    };
  }
  async players(query: string) {
    // Strip PostgREST grammar and wildcards; never interpolate caller filter syntax.
    const term = query.replace(/[^\p{L}\p{N} '-]/gu, " ").trim();
    if (term.length < 2) return { players: [], hasMore: false };
    const [participations, profiles] = await Promise.all([
      this.read(
        "published_player_games",
        new URLSearchParams({
          select: "person:snapshot->fact->person,disputeId:dispute_id",
          or: `(snapshot->fact->person->>name.ilike.*${term}*,snapshot->fact->person->>nickname.ilike.*${term}*)`,
          order: "person_id.asc,game_id.asc",
          limit: "50",
        }),
      ),
      this.read(
        "published_player_profiles",
        new URLSearchParams({
          select:
            "id:snapshot->person->id,name:snapshot->person->name,nickname:snapshot->person->nickname",
          or: `(snapshot->person->>name.ilike.*${term}*,snapshot->person->>nickname.ilike.*${term}*)`,
          order: "person_id.asc",
          limit: "50",
        }),
      ),
    ]);
    const a = z.array(searchPlayerSchema).max(50).safeParse(participations);
    const b = z
      .array(publicGameSchema.shape.facts.shape.players.element.shape.person)
      .max(50)
      .safeParse(profiles);
    if (!a.success || !b.success) throw unavailable();
    const players = [
      ...a.data,
      ...b.data.map(({ id, name, nickname }) => ({
        person: { id, name, nickname },
        disputeId: null,
      })),
    ];
    return {
      players: [
        ...new Map(
          players.map((p) => [`${p.person.id}/${p.disputeId}`, p]),
        ).values(),
      ],
      hasMore: a.data.length === 50 || b.data.length === 50,
    };
  }
}
