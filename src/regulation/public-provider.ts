import { z } from "zod";
import { providerJson, forbidden, unavailable } from "../access/provider";
import { invalidSession } from "../access/vault";
import { HttpError } from "../server/http";
import { publicStandingsSourceSchema } from "./public-contract";
import { buildPublicStandings } from "./public";
import {
  confirmStandingsSchema,
  standingsPublicationPreviewSchema,
  standingsPublicationResultSchema,
  publicDisputeSchema,
  type ConfirmStandings,
} from "./publication-contract";

/** No private context is requested by the anonymous reader. */
export class SupabasePublicStandings {
  constructor(
    private config: { url: string; key: string },
    private send: (url: string, init: RequestInit) => Promise<Response> = (
      url,
      init,
    ) => fetch(url, init),
  ) {}
  private async rpc(
    name:
      | "preview_public_standings"
      | "confirm_public_standings"
      | "get_public_standings"
      | "list_public_disputes",
    args: object,
    token?: string,
  ) {
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
          "public_scope_conflict",
          "O regulamento ou as fontes mudaram. Confira uma nova prévia antes de publicar.",
        );
      if (response.status === 404)
        throw new HttpError(
          404,
          "context_not_found",
          "Disputa não encontrada.",
        );
      throw unavailable();
    }
    return providerJson(response, 20971520);
  }
  async preview(token: string, disputeId: string) {
    disputeId = z.uuid().parse(disputeId);
    const p = standingsPublicationPreviewSchema.safeParse(
      await this.rpc(
        "preview_public_standings",
        { p_dispute_id: disputeId },
        token,
      ),
    );
    if (!p.success || p.data.source.disputeId !== disputeId)
      throw unavailable();
    try {
      buildPublicStandings(p.data.source);
    } catch {
      throw unavailable();
    }
    return p.data;
  }
  async confirm(token: string, input: ConfirmStandings) {
    const c = confirmStandingsSchema.parse(input);
    // Replays reach the durable SQL receipt; never replace a lost ACK with a new command.
    const r = standingsPublicationResultSchema.safeParse(
      await this.rpc("confirm_public_standings", { p_command: c }, token),
    );
    if (
      !r.success ||
      r.data.commandId !== c.commandId ||
      r.data.disputeId !== c.disputeId ||
      r.data.publicationVersion !== c.expectedPublicationVersion + 1
    )
      throw unavailable();
    return r.data;
  }
  async get(disputeId: string) {
    const s = publicStandingsSourceSchema.nullable().safeParse(
      await this.rpc("get_public_standings", {
        p_dispute_id: z.uuid().parse(disputeId),
      }),
    );
    if (!s.success || (s.data && s.data.disputeId !== disputeId))
      throw unavailable();
    if (!s.data) return null;
    try {
      return buildPublicStandings(s.data);
    } catch {
      throw unavailable();
    }
  }
  async disputes(disputeId: string | null) {
    const s = z
      .array(publicDisputeSchema)
      .max(1000)
      .safeParse(
        await this.rpc("list_public_disputes", { p_dispute_id: disputeId }),
      );
    if (
      !s.success ||
      new Set(s.data.map((d) => d.disputeId)).size !== s.data.length ||
      s.data.some((d) => disputeId && d.disputeId !== disputeId)
    )
      throw unavailable();
    return s.data;
  }
}
