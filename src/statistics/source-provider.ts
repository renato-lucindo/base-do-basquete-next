import { providerJson, unavailable } from "../access/provider";
import { HttpError } from "../server/http";
import type { Database } from "../server/database.types";
export type PublicStatisticsConfig = { url: string; key: string };
export type PublicStatisticsSend = (
  url: string,
  init: RequestInit,
) => Promise<Response>;
/** Fixed read-only RPC. Never accepts a path, user JWT, cookie or client-supplied facts. */
export async function readPublicStatisticsSource(
  config: PublicStatisticsConfig,
  send: PublicStatisticsSend,
  disputeId: string,
): Promise<unknown> {
  const args: Database["public"]["Functions"]["get_public_statistics_source"]["Args"] =
    { p_dispute_id: disputeId };
  let response: Response;
  try {
    response = await send(
      `${config.url}/rest/v1/rpc/get_public_statistics_source`,
      {
        method: "POST",
        headers: { apikey: config.key, "Content-Type": "application/json" },
        body: JSON.stringify(args),
        signal: AbortSignal.timeout(8000),
      },
    );
  } catch {
    throw unavailable();
  }
  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined);
    if (response.status === 429)
      throw new HttpError(
        429,
        "too_many_attempts",
        "Muitas consultas. Aguarde um pouco e tente novamente.",
      );
    if (response.status === 413)
      throw new HttpError(
        413,
        "source_capacity",
        "A consulta excede a capacidade de dados deste contexto.",
      );
    throw unavailable();
  }
  return providerJson(response, 5 * 1024 * 1024);
}
