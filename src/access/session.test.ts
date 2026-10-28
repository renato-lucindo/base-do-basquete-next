import { describe, expect, it, vi } from "vitest";
import { HttpError } from "../server/http";
import { PersistentSession, type SessionRecord } from "./session";
import type { AuthProvider } from "./provider";

const actor = { id: "10000000-0000-4000-8000-000000000001" };
const key = btoa("\0".repeat(32)); // Test-only deterministic AES key.
const credentials = {
  email: "admin@example.test",
  password: "fixture-password",
};

function fixture() {
  let record: SessionRecord | undefined;
  let clock = 1000;
  const store = {
    read: async () => record,
    save: async (value: SessionRecord) => {
      record = value;
    },
    clear: async () => {
      record = undefined;
    },
  };
  const provider: AuthProvider = {
    signIn: vi.fn(async () => ({
      accessToken: "fixture-access",
      refreshToken: "fixture-refresh",
      expiresAt: 901000,
    })),
    refresh: vi.fn(async () => ({
      accessToken: "fixture-rotated-access",
      refreshToken: "fixture-rotated-refresh",
      expiresAt: clock + 900000,
    })),
    authorize: vi.fn(async () => actor),
    signOut: vi.fn(async () => undefined),
  };
  const create = () => new PersistentSession(store, provider, key, () => clock);
  return {
    provider,
    store,
    create,
    tick: (value: number) => {
      clock = value;
    },
    record: () => record,
  };
}

