import { DurableObject } from "cloudflare:workers";
import { HttpError } from "../server/http";
import { SupabaseAccess, type Credentials } from "./provider";
import { PersistentSession, type SessionRecord } from "./session";

type RpcResult<T> =
  | { ok: true; value: T }
  | { ok: false; status: number; code: string; message: string };

export class SessionStore extends DurableObject<Env> {
  private readonly session: PersistentSession;
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.session = new PersistentSession(
      {
        read: () => ctx.storage.get<SessionRecord>("session"),
        save: async (record) => {
          await ctx.storage.put("session", record);
          await ctx.storage.setAlarm(record.expiresAt);
        },
        clear: async () => {
          await ctx.storage.deleteAlarm();
          await ctx.storage.deleteAll();
        },
      },
      new SupabaseAccess({
        url: env.SUPABASE_URL,
        key: env.SUPABASE_PUBLISHABLE_KEY,
      }),
      env.SESSION_ENCRYPTION_KEY,
    );
  }

  create(credentials: Credentials) {
    return safely(() => this.session.create(credentials));
  }
  actor() {
    return safely(() => this.session.actor());
  }
  close() {
    return safely(() => this.session.close());
  }

  async alarm() {
    const record = await this.ctx.storage.get<SessionRecord>("session");
    if (record && record.expiresAt > Date.now())
      await this.ctx.storage.setAlarm(record.expiresAt);
    else await this.session.close();
  }
}

async function safely<T>(operation: () => Promise<T>): Promise<RpcResult<T>> {
  try {
    return { ok: true, value: await operation() };
  } catch (error) {
    if (error instanceof HttpError)
      return {
        ok: false,
        status: error.status,
        code: error.code,
        message: error.message,
      };
    return {
      ok: false,
      status: 503,
      code: "access_unavailable",
      message: "O acesso está indisponível no momento. Tente novamente.",
    };
  }
}
