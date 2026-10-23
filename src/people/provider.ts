import { z } from "zod";
import { forbidden, providerJson, unavailable } from "../access/provider";
import { invalidSession } from "../access/vault";
import { HttpError } from "../server/http";
import type { Database } from "../server/database.types";
import { saveResultSchema } from "../competition/contract";
import {
  personListingSchema,
  personSnapshotSchema,
  type SavePerson,
} from "./contract";
import {
  rosterListingSchema,
  rosterSnapshotSchema,
  type SaveRoster,
} from "./roster-contract";
import {
  staffListingSchema,
  staffSnapshotSchema,
  type SaveStaff,
} from "./staff-contract";
type Functions = Database["public"]["Functions"];
type Send = (url: string, init: RequestInit) => Promise<Response>;
export class SupabasePeople {
  constructor(
    private readonly config: { url: string; key: string },
    private readonly send: Send = (url, init) => fetch(url, init),
  ) {}
  listPersons(
    token: string,
    query: string,
    kind: "all" | "athlete" | "coach",
    offset: number,
  ) {
    return this.checked(
      personListingSchema,
      "list_persons",
      { p_query: query, p_kind: kind, p_offset: offset },
      token,
    );
  }
  getPerson(token: string, id: string) {
    return this.checked(
      personSnapshotSchema,
      "get_person",
      { p_id: id },
      token,
    );
  }
  savePerson(token: string, command: SavePerson) {
    return this.checked(
      saveResultSchema,
      "save_person",
      { p_command: command },
      token,
    );
  }
  listRoster(
    token: string,
    registrationId: string,
    activeOnly: boolean,
    offset: number,
  ) {
    return this.checked(
      rosterListingSchema,
      "list_roster",
      {
        p_registration_id: registrationId,
        p_active_only: activeOnly,
        p_offset: offset,
      },
      token,
    );
  }
  getRoster(token: string, id: string) {
    return this.checked(
      rosterSnapshotSchema,
      "get_roster_entry",
      { p_id: id },
      token,
    );
  }
  saveRoster(token: string, command: SaveRoster) {
    return this.checked(
      saveResultSchema,
      "save_roster_entry",
      { p_command: command },
      token,
    );
  }
  listStaff(
    token: string,
    registrationId: string,
    activeOnly: boolean,
    offset: number,
  ) {
    return this.checked(
      staffListingSchema,
      "list_staff",
      {
        p_registration_id: registrationId,
        p_active_only: activeOnly,
        p_offset: offset,
      },
      token,
    );
  }
  getStaff(token: string, id: string) {
    return this.checked(
      staffSnapshotSchema,
      "get_staff_entry",
      { p_id: id },
      token,
    );
  }
  saveStaff(token: string, command: SaveStaff) {
    return this.checked(
      saveResultSchema,
      "save_staff_entry",
      { p_command: command },
      token,
    );
  }
  private async checked<T, N extends keyof Functions>(
    schema: z.ZodType<T>,
    name: N,
    args: Functions[N]["Args"],
    token: string,
  ): Promise<T> {
    let response: Response;
    try {
      response = await this.send(`${this.config.url}/rest/v1/rpc/${name}`, {
        method: "POST",
        headers: {
          apikey: this.config.key,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(args),
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      throw unavailable();
    }
    if (response.ok) {
      const body = await providerJson(response, 1048576);
      if (body === null)
        throw new HttpError(
          404,
          "context_not_found",
          "Pessoa ou vínculo não encontrado.",
        );
      const result = schema.safeParse(body);
      if (!result.success) throw unavailable();
      return result.data;
    }
    if (response.status === 409) {
      const parsed = z
        .object({
          message: z.enum([
            "identity_confirmation_required",
            "idempotency_conflict",
            "version_conflict",
          ]),
        })
        .safeParse(await providerJson(response));
      const code = parsed.success ? parsed.data.message : "version_conflict";
      const messages = {
        identity_confirmation_required:
          "Já existe pessoa com este nome. Se for outra pessoa, confirme a nova identidade.",
        idempotency_conflict:
          "Este envio já foi usado com outros dados. Recarregue para continuar.",
        version_conflict:
          "O cadastro foi alterado em outra sessão. Recarregue antes de salvar.",
      };
      throw new HttpError(409, code, messages[code]);
    }
    await response.body?.cancel().catch(() => undefined);
    if (response.status === 401) throw invalidSession();
    if (response.status === 403) throw forbidden();
    if (response.status === 400)
      throw new HttpError(
        400,
        "invalid_input",
        "Revise os dados e o destino. Camisa e vínculo ativo não podem se repetir; sexo deve ser compatível com o naipe e papéis salvos são preservados.",
      );
    throw unavailable();
  }
}
