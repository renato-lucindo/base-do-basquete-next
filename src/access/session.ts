import { HttpError } from "../server/http";
import type { Actor, AuthProvider, Credentials, Tokens } from "./provider";
import { invalidSession, open, seal, type SessionContents } from "./vault";

export const SESSION_LIFETIME_MS = 8 * 3600000;
export type SessionRecord = { sealed: string; expiresAt: number };
export type SessionRepository = {
  read(): Promise<SessionRecord | undefined>;
  save(record: SessionRecord): Promise<void>;
  clear(): Promise<void>;
};

/** The queue coordinates external refresh I/O; all critical state is persisted. */
export class PersistentSession {
  private tail: Promise<unknown> = Promise.resolve();
  constructor(
    private readonly store: SessionRepository,
    private readonly provider: AuthProvider,
    private readonly secret: string,
    private readonly now = Date.now,
  ) {}

  private serial<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.tail.then(operation);
    this.tail = next.catch(() => undefined);
    return next;
  }

  create(credentials: Credentials): Promise<Actor> {
    return this.serial(async () => {
      if (await this.store.read())
        throw new HttpError(409, "session_exists", "Sessão já iniciada.");
      const tokens = await this.provider.signIn(credentials);
      try {
        const actor = await this.provider.authorize(tokens.accessToken);
        await this.store.save({
          sealed: await seal({ tokens, actorId: actor.id }, this.secret),
          expiresAt: this.now() + SESSION_LIFETIME_MS,
        });
        return actor;
      } catch (error) {
        await this.store.clear();
        await this.revoke(tokens);
        throw error;
      }
    });
  }

  actor(): Promise<Actor> {
    return this.serial(async () => {
      const record = await this.store.read();
      if (!record || record.expiresAt <= this.now()) {
        await this.store.clear();
        throw invalidSession();
      }
      let contents: SessionContents | undefined;
      try {
        contents = await open(record.sealed, this.secret);
        if (contents.tokens.expiresAt <= this.now() + 60000) {
          contents.tokens = await this.provider.refresh(
            contents.tokens.refreshToken,
          );
          // Persist rotation before the following network calls can fail.
          await this.store.save({
            ...record,
            sealed: await seal(contents, this.secret),
          });
        }
        const actor = await this.provider.authorize(
          contents.tokens.accessToken,
        );
        if (actor.id !== contents.actorId || record.expiresAt <= this.now())
          throw invalidSession();
        return actor;
      } catch (error) {
        if (error instanceof HttpError && [401, 403].includes(error.status)) {
          await this.store.clear();
          if (contents) await this.revoke(contents.tokens);
        }
        throw error;
      }
    });
  }

  close(): Promise<boolean> {
    return this.serial(async () => {
      const record = await this.store.read();
      // Invalidate application access before contacting the upstream provider.
      await this.store.clear();
      if (!record) return true;
      try {
        return await this.revoke(
          (await open(record.sealed, this.secret)).tokens,
        );
      } catch {
        return false;
      }
    });
  }

  private async revoke(tokens: Tokens): Promise<boolean> {
    try {
      await this.provider.signOut(tokens.accessToken);
      return true;
    } catch {
      return false;
    }
  }
}
