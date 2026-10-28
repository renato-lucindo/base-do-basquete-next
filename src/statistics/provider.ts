import { z } from "zod";
import { unavailable } from "../access/provider";
import { HttpError } from "../server/http";
import { buildStatisticsPage, parseStatisticsQuery } from "./query";
import {
  readPublicStatisticsSource,
  type PublicStatisticsConfig,
  type PublicStatisticsSend,
} from "./source-provider";
/** Public reads use only the publishable key; user sessions never leave here. */
export class SupabaseStatistics {
  constructor(
    private readonly config: PublicStatisticsConfig,
    private readonly send: PublicStatisticsSend = (url, init) =>
      fetch(url, init),
  ) {}
  async getPage(id: string, params: URLSearchParams) {
    const parsed = z
      .uuid()
      .transform((v) => v.toLowerCase())
      .safeParse(id);
    if (!parsed.success)
      throw new HttpError(400, "invalid_input", "Disputa inválida.");
    const source = await readPublicStatisticsSource(
      this.config,
      this.send,
      parsed.data,
    );
    if (source === null) return null;
    try {
      const page = buildStatisticsPage(source, parseStatisticsQuery(params));
      if (page.disputeId !== parsed.data) throw unavailable();
      return page;
    } catch {
      throw unavailable();
    }
  }
}
