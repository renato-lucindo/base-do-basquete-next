import { expect, it, vi } from "vitest";
import { SupabaseOfficiating } from "./officiating-provider";
import { emptyOfficiating } from "./officiating-contract";
const config = { url: "https://db.example.test", key: "fixture" };
const id = () => crypto.randomUUID();
it("reads the editor in one snapshot and correlates its game without extending legacy DTOs", async () => {
  const savedAt = "2026-10-28T13:00:00Z",
    disputeId = id();
  const team = {
    id: id(),
    name: "Team",
    abbreviation: null,
    version: 1,
    savedAt,
  };
  const home = {
    id: id(),
    disputeId,
    teamId: team.id,
    name: "A",
    team,
    version: 1,
    savedAt,
  };
  const away = { ...home, id: id(), name: "B" };
  const game = {
    id: id(),
    disputeId,
    homeRegistrationId: home.id,
    awayRegistrationId: away.id,
    date: null,
    time: null,
    venue: null,
    number: null,
    version: 1,
    savedAt,
    state: "scheduled",
    timeZone: "America/Sao_Paulo",
    scheduledAt: null,
    home,
    away,
  };
  const body = { game, officiating: emptyOfficiating() };
  const send = vi.fn(async () => Response.json(body));
  expect(
    await new SupabaseOfficiating(config, send).get("fixture", game.id),
  ).toEqual(body);
  expect(send).toHaveBeenCalledWith(
    `${config.url}/rest/v1/rpc/get_game_editor`,
    expect.objectContaining({ body: JSON.stringify({ p_id: game.id }) }),
  );
  for (const response of [
    null,
    { ...body, private: true },
    { ...body, game: { ...game, id: id() } },
  ])
    await expect(
      new SupabaseOfficiating(config, async () => Response.json(response)).get(
        "fixture",
        game.id,
      ),
    ).rejects.toMatchObject({
      code: response === null ? "context_not_found" : "access_unavailable",
    });
});
it("uses a fixed administrative catalog endpoint with bounded strict output", async () => {
  const result = { items: [{ id: id(), name: "João" }], hasMore: false };
  const send = vi.fn(async () => Response.json(result));
  const db = new SupabaseOfficiating(config, send);
  expect(await db.list("fixture-token", "joao", 20)).toEqual(result);
  expect(send).toHaveBeenCalledWith(
    `${config.url}/rest/v1/rpc/list_game_officials`,
    expect.objectContaining({
      body: JSON.stringify({ p_query: "joao", p_offset: 20 }),
    }),
  );
  for (const body of [
    { ...result, private: true },
    { items: Array(21).fill(result.items[0]), hasMore: false },
  ])
    await expect(
      new SupabaseOfficiating(config, async () => Response.json(body)).list(
        "fixture",
        "",
        0,
      ),
    ).rejects.toMatchObject({ code: "access_unavailable" });
});
it("validates commands before sending and correlates returned ACKs", async () => {
  const command = {
    commandId: id(),
    expectedVersion: 0,
    game: {
      id: id(),
      disputeId: id(),
      homeRegistrationId: id(),
      awayRegistrationId: id(),
      date: null,
      time: null,
      venue: null,
      number: null,
    },
    officiating: emptyOfficiating(),
  };
  const send = vi.fn(async () =>
    Response.json({ id: command.game.id, version: 1 }),
  );
  const db = new SupabaseOfficiating(config, send);
  expect(await db.save("fixture", command)).toEqual({
    id: command.game.id,
    version: 1,
  });
  await expect(
    db.save("fixture", {
      ...command,
      officiating: {
        ...emptyOfficiating(),
        timer: { kind: "existing", id: id() },
      },
    }),
  ).rejects.toMatchObject({ status: 400 });
  expect(send).toHaveBeenCalledTimes(1);
  await expect(
    new SupabaseOfficiating(config, async () =>
      Response.json({ id: id(), version: 1 }),
    ).save("fixture", command),
  ).rejects.toMatchObject({ code: "access_unavailable" });
});
it("reports explicit homonym confirmation and keeps database details private", async () => {
  const command = {
    commandId: id(),
    expectedVersion: 0,
    game: {
      id: id(),
      disputeId: id(),
      homeRegistrationId: id(),
      awayRegistrationId: id(),
      date: null,
      time: null,
      venue: null,
      number: null,
    },
    officiating: emptyOfficiating(),
  };
  for (const [status, message, code] of [
    [
      409,
      "official_homonym_confirmation_required",
      "official_homonym_confirmation_required",
    ],
    [409, "idempotency_conflict", "idempotency_conflict"],
    [403, "sql details", "not_authorized"],
    [401, "sql details", "invalid_session"],
    [400, "sql details", "invalid_input"],
  ] as const) {
    const db = new SupabaseOfficiating(config, async () =>
      Response.json({ message, details: "private database" }, { status }),
    );
    await expect(db.save("fixture", command)).rejects.toMatchObject({ code });
  }
});
