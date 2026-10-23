import { SupabasePeople } from "../people/provider";
import { SupabaseTextImport } from "../text-import/provider";
import {
  saveTextReviewSchema,
  confirmTextRowSchema,
  prepareTextTargetSchema,
  type SaveTextReview,
  type ConfirmTextRow,
  type PrepareTextTarget,
} from "../text-import/contract";
import {
  matchingRequestSchema,
  type MatchingRequest,
} from "../text-import/matching-contract";
import { savePersonSchema, type SavePerson } from "../people/contract";
import { saveRosterSchema, type SaveRoster } from "../people/roster-contract";
import { saveStaffSchema, type SaveStaff } from "../people/staff-contract";
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
  private readonly people: SupabasePeople;
  private readonly textImport: SupabaseTextImport;
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.textImport = new SupabaseTextImport({
      url: env.SUPABASE_URL,
      key: env.SUPABASE_PUBLISHABLE_KEY,
    });
    this.people = new SupabasePeople({
      url: env.SUPABASE_URL,
      key: env.SUPABASE_PUBLISHABLE_KEY,
    });
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

  listPersons(
    query: string,
    kind: "all" | "athlete" | "coach",
    offset: number,
  ) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.people.listPersons(accessToken, query, kind, offset),
      ),
    );
  }
  getPerson(id: string) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.people.getPerson(accessToken, id),
      ),
    );
  }
  savePerson(command: SavePerson) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.people.savePerson(accessToken, savePersonSchema.parse(command)),
      ),
    );
  }
  listRoster(registrationId: string, activeOnly: boolean, offset: number) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.people.listRoster(accessToken, registrationId, activeOnly, offset),
      ),
    );
  }
  getRoster(id: string) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.people.getRoster(accessToken, id),
      ),
    );
  }
  saveRoster(command: SaveRoster) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.people.saveRoster(accessToken, saveRosterSchema.parse(command)),
      ),
    );
  }
  listStaff(registrationId: string, activeOnly: boolean, offset: number) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.people.listStaff(accessToken, registrationId, activeOnly, offset),
      ),
    );
  }
  getStaff(id: string) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.people.getStaff(accessToken, id),
      ),
    );
  }
  saveStaff(command: SaveStaff) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.people.saveStaff(accessToken, saveStaffSchema.parse(command)),
      ),
    );
  }

  listTextReviews(disputeId: string, offset: number) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.textImport.list(accessToken, disputeId, offset),
      ),
    );
  }
  getTextReview(id: string) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.textImport.get(accessToken, id),
      ),
    );
  }
  saveTextReview(command: SaveTextReview) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.textImport.save(accessToken, saveTextReviewSchema.parse(command)),
      ),
    );
  }
  prepareTextTarget(command: PrepareTextTarget) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.textImport.prepare(
          accessToken,
          prepareTextTargetSchema.parse(command),
        ),
      ),
    );
  }
  confirmTextRow(command: ConfirmTextRow) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.textImport.confirm(
          accessToken,
          confirmTextRowSchema.parse(command),
        ),
      ),
    );
  }
  matchImportPlayers(query: MatchingRequest) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.textImport.match(accessToken, matchingRequestSchema.parse(query)),
      ),
    );
  }
  getImportPerson(
    id: string,
    disputeId: string,
    registrationId: string | null,
  ) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.textImport.person(accessToken, id, disputeId, registrationId),
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
