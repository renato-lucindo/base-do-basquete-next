import { providerJson, unavailable } from "../access/provider";
import {
  discoveryPageSchema,
  discoveryQuerySchema,
  type DiscoveryQuery,
} from "./search-contract";
/** A single database statement searches the entire current public scope before ranking/pagination. */
export class PublicSearch {
  constructor(
    private config: { url: string; key: string },
    private send: (url: string, init: RequestInit) => Promise<Response> = (
      url,
      init,
    ) => fetch(url, init),
  ) {}
  async search(input: DiscoveryQuery, signal?: AbortSignal) {
    const q = discoveryQuerySchema.parse(input);
    let response: Response;
    try {
      response = await this.send(
        `${this.config.url}/rest/v1/rpc/search_public_entities`,
        {
          method: "POST",
          headers: {
            apikey: this.config.key,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            p_query: q.q,
            p_type: q.type,
            p_page: q.page,
            p_entity_id: q.entityId,
          }),
          signal: signal
            ? AbortSignal.any([signal, AbortSignal.timeout(8000)])
            : AbortSignal.timeout(8000),
        },
      );
    } catch {
      throw unavailable();
    }
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      throw unavailable();
    }
    const r = discoveryPageSchema.safeParse(
      await providerJson(response, 1048576),
    );
    if (
      !r.success ||
      r.data.query !== q.q ||
      r.data.type !== q.type ||
      r.data.entityId !== q.entityId ||
      r.data.page !== Math.min(q.page, r.data.totalPages)
    )
      throw unavailable();
    return r.data;
  }
}
