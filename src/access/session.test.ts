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
