import { z } from "zod";
import { HttpError } from "../server/http";
import type { Tables } from "../server/database.types";

export type Credentials = { email: string; password: string };
export type Tokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};
export type Actor = { id: string };
export type AuthProvider = Pick<
  SupabaseAccess,
  "signIn" | "refresh" | "authorize" | "signOut"
>;
type ProviderFetch = (url: string, init?: RequestInit) => Promise<Response>;

const tokenSchema = z.object({
  access_token: z.string().min(1).max(16384),
  refresh_token: z.string().min(1).max(4096),
  expires_in: z.number().int().positive().max(86400),
});
const userSchema = z.object({
  id: z.uuid(),
  is_anonymous: z.boolean().optional(),
});
const adminSchema = z
  .array(z.object({ user_id: z.uuid(), enabled: z.boolean() }))
  .max(1) satisfies z.ZodType<
  Pick<Tables<"admin_access">, "user_id" | "enabled">[]
>;

/** No browser SDK or privileged database key: all Data API calls use user JWTs. */
export class SupabaseAccess {
  constructor(
    private readonly config: { url: string; key: string },
    private readonly send: ProviderFetch = (url, init) => fetch(url, init),
    private readonly now = Date.now,
  ) {}

  async signIn(credentials: Credentials): Promise<Tokens> {
    return this.token("password", credentials);
  }

  async refresh(refreshToken: string): Promise<Tokens> {
    return this.token("refresh_token", { refresh_token: refreshToken });
  }

  private async token(grant: string, body: object): Promise<Tokens> {
    const response = await this.request(
      `/auth/v1/token?grant_type=${grant}`,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
      401,
    );
    const parsed = tokenSchema.safeParse(await providerJson(response));
    if (!parsed.success) throw unavailable();
    return {
      accessToken: parsed.data.access_token,
      refreshToken: parsed.data.refresh_token,
      expiresAt: this.now() + parsed.data.expires_in * 1000,
    };
  }

  async authorize(accessToken: string): Promise<Actor> {
    const headers = { Authorization: `Bearer ${accessToken}` };
    const user = userSchema.safeParse(
      await providerJson(await this.request("/auth/v1/user", { headers }, 401)),
    );
    if (!user.success) throw unavailable();
    if (user.data.is_anonymous) throw forbidden();
    const rows = adminSchema.safeParse(
      await providerJson(
        await this.request(
          `/rest/v1/admin_access?select=user_id,enabled&user_id=eq.${user.data.id}`,
          { headers },
          503,
        ),
      ),
    );
    if (!rows.success) throw unavailable();
    if (
      rows.data.length !== 1 ||
      rows.data[0].user_id !== user.data.id ||
      !rows.data[0].enabled
    )
      throw forbidden();
    return { id: user.data.id };
  }

  async signOut(accessToken: string): Promise<void> {
    await this.request(
      "/auth/v1/logout?scope=local",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      },
      401,
    );
  }

  private async request(
    path: string,
    init: RequestInit,
    authFailure: number,
  ): Promise<Response> {
    let response: Response;
    try {
      response = await this.send(`${this.config.url}${path}`, {
        ...init,
        signal: AbortSignal.timeout(8000),
        headers: {
          apikey: this.config.key,
          "Content-Type": "application/json",
          ...init.headers,
        },
      });
    } catch {
      throw unavailable();
    }
    if (response.ok) return response;
    await response.body?.cancel().catch(() => undefined);
    if (response.status === 429)
      throw new HttpError(
        429,
        "too_many_attempts",
        "Muitas tentativas. Aguarde um pouco e tente novamente.",
      );
    if ([400, 401, 403].includes(response.status) && authFailure === 401)
      throw new HttpError(
        401,
        "invalid_session",
        "Não foi possível validar o acesso. Confira e-mail e senha ou entre novamente.",
      );
    throw unavailable();
  }
}

export function forbidden() {
  return new HttpError(
    403,
    "not_authorized",
    "Esta conta não tem acesso administrativo.",
  );
}

export function unavailable() {
  return new HttpError(
    503,
    "access_unavailable",
    "O acesso está indisponível no momento. Tente novamente.",
  );
}

async function providerJson(response: Response): Promise<unknown> {
  const reader = response.body?.getReader();
  if (!reader) throw unavailable();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 65536) {
        await reader.cancel().catch(() => undefined);
        throw unavailable();
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return JSON.parse(
      new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(bytes),
    );
  } catch {
    throw unavailable();
  } finally {
    reader.releaseLock();
  }
}
