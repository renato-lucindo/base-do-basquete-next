import { it, expect } from "vitest";
import { SupabasePublicStandings } from "./public-provider";
import { publicRegulationFixture } from "../../tests/fixtures/public-regulation";

const config = { url: "https://public.example", key: "fixture-publishable" };
it("anonymous standings read uses a closed source and computes only public facts", async () => {
  const s = publicRegulationFixture();
  const p = new SupabasePublicStandings(config, async (url, init) => {
    expect(url).toBe(config.url + "/rest/v1/rpc/get_public_standings");
    expect(new Headers(init.headers).has("Authorization")).toBe(false);
    expect(JSON.parse(String(init.body))).toEqual({
      p_dispute_id: s.disputeId,
    });
    return Response.json(s);
  });
  expect((await p.get(s.disputeId))?.games[0].score).toEqual({
    homePoints: 80,
    awayPoints: 70,
  });
});
it("rejects private properties, foreign contexts and unsafe provider errors without echoing data", async () => {
  const s = publicRegulationFixture();
  for (const value of [
    { ...s, reason: "PRIVATE_MOTIVE" },
    { ...s, disputeId: s.context.seasonId },
  ]) {
    await expect(
      new SupabasePublicStandings(config, async () => Response.json(value)).get(
        s.disputeId,
      ),
    ).rejects.not.toThrow("PRIVATE_MOTIVE");
  }
  await expect(
    new SupabasePublicStandings(config, async () =>
      Response.json({ reason: "PRIVATE_MOTIVE" }, { status: 503 }),
    ).get(s.disputeId),
  ).rejects.not.toThrow("PRIVATE_MOTIVE");
});
it("confirmation preserves the command on retry and checks every ACK identity", async () => {
  const s = publicRegulationFixture(),
    command = {
      commandId: s.games[0].id,
      disputeId: s.disputeId,
      expectedPublicationVersion: 0,
      fingerprint: "a".repeat(64),
    };
  const sent: unknown[] = [];
  const p = new SupabasePublicStandings(config, async (_, init) => {
    expect(new Headers(init.headers).get("Authorization")).toBe(
      "Bearer fixture-token",
    );
    sent.push(JSON.parse(String(init.body)));
    return Response.json({
      commandId: command.commandId,
      disputeId: command.disputeId,
      publicationVersion: 1,
      publishedAt: s.publishedAt,
    });
  });
  expect(await p.confirm("fixture-token", command)).toEqual(
    await p.confirm("fixture-token", command),
  );
  expect(sent).toEqual([{ p_command: command }, { p_command: command }]);
});
