import { expect, it, vi } from "vitest";
import { teamStatisticsFixture } from "../../tests/fixtures/team-statistics";
import { pubId } from "../../tests/fixtures/publication";
import { SupabaseTeamStatistics } from "./provider";
const config = { url: "https://db.example.test", key: "fixture-publishable" };
it("correlacionaUUID canônico também quando fonte pública usa letras maiúsculas", async () => {
  const s = teamStatisticsFixture();
  s.disputeId = s.disputeId.toUpperCase();
  const db = new SupabaseTeamStatistics(config, async () => Response.json(s));
  expect(
    (await db.getDetail(pubId(801), pubId(9), pubId(5), new URLSearchParams()))
      ?.kind,
  ).toBe("confirmed-team-detail-v1");
});
it("tabela e detalhe derivam fonte no servidor e sóUUID da disputa chega à RPC pública", async () => {
  const send = vi.fn(async () => Response.json(teamStatisticsFixture())),
    db = new SupabaseTeamStatistics(config, send);
  const list = await db.getPage(
    pubId(801).toUpperCase(),
    new URLSearchParams("scope=all&mode=total"),
  );
  expect(list?.rows).toHaveLength(2);
  expect(list).not.toHaveProperty("games");
  const selection = await db.getDetail(
    pubId(801),
    pubId(9),
    null,
    new URLSearchParams(),
  );
  expect(selection?.kind).toBe("confirmed-team-selection-v1");
  const detail = await db.getDetail(
    pubId(801),
    pubId(9),
    pubId(5),
    new URLSearchParams("scope=all&mode=total"),
  );
  expect(detail?.kind).toBe("confirmed-team-detail-v1");
  for (const [url, init] of send.mock.calls as unknown as [
    string,
    RequestInit,
  ][]) {
    expect(url).toBe(`${config.url}/rest/v1/rpc/get_public_statistics_source`);
    expect(JSON.parse(init.body as string)).toEqual({
      p_dispute_id: pubId(801),
    });
    const headers = new Headers(init.headers);
    expect(headers.get("apikey")).toBe(config.key);
    expect(headers.has("authorization") || headers.has("cookie")).toBe(false);
  }
});
it("não faz chamada comIDs inválidos e sóausência real énull", async () => {
  const send = vi.fn(async () => Response.json(null)),
    db = new SupabaseTeamStatistics(config, send);
  await expect(db.getPage("bad", new URLSearchParams())).rejects.toMatchObject({
    status: 400,
  });
  await expect(
    db.getDetail(pubId(801), "bad", null, new URLSearchParams()),
  ).rejects.toMatchObject({ status: 400 });
  await expect(
    db.getDetail(pubId(801), pubId(9), "bad", new URLSearchParams()),
  ).rejects.toMatchObject({ status: 400 });
  expect(send).not.toHaveBeenCalled();
  expect(await db.getPage(pubId(801), new URLSearchParams())).toBeNull();
  expect(
    await db.getDetail(pubId(801), pubId(9), pubId(5), new URLSearchParams()),
  ).toBeNull();
});
it("respostas incorretas/privadas e falha técnica não viram contexto não encontrado", async () => {
  for (const source of [
    { ...teamStatisticsFixture(), actorId: pubId(99) },
    { ...teamStatisticsFixture(), disputeId: pubId(999) },
    {},
  ]) {
    const db = new SupabaseTeamStatistics(config, async () =>
      Response.json(source),
    );
    await expect(
      db.getPage(pubId(801), new URLSearchParams()),
    ).rejects.toMatchObject({ status: 503 });
    await expect(
      db.getDetail(pubId(801), pubId(9), null, new URLSearchParams()),
    ).rejects.toMatchObject({ status: 503 });
  }
  for (const status of [400, 401, 403, 404, 500])
    await expect(
      new SupabaseTeamStatistics(config, async () =>
        Response.json({ message: "private SQL" }, { status }),
      ).getPage(pubId(801), new URLSearchParams()),
    ).rejects.toMatchObject({ status: 503 });
});
it("preserva413/429 sanitizados e limita resposta semContentLength/JSON inválido", async () => {
  for (const status of [413, 429])
    await expect(
      new SupabaseTeamStatistics(config, async () =>
        Response.json({ message: "private SQL" }, { status }),
      ).getPage(pubId(801), new URLSearchParams()),
    ).rejects.toMatchObject({ status });
  for (const response of [
    new Response("{"),
    new Response(" ".repeat(5 * 1024 * 1024 + 1)),
  ])
    await expect(
      new SupabaseTeamStatistics(config, async () => response).getPage(
        pubId(801),
        new URLSearchParams(),
      ),
    ).rejects.toMatchObject({ status: 503 });
});
