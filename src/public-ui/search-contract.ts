import { z } from "zod";
import { publicContextSchema } from "./catalog-contract";
export const searchTypes = ["all", "players", "teams", "competitions"] as const;
export type SearchType = (typeof searchTypes)[number];
export const foldSearch = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/\s+/gu, " ")
    .trim();
const uuid = z.uuid();
const context = z
  .object({ disputeId: uuid, context: publicContextSchema })
  .strict();
const player = z
  .object({
    kind: z.literal("players"),
    id: uuid,
    name: z.string().min(1).max(120),
    nickname: z.string().max(120).nullable(),
    disputeId: uuid.nullable(),
  })
  .strict();
const team = z
  .object({
    kind: z.literal("teams"),
    id: uuid,
    name: z.string().min(1).max(120),
    abbreviation: z.string().max(20).nullable(),
    participations: z
      .array(
        context
          .extend({
            registrationId: uuid,
            name: z.string().min(1).max(120),
            hasResults: z.boolean(),
          })
          .strict(),
      )
      .min(1)
      .max(10000),
  })
  .strict();
const competition = z
  .object({
    kind: z.literal("competitions"),
    id: uuid,
    name: z.string().min(1).max(120),
    disputes: z.array(context).min(1).max(10000),
    directDisputeId: uuid.nullable().optional(),
  })
  .strict();
export const searchHitSchema = z.discriminatedUnion("kind", [
  player,
  team,
  competition,
]);
export type SearchHit = z.infer<typeof searchHitSchema>;
export const discoveryQuerySchema = z
  .object({
    q: z
      .string()
      .trim()
      .min(2)
      .max(120)
      .refine(
        (q) =>
          q.length <= 120 &&
          foldSearch(q).length >= 2 &&
          !/[\u0000-\u001f\u007f]/u.test(q),
      ),
    type: z.enum(searchTypes).default("all"),
    page: z.number().int().min(1).max(2147483647).default(1),
    entityId: uuid.nullable().default(null),
  })
  .strict()
  .refine((q) => q.entityId === null || q.type !== "all");
export type DiscoveryQuery = z.infer<typeof discoveryQuerySchema>;
export const discoveryPageSchema = z
  .object({
    query: z.string().min(2).max(120),
    type: z.enum(searchTypes),
    entityId: uuid.nullable(),
    page: z.number().int().positive(),
    totalPages: z.number().int().positive(),
    counts: z
      .object({
        players: z.number().int().nonnegative(),
        teams: z.number().int().nonnegative(),
        competitions: z.number().int().nonnegative(),
      })
      .strict(),
    results: z.array(searchHitSchema).max(20),
  })
  .strict()
  .superRefine((r, ctx) => {
    const size = r.type === "all" ? 5 : 20,
      seen = new Set<string>();
    const bad = () =>
      ctx.addIssue({ code: "custom", message: "Busca pública inconsistente." });
    const pages = Math.max(
      1,
      ...Object.values(r.counts).map((n) => Math.ceil(n / size)),
    );
    if (
      r.page > r.totalPages ||
      r.totalPages !== pages ||
      (r.type === "all" && r.entityId !== null)
    )
      bad();
    for (const kind of searchTypes.filter((t) => t !== "all")) {
      const items = r.results.filter((i) => i.kind === kind);
      const expected = Math.max(
        0,
        Math.min(size, r.counts[kind] - (r.page - 1) * size),
      );
      if (
        items.length !== expected ||
        (r.type !== "all" && r.type !== kind && r.counts[kind] !== 0)
      )
        bad();
    }
    for (const item of r.results) {
      const key = `${item.kind}/${item.id}`;
      if (seen.has(key) || (r.entityId && item.id !== r.entityId)) bad();
      seen.add(key);
      if (
        item.kind === "competitions" &&
        item.directDisputeId &&
        !item.disputes.some((s) => s.disputeId === item.directDisputeId)
      )
        bad();
      if (item.kind !== "players") {
        const scopes =
          item.kind === "teams" ? item.participations : item.disputes;
        const keys = scopes.map(
          (s) =>
            `${s.disputeId}/${"registrationId" in s ? s.registrationId : ""}`,
        );
        if (
          new Set(keys).size !== keys.length ||
          (item.kind === "competitions" &&
            item.disputes.some((s) => s.context.championshipId !== item.id))
        )
          bad();
      }
    }
  });
export type DiscoveryPage = z.infer<typeof discoveryPageSchema>;
