import { test, expect } from "vitest";
import { mkdir, writeFile } from "node:fs/promises";
import { PersistentSession, type SessionRecord } from "../../../src/access/session";
import { SupabaseAccess } from "../../../src/access/provider";
import { SupabaseGames } from "../../../src/games/provider";
import { SupabaseOfficiating } from "../../../src/games/officiating-provider";
import { emptyOfficiating } from "../../../src/games/officiating-contract";
import { emptyPersistedSheet } from "../../../src/games/sheet-contract";
import { SupabaseTextImport } from "../../../src/text-import/provider";

test("records real providers with explicitly simulated upstream RTT, not preview latency", async () => {
  const id = (n: number) => `fb900000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  const phase = process.env.BDB_LATENCY_PHASE ?? "sample";
  const rttMs = 80;
  const results = [];
  for (const operation of ["game", "sheet", "imported-player"] as const) {
    let record: SessionRecord | undefined;
    const calls: string[] = [];
    const send = async (url: string, init?: RequestInit) => {
      const path = new URL(url).pathname;
      calls.push(path);
      await new Promise((resolve) => setTimeout(resolve, rttMs));
      if (path.endsWith("/token")) return Response.json({ access_token: "fixture-access", refresh_token: "fixture-refresh", expires_in: 3600 });
      if (path.endsWith("/user")) return Response.json({ id: id(1), is_anonymous: false });
      if (path.endsWith("/admin_access")) return Response.json([{ user_id: id(1), enabled: true }]);
      const c = JSON.parse(String(init?.body)).p_command;
      if (path.endsWith("save_game_editor")) return Response.json({ id: c.game.id, version: c.expectedVersion + 1 });
      if (path.endsWith("save_game_sheet")) return Response.json({ requestId: c.requestId, version: c.baseVersion + 1, confirmed: false });
      if (path.endsWith("confirm_text_row")) return Response.json({ id: c.reviewId, version: c.expectedVersion + 1, result: { rowId: c.rowId, entityId: id(90), entityVersion: 1 } });
      throw Error("Unexpected fixture endpoint");
    };
    const config = { url: "https://fixture.example.test", key: "fixture" };
    const session = new PersistentSession({ read: async () => record, save: async (r) => { record = r; }, clear: async () => { record = undefined; } }, new SupabaseAccess(config, send), btoa("\0".repeat(32)));
    await session.create({ email: "fixture@example.test", password: "fixture-password" });
    const games = new SupabaseGames(config, send);
    const editor = new SupabaseOfficiating(config, send);
    const importer = new SupabaseTextImport(config, send);
    const samples = [];
    const before = calls.length;
    for (let i = 0; i < 5; i++) {
      const start = performance.now();
      await session.runAuthorized(({ accessToken }) => operation === "game"
        ? editor.save(accessToken, { commandId: id(10+i), expectedVersion: 0, game: { id: id(2), disputeId: id(3), homeRegistrationId: id(4), awayRegistrationId: id(5), date: null, time: null, venue: null, number: null }, officiating: emptyOfficiating() })
        : operation === "sheet"
          ? games.saveSheet(accessToken, { requestId: id(10+i), gameId: id(2), gameVersion: 1, baseVersion: 0, document: emptyPersistedSheet(), confirm: false, reason: "" })
          : importer.confirm(accessToken, { commandId: id(10+i), reviewId: id(6), rowId: id(7), expectedVersion: 0 }));
      samples.push(performance.now() - start);
    }
    expect(calls.length - before).toBe(15);
    results.push({ operation, samplesMs: samples.map((n) => Math.round(n*100)/100), meanMs: Math.round(samples.reduce((a,b)=>a+b,0)/samples.length*100)/100, requestsPerOperation: (calls.length-before)/5 });
  }
  await mkdir(".preview-artifacts", { recursive: true });
  await writeFile(`.preview-artifacts/save-latency-${phase}.json`, JSON.stringify({ phase, simulatedUpstreamRttMs: rttMs, includesBrowserOrRealNetwork: false, results }, null, 2));
  console.log(JSON.stringify({ phase, rttMs, results }));
});