describe("persistent administrative session", () => {
  it("does not turn a committed command into failure when diagnostics fail", async () => {
    const f = fixture();
    await f.create().create(credentials);
    const session = new PersistentSession(
      f.store,
      f.provider,
      key,
      () => 1000,
      () => {
        throw Error("fixture logger unavailable");
      },
    );
    await expect(
      session.runAuthorized(async () => ({ saved: true }), "game.save"),
    ).resolves.toEqual({ saved: true });
  });
  it("observes queue, fresh authority and data stages without recording identities or credentials", async () => {
    const f = fixture();
    await f.create().create(credentials);
    const samples: unknown[] = [];
    const session = new PersistentSession(
      f.store,
      f.provider,
      key,
      () => 1000,
      (sample) => samples.push(sample),
    );
    expect(
      await session.runAuthorized(async () => ({ saved: true }), "game.save"),
    ).toEqual({ saved: true });
    await expect(
      session.runAuthorized(async () => {
        throw new HttpError(409, "version_conflict", "Conflict");
      }, "sheet.save"),
    ).rejects.toMatchObject({ status: 409 });
    expect(samples).toHaveLength(2);
    expect(samples[0]).toEqual({
      operation: "game.save",
      queueMs: expect.any(Number),
      authorityMs: expect.any(Number),
      dataMs: expect.any(Number),
      outcome: "ok",
    });
    expect(samples[1]).toMatchObject({
      operation: "sheet.save",
      outcome: "error",
    });
    for (const value of [
      actor.id,
      "fixture-access",
      "fixture-refresh",
      "fixture-password",
    ])
      expect(JSON.stringify(samples)).not.toContain(value);
  });
  it("runs data operations with rotated authority inside the queue and closes before the next operation", async () => {
    const f = fixture();
    const session = f.create();
    await session.create(credentials);
    f.tick(900000);
    const operation = vi.fn(
      async ({
        actor: identity,
        accessToken,
      }: {
        actor: { id: string };
        accessToken: string;
      }) => {
        expect(identity).toEqual(actor);
        expect(accessToken).toBe("fixture-rotated-access");
        return { saved: true };
      },
    );
    const results = await Promise.allSettled([
      session.runAuthorized(operation),
      session.close(),
      session.runAuthorized(operation),
    ]);
    expect(results[0]).toEqual({ status: "fulfilled", value: { saved: true } });
    expect(results[2].status).toBe("rejected");
    expect(operation).toHaveBeenCalledTimes(1);
    expect(f.provider.refresh).toHaveBeenCalledTimes(1);
  });
  it("stores encrypted tokens, never credentials, and recovers after a new instance", async () => {
    const f = fixture();
    expect(await f.create().create(credentials)).toEqual(actor);
    const persisted = JSON.stringify(f.record());
    for (const value of [
      "fixture-access",
      "fixture-refresh",
      "fixture-password",
      actor.id,
    ])
      expect(persisted).not.toContain(value);
    expect(await f.create().actor()).toEqual(actor);
  });

  it("serializes concurrent refreshes and persists rotated tokens", async () => {
    const f = fixture();
    const session = f.create();
    await session.create(credentials);
    f.tick(900000);
    expect(
      await Promise.all([session.actor(), session.actor(), session.actor()]),
    ).toEqual([actor, actor, actor]);
    expect(f.provider.refresh).toHaveBeenCalledTimes(1);
    expect(f.provider.authorize).toHaveBeenLastCalledWith(
      "fixture-rotated-access",
      actor.id,
    );
    expect(await f.create().actor()).toEqual(actor);
  });

  it("logout queued during renewal cannot resurrect a session", async () => {
    const f = fixture();
    const session = f.create();
    await session.create(credentials);
    f.tick(900000);
    const results = await Promise.allSettled([
      session.actor(),
      session.close(),
      session.actor(),
    ]);
    expect(results.map((result) => result.status)).toEqual([
      "fulfilled",
      "fulfilled",
      "rejected",
    ]);
    expect(f.record()).toBeUndefined();
  });

  it("clears expired or tampered state and rejects an identity change", async () => {
    const f = fixture();
    await f.create().create(credentials);
    const original = f.record()!;
    await f.store.save({
      ...original,
      sealed: original.sealed.slice(0, -4) + "AAAA",
    });
    await expect(f.create().actor()).rejects.toMatchObject({ status: 401 });
    expect(f.record()).toBeUndefined();
    await f.create().create(credentials);
    f.tick(8 * 3600000 + 1001);
    await expect(f.create().actor()).rejects.toMatchObject({ status: 401 });
    f.tick(1000);
    await f.create().create(credentials);
    vi.mocked(f.provider.authorize).mockResolvedValue({
      id: "10000000-0000-4000-8000-000000000002",
    });
    await expect(f.create().actor()).rejects.toMatchObject({ status: 401 });
    expect(f.record()).toBeUndefined();
  });

  it("preserves state on outage and revokes it on fresh authorization denial", async () => {
    const f = fixture();
    await f.create().create(credentials);
    vi.mocked(f.provider.authorize).mockRejectedValueOnce(
      new HttpError(503, "unavailable", "Unavailable"),
    );
    await expect(f.create().actor()).rejects.toMatchObject({ status: 503 });
    expect(f.record()).toBeDefined();
    vi.mocked(f.provider.authorize).mockRejectedValueOnce(
      new HttpError(403, "denied", "Denied"),
    );
    await expect(f.create().actor()).rejects.toMatchObject({ status: 403 });
    expect(f.record()).toBeUndefined();
  });

  it("does not persist a valid login without administrative authorization", async () => {
    const f = fixture();
    vi.mocked(f.provider.authorize).mockRejectedValue(
      new HttpError(403, "denied", "Denied"),
    );
    await expect(f.create().create(credentials)).rejects.toMatchObject({
      status: 403,
    });
    expect(f.record()).toBeUndefined();
    expect(f.provider.signOut).toHaveBeenCalledWith("fixture-access");
  });

  it("invalidates local state even when provider logout is unavailable", async () => {
    const f = fixture();
    await f.create().create(credentials);
    vi.mocked(f.provider.signOut).mockRejectedValue(
      new HttpError(503, "unavailable", "Unavailable"),
    );
    expect(await f.create().close()).toBe(false);
    await expect(f.create().actor()).rejects.toMatchObject({ status: 401 });
  });
});
