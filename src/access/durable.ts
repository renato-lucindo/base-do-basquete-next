import { SupabasePublications } from "../publication/provider";
import { SupabaseAchievements } from "../achievements/provider";
import {
  saveAchievementDraftSchema,
  type SaveAchievementDraft,
} from "../achievements/draft-contract";
import {
  confirmAchievementsSchema,
  type ConfirmAchievements,
} from "../achievements/publication-contract";
import { previewAchievementsSchema } from "../achievements/view-contract";
import { SupabaseRegulations } from "../regulation/provider";
import { SupabaseDecisions } from "../regulation/decision-provider";
import {
  saveGameOccurrenceSchema,
  type SaveGameOccurrence,
} from "../regulation/occurrence-contract";
import {
  saveRegistrationWithdrawalSchema,
  type SaveRegistrationWithdrawal,
} from "../regulation/withdrawal-contract";
import {
  saveRegulationSchema,
  type SaveRegulation,
} from "../regulation/persistence-contract";
import {
  previewRegulationSchema,
  type PreviewRegulation,
} from "../regulation/view-contract";
import type { PublishSheet } from "../publication/contract";
import type { PublishPdf } from "../publication/pdf-contract";
import { SupabasePeople } from "../people/provider";
import { SupabasePlayerProfiles } from "../player-profile/provider";
import {
  confirmPlayerProfileSchema,
  type ConfirmPlayerProfile,
} from "../player-profile/contract";
import { SupabaseTransfers } from "../people/transfer-provider";
import {
  saveTransferSchema,
  type SaveTransfer,
} from "../people/transfer-contract";
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
  registrationRemovalSchema,
  type RegistrationRemoval,
} from "../teams/removal-contract";
import { SupabaseGames } from "../games/provider";
import { SupabaseOfficiating } from "../games/officiating-provider";
import {
  saveGameEditorSchema,
  type SaveGameEditor,
} from "../games/officiating-contract";
import { SupabasePdfSources } from "../boxscore/provider";
import { SupabasePdfOriginals } from "../boxscore/storage";
import { extractSupportedPdf } from "../boxscore/extract";
import {
  pdfUploadMetadata,
  readPdfBody,
  badPdfInput,
} from "../boxscore/upload";
import {
  preparePdfSourceSchema,
  savePdfReviewSchema,
  type SavePdfReview,
} from "../boxscore/source-contract";
import { saveGameSchema, type SaveGame } from "../games/contract";
import { saveSheetSchema, type SaveSheet } from "../games/sheet-contract";
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
  private readonly games: SupabaseGames;
  private readonly officiating: SupabaseOfficiating;
  private readonly publications: SupabasePublications;
  private readonly regulations: SupabaseRegulations;
  private readonly decisions: SupabaseDecisions;
  private readonly pdfSources: SupabasePdfSources;
  private readonly pdfOriginals: SupabasePdfOriginals;
  private readonly people: SupabasePeople;
  private readonly playerProfiles: SupabasePlayerProfiles;
  private readonly transfers: SupabaseTransfers;
  private readonly achievements: SupabaseAchievements;
  private readonly textImport: SupabaseTextImport;
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.playerProfiles = new SupabasePlayerProfiles({
      url: env.SUPABASE_URL,
      key: env.SUPABASE_PUBLISHABLE_KEY,
    });
    this.achievements = new SupabaseAchievements({
      url: env.SUPABASE_URL,
      key: env.SUPABASE_PUBLISHABLE_KEY,
    });
    this.transfers = new SupabaseTransfers({
      url: env.SUPABASE_URL,
      key: env.SUPABASE_PUBLISHABLE_KEY,
    });
    this.decisions = new SupabaseDecisions({
      url: env.SUPABASE_URL,
      key: env.SUPABASE_PUBLISHABLE_KEY,
    });
    this.regulations = new SupabaseRegulations({
      url: env.SUPABASE_URL,
      key: env.SUPABASE_PUBLISHABLE_KEY,
    });
    this.pdfSources = new SupabasePdfSources({
      url: env.SUPABASE_URL,
      key: env.SUPABASE_PUBLISHABLE_KEY,
    });
    this.pdfOriginals = new SupabasePdfOriginals({
      url: env.SUPABASE_URL,
      key: env.SUPABASE_PUBLISHABLE_KEY,
    });
    this.publications = new SupabasePublications({
      url: env.SUPABASE_URL,
      key: env.SUPABASE_PUBLISHABLE_KEY,
    });
    this.games = new SupabaseGames({
      url: env.SUPABASE_URL,
      key: env.SUPABASE_PUBLISHABLE_KEY,
    });
    this.officiating = new SupabaseOfficiating({
      url: env.SUPABASE_URL,
      key: env.SUPABASE_PUBLISHABLE_KEY,
    });
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
      Date.now,
      (timing) =>
        console.info(
          JSON.stringify({ kind: "private_operation_timing", ...timing }),
        ),
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
  getPlayerProfileWorkspace(id: string, offset: number) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.playerProfiles.getWorkspace(accessToken, id, offset),
      ),
    );
  }
  getPlayerProfileVersion(id: string, version: number) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.playerProfiles.getVersion(accessToken, id, version),
      ),
    );
  }
  confirmPlayerProfile(command: ConfirmPlayerProfile) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.playerProfiles.confirm(
          accessToken,
          confirmPlayerProfileSchema.parse(command),
        ),
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
      this.session.runAuthorized(
        ({ accessToken }) =>
          this.people.listRoster(
            accessToken,
            registrationId,
            activeOnly,
            offset,
          ),
        "roster.list",
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
      this.session.runAuthorized(
        ({ accessToken }) => this.textImport.get(accessToken, id),
        "import.review",
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
      this.session.runAuthorized(
        ({ accessToken }) =>
          this.textImport.confirm(
            accessToken,
            confirmTextRowSchema.parse(command),
          ),
        "import.confirm",
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
  listGames(disputeId: string, query: string, offset: number) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.games.list(accessToken, disputeId, query, offset),
      ),
    );
  }
  listGameVenues(query: string, offset: number) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.games.listVenues(accessToken, query, offset),
      ),
    );
  }
  listGameOfficials(query: string, offset: number) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.officiating.list(accessToken, query, offset),
      ),
    );
  }
  getGameEditor(id: string) {
    return safely(() =>
      this.session.runAuthorized(
        ({ accessToken }) => this.officiating.get(accessToken, id),
        "game.read",
      ),
    );
  }
  saveGameEditor(command: SaveGameEditor) {
    return safely(() =>
      this.session.runAuthorized(
        ({ accessToken }) =>
          this.officiating.save(
            accessToken,
            saveGameEditorSchema.parse(command),
          ),
        "game.save",
      ),
    );
  }
  getGame(id: string) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.games.get(accessToken, id),
      ),
    );
  }
  saveGame(command: SaveGame) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.games.save(accessToken, saveGameSchema.parse(command)),
      ),
    );
  }
  getPublicationState(gameId: string, offset: number) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.publications.getState(accessToken, gameId, offset),
      ),
    );
  }
  getAchievementWorkspace(
    disputeId: string,
    draftOffset: number,
    publicationOffset: number,
  ) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.achievements.getWorkspace(
          accessToken,
          disputeId,
          draftOffset,
          publicationOffset,
        ),
      ),
    );
  }
  getAchievementCandidates(disputeId: string, q: string, offset: number) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.achievements.getCandidates(accessToken, disputeId, q, offset),
      ),
    );
  }
  getAchievementDraftVersion(disputeId: string, version: number) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.achievements.getDraftVersion(accessToken, disputeId, version),
      ),
    );
  }
  getAchievementPublicationVersion(disputeId: string, version: number) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.achievements.getPublicationVersion(
          accessToken,
          disputeId,
          version,
        ),
      ),
    );
  }
  previewAchievements(command: unknown) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.achievements.preview(
          accessToken,
          previewAchievementsSchema.parse(command),
        ),
      ),
    );
  }
  saveAchievementDraft(command: SaveAchievementDraft) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.achievements.save(
          accessToken,
          saveAchievementDraftSchema.parse(command),
        ),
      ),
    );
  }
  confirmAchievements(command: ConfirmAchievements) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.achievements.confirm(
          accessToken,
          confirmAchievementsSchema.parse(command),
        ),
      ),
    );
  }
  getRegulationState(disputeId: string, offset: number) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.regulations.getView(accessToken, disputeId, offset),
      ),
    );
  }
  getTransferContext(sourceEntryId: string, destinationRegistrationId: string) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.transfers.getContext(
          accessToken,
          sourceEntryId,
          destinationRegistrationId,
        ),
      ),
    );
  }
  previewTransfer(command: SaveTransfer) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.transfers.preview(accessToken, saveTransferSchema.parse(command)),
      ),
    );
  }
  saveTransfer(command: SaveTransfer) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.transfers.save(accessToken, saveTransferSchema.parse(command)),
      ),
    );
  }
  getGameOccurrence(gameId: string, offset: number) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.decisions.getOccurrence(accessToken, gameId, offset),
      ),
    );
  }
  getGameOccurrenceVersion(gameId: string, version: number) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.decisions.getOccurrenceVersion(accessToken, gameId, version),
      ),
    );
  }
  previewGameOccurrence(command: SaveGameOccurrence) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.decisions.previewOccurrence(
          accessToken,
          saveGameOccurrenceSchema.parse(command),
        ),
      ),
    );
  }
  saveGameOccurrence(command: SaveGameOccurrence) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.decisions.saveOccurrence(
          accessToken,
          saveGameOccurrenceSchema.parse(command),
        ),
      ),
    );
  }
  getRegistrationWithdrawal(registrationId: string, offset: number) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.decisions.getWithdrawal(accessToken, registrationId, offset),
      ),
    );
  }
  getRegistrationWithdrawalVersion(registrationId: string, version: number) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.decisions.getWithdrawalVersion(
          accessToken,
          registrationId,
          version,
        ),
      ),
    );
  }
  previewRegistrationWithdrawal(command: SaveRegistrationWithdrawal) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.decisions.previewWithdrawal(
          accessToken,
          saveRegistrationWithdrawalSchema.parse(command),
        ),
      ),
    );
  }
  saveRegistrationWithdrawal(command: SaveRegistrationWithdrawal) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.decisions.saveWithdrawal(
          accessToken,
          saveRegistrationWithdrawalSchema.parse(command),
        ),
      ),
    );
  }
  getRegulationVersion(disputeId: string, version: number) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.regulations.getVersionView(accessToken, disputeId, version),
      ),
    );
  }
  previewRegulation(disputeId: string, command: PreviewRegulation) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.regulations.preview(
          accessToken,
          disputeId,
          previewRegulationSchema.parse(command),
        ),
      ),
    );
  }
  saveRegulation(command: SaveRegulation) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.regulations.save(accessToken, saveRegulationSchema.parse(command)),
      ),
    );
  }
  getPublicationVersion(gameId: string, version: number) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.publications.getVersion(accessToken, gameId, version),
      ),
    );
  }
  publishSheet(command: PublishSheet) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.publications.publishSheet(accessToken, command),
      ),
    );
  }
  publishPdf(command: PublishPdf) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.publications.publishPdf(accessToken, command),
      ),
    );
  }
  getPdfPreparation(sourceId: string) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.publications.getPreparation(accessToken, sourceId),
      ),
    );
  }
  savePdfPreparation(command: SavePreparation) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.publications.savePreparation(accessToken, command),
      ),
    );
  }
  getGameSheetPreparation(gameId: string) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.games.getPreparation(accessToken, gameId),
      ),
    );
  }
  getGameSheet(gameId: string) {
    return safely(() =>
      this.session.runAuthorized(
        ({ accessToken }) => this.games.getSheet(accessToken, gameId),
        "sheet.read",
      ),
    );
  }
  uploadPdf(request: Request) {
    return safely(() =>
      this.session.runAuthorized(async ({ accessToken }) => {
        const meta = pdfUploadMetadata(request, this.env.APP_ORIGIN);
        const bytes = await readPdfBody(request);
        let command;
        try {
          const p = await extractSupportedPdf(
            bytes,
            meta.filename,
            "application/pdf",
          );
          command = preparePdfSourceSchema.parse({
            commandId: meta.commandId,
            source: {
              id: meta.sourceId,
              disputeId: meta.disputeId,
              filename: p.filename,
              sha256: p.sha256,
              byteSize: bytes.length,
              pageCount: p.pageCount,
              parsed: p.parsed,
            },
          });
        } catch {
          throw badPdfInput();
        }
        const intent = await this.pdfSources.prepare(accessToken, command);
        if (!intent.ready)
          await this.pdfOriginals.put(accessToken, intent, bytes);
        const finished = await this.pdfSources.finish(accessToken, {
          commandId: meta.commandId,
          sourceId: intent.id,
        });
        return { ...finished, duplicate: intent.duplicate };
      }),
    );
  }
  listPdfSources(disputeId: string, offset: number) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.pdfSources.list(accessToken, disputeId, offset),
      ),
    );
  }
  getPdfSource(id: string) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.pdfSources.source(accessToken, id),
      ),
    );
  }
  getPdfReview(id: string) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.pdfSources.review(accessToken, id),
      ),
    );
  }
  savePdfReview(command: SavePdfReview) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.pdfSources.saveReview(
          accessToken,
          savePdfReviewSchema.parse(command),
        ),
      ),
    );
  }
  saveGameSheet(command: SaveSheet) {
    return safely(() =>
      this.session.runAuthorized(
        ({ accessToken }) =>
          this.games.saveSheet(accessToken, saveSheetSchema.parse(command)),
        "sheet.save",
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
  getRegistrationRemovalContext(id: string, disputeId: string) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.teams.removalContext(accessToken, id, disputeId),
      ),
    );
  }
  removeRegistration(command: RegistrationRemoval) {
    return safely(() =>
      this.session.runAuthorized(({ accessToken }) =>
        this.teams.removeRegistration(
          accessToken,
          registrationRemovalSchema.parse(command),
        ),
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
import { type SavePreparation } from "../publication/preparation-contract";
