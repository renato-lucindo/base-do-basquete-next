import { z } from "zod";
import type { Database } from "../server/database.types";
import { HttpError } from "../server/http";
import { forbidden, providerJson, unavailable } from "../access/provider";
import { invalidSession } from "../access/vault";
import {
  confirmPlayerProfileSchema,
  playerProfileAckSchema,
  playerProfileProposalSchema,
  playerProfileStateSchema,
  playerProfileVersionSchema,
  playerProfileWorkspaceSchema,
} from "./contract";
import { parseProfileQuery } from "./query-contract";
import { buildPlayerProfile } from "./domain";

type Functions = Database["public"]["Functions"];
type Rpc =
  | "get_player_career_source"
  | "get_player_profile_proposal"
  | "get_player_profile_state"
  | "get_player_profile_version"
  | "confirm_player_profile";
type Send = (url: string, init: RequestInit) => Promise<Response>;
const bad = () =>
  new HttpError(
    400,
    "invalid_input",
    "Confira a identidade, as versões e a confirmação dos dados públicos.",
  );
const uuid = (value: string) => {
  const p = z
    .uuid()
    .transform((v) => v.toLowerCase())
    .safeParse(value);
  if (!p.success) throw bad();
  return p.data;
};
export class SupabasePlayerProfiles {
  constructor(
    private readonly config: { url: string; key: string },
    private readonly send: Send = (url, init) => fetch(url, init),
  ) {}
  async getPage(id: string, params: URLSearchParams) {
    id = uuid(id);
    let query;
    try {
      query = parseProfileQuery(params);
    } catch {
      throw bad();
    }
    const body = await this.request("get_player_career_source", {
      p_person_id: id,
    });
    if (body === null) return null;
    try {
      const page = buildPlayerProfile(body, query);
      if (page.personId !== id) throw unavailable();
      return page;
    } catch {
      throw unavailable();
    }
  }
  async getWorkspace(token: string, id: string, offset = 0) {
    id = uuid(id);
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100000)
      throw bad();
    const state = await this.checked(
      playerProfileStateSchema,
      "get_player_profile_state",
      { p_person_id: id, p_offset: offset },
      token,
    );
    const proposal = await this.checked(
      playerProfileProposalSchema,
      "get_player_profile_proposal",
      { p_person_id: id },
      token,
    );
    const r = playerProfileWorkspaceSchema.safeParse({ state, proposal });
    if (!r.success || r.data.state.personId !== id) throw unavailable();
    return r.data;
  }
  async getVersion(token: string, id: string, version: number) {
    id = uuid(id);
    if (!Number.isSafeInteger(version) || version < 1 || version > 2147483647)
      throw bad();
    const v = await this.checked(
      playerProfileVersionSchema,
      "get_player_profile_version",
      { p_person_id: id, p_version: version },
      token,
    );
    if (v.personId !== id || v.version !== version) throw unavailable();
    return v;
  }
  async confirm(token: string, input: unknown) {
    const p = confirmPlayerProfileSchema.safeParse(input);
    if (!p.success) throw bad();
    const c = p.data;
    const ack = await this.checked(
      playerProfileAckSchema,
      "confirm_player_profile",
      { p_command: c },
      token,
    );
    if (
      ack.personId !== c.personId ||
      ack.commandId !== c.commandId ||
      ack.personVersion !== c.expectedPersonVersion ||
      ack.version !== c.expectedPublicationVersion + 1
    )
      throw unavailable();
    return ack;
  }
  private async checked<T, N extends Rpc>(
    schema: z.ZodType<T>,
    name: N,
    args: Functions[N]["Args"],
    token: string,
  ): Promise<T> {
    const body = await this.request(name, args, token);
    if (body === null)
      throw new HttpError(
        404,
        "context_not_found",
        "Perfil ou versão não encontrado.",
      );
    const result = schema.safeParse(body);
    if (!result.success) throw unavailable();
    return result.data;
  }
  private async request<N extends Rpc>(
    name: N,
    args: Functions[N]["Args"],
    token?: string,
  ): Promise<unknown> {
    const publicRead = name === "get_player_career_source";
    if (!publicRead && !token) throw invalidSession();
    let response: Response;
    try {
      response = await this.send(`${this.config.url}/rest/v1/rpc/${name}`, {
        method: "POST",
        headers: {
          apikey: this.config.key,
          "Content-Type": "application/json",
          ...(!publicRead ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(args),
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      throw unavailable();
    }
    if (response.ok)
      return providerJson(response, publicRead ? 5 * 1024 * 1024 : 1048576);
    if (!publicRead && response.status === 409) {
      const error = z
        .object({
          message: z.enum([
            "idempotency_conflict",
            "version_conflict",
            "profile_version_limit",
          ]),
        })
        .safeParse(await providerJson(response));
      const code = error.success ? error.data.message : "version_conflict";
      throw new HttpError(
        409,
        code,
        code === "idempotency_conflict"
          ? "Este envio já foi usado com outros dados. Confira o estado salvo."
          : "O cadastro ou a publicação mudou. Atualize e confira antes de confirmar.",
      );
    }
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
        "player_source_too_large",
        "O histórico excede o limite desta consulta. Os dados publicados foram preservados.",
      );
    if (!publicRead) {
      if (response.status === 401) throw invalidSession();
      if (response.status === 403) throw forbidden();
      if (response.status === 400) throw bad();
      if (response.status === 404)
        throw new HttpError(
          404,
          "context_not_found",
          "Perfil ou versão não encontrado.",
        );
    }
    throw unavailable();
  }
}
