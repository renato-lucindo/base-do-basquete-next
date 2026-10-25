import { expect, it, vi } from "vitest";
import { SupabasePlayerProfiles } from "./provider";
import { playerCareerFixture } from "../../tests/fixtures/player-career";
import { emptyPerson } from "../people/contract";
import { pubId } from "../../tests/fixtures/publication";
const config = { url: "https://db.example.test", key: "fixture-publishable" };
const command = () => ({
  commandId: pubId(91),
  personId: pubId(1),
  expectedPersonVersion: 1,
  expectedPublicationVersion: 0,
  reason: "",
  acknowledgeImpact: true as const,
});
function workspace() {
  const { athlete, coach, ...person } = emptyPerson(pubId(1));
  void athlete;
  void coach;
  person.name = "Ana Silva";
  return {
    proposal: { personId: person.id, personVersion: 1, person },
    state: {
      personId: person.id,
      personVersion: 1,
      version: 0,
      confirmedPersonVersion: null,
      sourceChanged: false,
      published: null,
      history: [],
      hasMore: false,
    },
  };
}
it("leitura pública só envia identidade à RPC, sem JWT/cookie ou fonte bruta no retorno", async () => {
  const source = playerCareerFixture(),
    send = vi.fn(async () => Response.json(source)),
    db = new SupabasePlayerProfiles(config, send);
  const page = await db.getPage(
    source.personId.toUpperCase(),
    new URLSearchParams("mode=total"),
  );
  expect(page?.statistics.summary?.gamesPlayed).toBe(2);
  expect(page).not.toHaveProperty("participations");
  const [url, init] = send.mock.calls[0] as unknown as [string, RequestInit];
  expect(url).toBe(config.url + "/rest/v1/rpc/get_player_career_source");
  expect(JSON.parse(init.body as string)).toEqual({
    p_person_id: source.personId,
  });
  expect(new Headers(init.headers).has("authorization")).toBe(false);
  expect(new Headers(init.headers).has("cookie")).toBe(false);
});
it("dados públicos incorretos e erros técnicos não viram perfil vazio ou mensagem privada", async () => {
  const source = playerCareerFixture();
  expect(
    await new SupabasePlayerProfiles(config, async () =>
      Response.json(null),
    ).getPage(source.personId, new URLSearchParams()),
  ).toBeNull();
  for (const value of [
    { ...source, personId: pubId(99) },
    { ...source, actorId: pubId(1) },
    {},
  ])
    await expect(
      new SupabasePlayerProfiles(config, async () =>
        Response.json(value),
      ).getPage(source.personId, new URLSearchParams()),
    ).rejects.toMatchObject({ status: 503 });
  for (const status of [400, 401, 403, 404, 500])
    await expect(
      new SupabasePlayerProfiles(config, async () =>
        Response.json({ message: "private database detail" }, { status }),
      ).getPage(source.personId, new URLSearchParams()),
    ).rejects.toMatchObject({ status: 503 });
  await expect(
    new SupabasePlayerProfiles(
      config,
      async () => new Response("{broken"),
    ).getPage(source.personId, new URLSearchParams()),
  ).rejects.toMatchObject({ status: 503 });
});
it("limitação e capacidade ficam explícitas e resposta sem tamanho declarado é interrompida", async () => {
  const id = playerCareerFixture().personId;
  for (const status of [429, 413])
    await expect(
      new SupabasePlayerProfiles(
        config,
        async () => new Response(null, { status }),
      ).getPage(id, new URLSearchParams()),
    ).rejects.toMatchObject({ status });
  let cancelled = false;
  const response = new Response(
    new ReadableStream({
      pull(c) {
        c.enqueue(new Uint8Array(1024 * 1024));
      },
      cancel() {
        cancelled = true;
      },
    }),
  );
  await expect(
    new SupabasePlayerProfiles(config, async () => response).getPage(
      id,
      new URLSearchParams(),
    ),
  ).rejects.toMatchObject({ status: 503 });
  expect(cancelled).toBe(true);
  const send = vi.fn(async () => Response.json(null));
  await expect(
    new SupabasePlayerProfiles(config, send).getPage(
      "invalid",
      new URLSearchParams(),
    ),
  ).rejects.toMatchObject({ status: 400 });
  expect(send).not.toHaveBeenCalled();
});
it("workspace privado correlaciona pessoa/versões e usa somente RPCs próprias", async () => {
  const f = workspace(),
    calls: { url: string; init: RequestInit }[] = [];
  const db = new SupabasePlayerProfiles(config, async (url, init) => {
    calls.push({ url, init });
    return Response.json(
      url.endsWith("get_player_profile_state") ? f.state : f.proposal,
    );
  });
  expect(await db.getWorkspace("fixture-session", pubId(1), 20)).toEqual(f);
  expect(calls).toHaveLength(2);
  expect(
    calls.every(
      (c) =>
        new Headers(c.init.headers).get("Authorization") ===
        "Bearer fixture-session",
    ),
  ).toBe(true);
  expect(JSON.parse(calls[0].init.body as string)).toMatchObject({
    p_person_id: pubId(1),
    p_offset: 20,
  });
  f.proposal.personVersion = 2;
  await expect(
    db.getWorkspace("fixture-session", pubId(1), 0),
  ).rejects.toMatchObject({ status: 503 });
});
it("confirmação não faz GET prévio nem regenera comando e sóaceita ACK correlacionado", async () => {
  const c = command(),
    ack = {
      commandId: c.commandId,
      personId: c.personId,
      version: 1,
      personVersion: 1,
      confirmedAt: "2026-10-25T12:00:00Z",
    },
    send = vi.fn(async () => Response.json(ack));
  expect(
    await new SupabasePlayerProfiles(config, send).confirm(
      "fixture-session",
      c,
    ),
  ).toEqual(ack);
  expect(send).toHaveBeenCalledTimes(1);
  const [url, init] = send.mock.calls[0] as unknown as [string, RequestInit];
  expect(url.endsWith("/confirm_player_profile")).toBe(true);
  expect(JSON.parse(init.body as string)).toEqual({ p_command: c });
  await expect(
    new SupabasePlayerProfiles(config, async () =>
      Response.json({ ...ack, commandId: pubId(88) }),
    ).confirm("fixture-session", c),
  ).rejects.toMatchObject({ status: 503 });
  await expect(
    new SupabasePlayerProfiles(config, async () =>
      Response.json({ ...ack, personVersion: 2 }),
    ).confirm("fixture-session", c),
  ).rejects.toMatchObject({ status: 503 });
});
it("erros privados mantêm status útil sem expor SQL e validação inválida não consulta", async () => {
  for (const status of [400, 401, 403, 404, 409, 429, 413])
    await expect(
      new SupabasePlayerProfiles(config, async () =>
        Response.json({ message: "private SQL" }, { status }),
      ).confirm("fixture-session", command()),
    ).rejects.toMatchObject({ status });
  const send = vi.fn(async () => Response.json({})),
    db = new SupabasePlayerProfiles(config, send);
  await expect(
    db.confirm("fixture-session", { ...command(), acknowledgeImpact: false }),
  ).rejects.toMatchObject({ status: 400 });
  await expect(
    db.getWorkspace("fixture-session", pubId(1), -1),
  ).rejects.toMatchObject({ status: 400 });
  expect(send).not.toHaveBeenCalled();
});
