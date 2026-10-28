import { it, expect, vi } from "vitest";
import { SupabaseGames } from "./provider";
import { emptyPersistedSheet } from "./sheet-contract";
const id = (n: number) =>
  `f5000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
it("uses fixed nullable sheet reader and validates correlated acknowledgements", async () => {
  const command = {
    requestId: id(1),
    gameId: id(2),
    baseVersion: 0,
    gameVersion: 1,
    document: emptyPersistedSheet(),
    confirm: false as const,
    reason: "",
  };
  const send = vi.fn(async (url: string) =>
    Response.json(
      url.endsWith("get_game_sheet")
        ? null
        : { requestId: command.requestId, version: 1, confirmed: false },
    ),
  );
  const db = new SupabaseGames(
    { url: "https://db.example.test", key: "fixture" },
    send,
  );
  expect(await db.getSheet("fixture-jwt", id(2))).toBe(null);
  expect(send.mock.calls[0][0]).toBe(
    "https://db.example.test/rest/v1/rpc/get_game_sheet",
  );
  expect(await db.saveSheet("fixture-jwt", command)).toEqual({
    requestId: command.requestId,
    version: 1,
    confirmed: false,
  });
  send.mockImplementation(async () =>
    Response.json({ requestId: id(50), version: 1, confirmed: false }),
  );
  await expect(db.saveSheet("fixture-jwt", command)).rejects.toMatchObject({
    code: "access_unavailable",
  });
});
it("runs domain validation before RPC and never sends malformed participation/actions", async () => {
  const send = vi.fn(async () => Response.json({})),
    db = new SupabaseGames(
      { url: "https://db.example.test", key: "fixture" },
      send,
    );
  const d = emptyPersistedSheet();
  d.participants = [
    {
      rosterEntryId: id(10),
      side: "home",
      jersey: "12",
      played: false,
      starter: false,
    },
    {
      rosterEntryId: id(11),
      side: "away",
      jersey: "77",
      played: true,
      starter: false,
    },
  ];
  d.events = [{ id: id(20), side: "home", period: 1, target: "12", code: "2" }];
  await expect(
    db.saveSheet("fixture-jwt", {
      requestId: id(1),
      gameId: id(2),
      gameVersion: 1,
      baseVersion: 0,
      document: d,
      confirm: false,
      reason: "",
    }),
  ).rejects.toMatchObject({ status: 400, code: "invalid_input" });
  expect(send).not.toHaveBeenCalled();
});
