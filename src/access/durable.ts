import { DurableObject } from "cloudflare:workers";
import { HttpError } from "../server/http";
import { SupabaseAccess, type Credentials } from "./provider";
import { PersistentSession, type SessionRecord } from "./session";
import { SupabaseCompetitions } from "../competition/provider";
import { SupabaseTeams } from "../teams/provider";
import {
  saveTeamSchema,
  saveRegistrationSchema,
  type SaveTeam,
  type SaveRegistration,
} from "../teams/contract";
import {
  saveCompetitionSchema,
  type SaveCompetition,
} from "../competition/contract";

type RpcResult<T> =
  | { ok: true; value: T }
  | { ok: false; status: number; code: string; message: string };

export class SessionStore extends DurableObject<Env> {
  private readonly session: PersistentSession;
  private readonly competitions: SupabaseCompetitions;
  private readonly teams: SupabaseTeams;
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.teams = new SupabaseTeams({
      url: env.SUPABASE_URL,
      key: env.SUPABASE_PUBLISHABLE_KEY,
    });
    this.competitions = new SupabaseCompetitions({
      url: env.SUPABASE_URL,
      key: env.SUPABASE_PUBLISHABLE_KEY,
    });
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
  listCompetitions(query: string, offset: number) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.competitions.list(accessToken, query, offset),
      ),
    );
  }
  getCompetition(id: string) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.competitions.get(accessToken, id),
      ),
    );
  }
  saveCompetition(command: SaveCompetition) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.competitions.save(
          accessToken,
          saveCompetitionSchema.parse(command),
        ),
      ),
    );
  }

  async alarm() {
    const record = await this.ctx.storage.get<SessionRecord>("session");
    if (record && record.expiresAt > Date.now())
      await this.ctx.storage.setAlarm(record.expiresAt);
    else await this.session.close();
  }

  listTeams(query: string, offset: number) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.teams.teams(accessToken, query, offset),
      ),
    );
  }
  listRegistrations(disputeId: string, query: string, offset: number) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.teams.registrations(accessToken, disputeId, query, offset),
      ),
    );
  }
  getTeam(id: string) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.teams.getTeam(accessToken, id),
      ),
    );
  }
  getRegistration(id: string) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.teams.getRegistration(accessToken, id),
      ),
    );
  }
  saveTeam(command: SaveTeam) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.teams.saveTeam(accessToken, saveTeamSchema.parse(command)),
      ),
    );
  }
  saveRegistration(command: SaveRegistration) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.teams.saveRegistration(
          accessToken,
          saveRegistrationSchema.parse(command),
        ),
      ),
    );
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
