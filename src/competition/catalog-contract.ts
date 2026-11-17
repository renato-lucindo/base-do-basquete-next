import { z } from "zod";
import {
  disputeAdministrationSchema,
  disputeStatusSchema,
} from "./administration-contract";

export const disputeListQuerySchema = z
  .object({
    q: z.string().trim().max(120).default(""),
    year: z.number().int().min(1).max(9999).nullable().default(null),
    championshipIds: z.array(z.uuid()).default([]),
    gender: z.enum(["masculino", "feminino"]).nullable().default(null),
    status: disputeStatusSchema.nullable().default(null),
    visibility: z.enum(["public", "private", "test"]).nullable().default(null),
    recent: z.boolean().default(false),
    sort: z
      .enum([
        "championship",
        "year",
        "category",
        "gender",
        "division",
        "status",
        "visibility",
      ])
      .default("year"),
    direction: z.enum(["asc", "desc"]).default("desc"),
    offset: z.number().int().min(0).max(100000).default(0),
  })
  .strict();
export const disputeListRowSchema = z
  .object({
    competitionId: z.uuid(),
    seasonId: z.uuid(),
    name: z.string(),
    year: z.number().int(),
    gender: z.enum(["masculino", "feminino"]),
    category: z.string(),
    division: z.string().nullable(),
    administration: disputeAdministrationSchema,
  })
  .strict();
const championshipOptionSchema = z
  .object({ id: z.uuid(), name: z.string() })
  .strict();
export type ChampionshipOption = z.infer<typeof championshipOptionSchema>;

export const disputeListPageSchema = z
  .object({
    items: z.array(disputeListRowSchema).max(25),
    total: z.number().int().nonnegative(),
    hasMore: z.boolean(),
    years: z.array(z.number().int()),
    championships: z.array(championshipOptionSchema),
  })
  .strict();
export type DisputeListQuery = z.infer<typeof disputeListQuerySchema>;
export type DisputeListRow = z.infer<typeof disputeListRowSchema>;
