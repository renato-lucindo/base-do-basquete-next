import { z } from "zod";
import { HttpError } from "../server/http";
import { unavailable } from "../access/provider";
import {
  readPublicStatisticsSource,
  type PublicStatisticsConfig,
  type PublicStatisticsSend,
} from "../statistics/source-provider";
import { buildTeamsPage, TeamCapacityError } from "./domain";
import { buildTeamDetail } from "./detail";
import { parseTeamsQuery } from "./query-contract";
import { parseTeamDetailQuery } from "./detail-query";
const uuid = (s: string) => {
  const p = z.uuid().safeParse(s);
  if (!p.success)
    throw new HttpError(
      400,
      "invalid_input",
      "Confira a disputa, a equipe e a inscrição.",
    );
  return p.data.toLowerCase();
};
function domainFailure(e: unknown): never {
  if (e instanceof TeamCapacityError)
    throw new HttpError(413, "source_capacity", e.message);
  throw unavailable();
}
export class SupabaseTeamStatistics {
  constructor(
    private readonly config: PublicStatisticsConfig,
    private readonly send: PublicStatisticsSend = (url, init) =>
      fetch(url, init),
  ) {}
  async getPage(id: string, params: URLSearchParams) {
    id = uuid(id);
    const query = parseTeamsQuery(params),
      source = await readPublicStatisticsSource(this.config, this.send, id);
    if (source === null) return null;
    try {
      const p = buildTeamsPage(source, query);
      if (p.disputeId !== id) throw unavailable();
      return p;
    } catch (e) {
      return domainFailure(e);
    }
  }
  async getDetail(
    id: string,
    teamId: string,
    registrationId: string | null,
    params: URLSearchParams,
  ) {
    id = uuid(id);
    teamId = uuid(teamId);
    if (registrationId !== null) registrationId = uuid(registrationId);
    const query = parseTeamDetailQuery(params),
      source = await readPublicStatisticsSource(this.config, this.send, id);
    if (source === null) return null;
    try {
      const p = buildTeamDetail(source, teamId, registrationId, query);
      const listDispute = z
        .object({ disputeId: z.uuid().transform((v) => v.toLowerCase()) })
        .parse(source).disputeId;
      if (
        listDispute !== id ||
        (p !== null &&
          (p.disputeId !== id ||
            p.teamId !== teamId ||
            ("registrationId" in p &&
              registrationId !== null &&
              p.registrationId !== registrationId)))
      )
        throw unavailable();
      return p;
    } catch (e) {
      return domainFailure(e);
    }
  }
}
