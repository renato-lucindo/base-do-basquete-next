import { z } from "zod";
import { sessionName } from "../access/cookie";
import { HttpError, jsonResponse } from "./http";
import type { Json } from "./database.types";
import { disputeStatusSchema } from "../competition/administration-contract";

const uuid = z.uuid();
export async function publicReadTransport(request: Request, env: Env) {
  const value = request.headers.get("X-Dispute-Preview");
  if (value === null) return undefined;
  const dispute = uuid.safeParse(value);
  if (!dispute.success)
    throw new HttpError(400, "invalid_preview", "Disputa de teste inválida.");
  const name = await sessionName(request, env.SESSION_ENCRYPTION_KEY);
  if (!name)
    throw new HttpError(401, "invalid_session", "Entre para abrir a prévia.");
  const session = env.SESSIONS.getByName(name);
  return async (endpoint: string, init: RequestInit) => {
    const url = new URL(endpoint);
    if (url.origin !== new URL(env.SUPABASE_URL).origin)
      throw new Error("Invalid data source.");
    const operation = url.pathname.split("/").at(-1) ?? "";
    let args: Json;
    if (
      url.pathname.startsWith("/rest/v1/rpc/") &&
      typeof init.body === "string"
    ) {
      args = JSON.parse(init.body) as Json;
    } else if (
      operation === "published_player_games" ||
      operation === "published_player_profiles"
    ) {
      args = { term: url.searchParams.get("or")?.split("*")[1] ?? "" };
    } else {
      throw new Error("Invalid test preview read.");
    }
    const result = await session.readTestDispute(
      dispute.data,
      operation,
      JSON.stringify(args),
    );
    return result.ok
      ? new Response(result.value, {
          headers: { "Content-Type": "application/json" },
        })
      : Response.json(
          { code: result.code, message: result.message },
          { status: result.status },
        );
  };
}

export async function publicDisputeStatusRoute(
  request: Request,
  env: Env,
  url: URL,
) {
  const id = uuid.safeParse(url.pathname.split("/").at(-1));
  if (request.method !== "GET" || !id.success || url.search)
    throw new HttpError(400, "invalid_input", "Disputa inválida.");
  const send = (await publicReadTransport(request, env)) ?? fetch;
  const response = await send(
    env.SUPABASE_URL + "/rest/v1/rpc/get_public_dispute_status",
    {
      method: "POST",
      headers: {
        apikey: env.SUPABASE_PUBLISHABLE_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_dispute_id: id.data }),
      signal: AbortSignal.timeout(8000),
    },
  );
  if (!response.ok)
    throw new HttpError(503, "unavailable", "Situação indisponível.");
  return jsonResponse(
    disputeStatusSchema.nullable().parse(await response.json()),
  );
}
