import test from "node:test";
import assert from "node:assert/strict";
import { publicPreview } from "../scripts/copa-public-proxy.mjs";
const site = "https://copa-es-u15.pages.dev";
const backend = "https://internal.example";
const id = "b5433b13-a8f9-4baa-b4d9-08066ebf3e96";
function fixture(
  reply = () =>
    new Response("public", {
      headers: { "content-type": "text/html", "x-bdb-source": "verified" },
    }),
) {
  const calls = [];
  const env = {
    PUBLIC_BACKEND_ORIGIN: backend,
    PUBLIC_DISPUTE_ID: id,
    SOURCE: {
      async fetch(r) {
        calls.push(r);
        return reply(r);
      },
    },
  };
  return { env, calls };
}
test("Pages abre a Copa sem expor o backend nem bloquear a navegação pública", async () => {
  const { env, calls } = fixture();
  const home = await publicPreview(new Request(site), env);
  assert.equal(
    home.headers.get("location"),
    `/publico.html#${id}?secao=classificacao`,
  );
  for (const path of [
    "/publico.html",
    "/estatisticas.html",
    "/equipes.html",
    "/equipe.html",
    "/atleta.html",
    "/resultado.html",
    "/assets/public-abc.js",
    "/assets/public-abc.css",
    `/api/public/catalog?disputeId=${id}`,
    `/api/public/discovery?q=Copa`,
    `/api/public/standings/${id}`,
    `/api/public/games/${id}`,
    `/api/public/statistics/${id}`,
    `/api/public/teams/${id}/${id}`,
    `/api/public/players/${id}`,
    `/api/public/achievements/${id}`,
  ]) {
    const response = await publicPreview(new Request(site + path), env);
    assert.equal(response.status, 200, path);
    assert.equal(response.headers.get("x-bdb-source"), "verified");
    assert.equal(await response.text(), "public");
    assert.equal(calls.at(-1).url, backend + path);
  }
});
test("rotas privadas e fontes do Pages não chegam ao serviço vinculado", async () => {
  const { env, calls } = fixture();
  for (const path of [
    "/admin",
    "/foundation.html",
    "/api/session",
    "/api/competitions",
    "/api/people",
    "/api/public/../competitions",
    "/_worker.js",
    "/_routes.json",
    "/wrangler.jsonc",
    "/assets/server.map",
  ]) {
    assert.equal(
      (await publicPreview(new Request(site + path), env)).status,
      404,
      path,
    );
  }
  assert.equal(calls.length, 0);
});
test("consulta POST de equipes conserva filtros e valida origem antes do encaminhamento", async () => {
  const { env, calls } = fixture((r) =>
    r.text().then((body) => new Response(body)),
  );
  const path = `/api/public/teams/${id}?pageSize=all`;
  const response = await publicPreview(
    new Request(site + path, {
      method: "POST",
      headers: { origin: site, "content-type": "application/json" },
      body: '{"query":"pageSize=all&scope=all"}',
    }),
    env,
  );
  assert.equal(response.status, 200);
  assert.equal(await response.text(), '{"query":"pageSize=all&scope=all"}');
  assert.equal(calls[0].headers.get("origin"), backend);
  assert.equal(
    (
      await publicPreview(
        new Request(site + path, {
          method: "POST",
          headers: { origin: "https://other.example" },
          body: "{}",
        }),
        env,
      )
    ).status,
    403,
  );
  for (const method of ["POST", "PUT", "PATCH", "DELETE"])
    assert.equal(
      (
        await publicPreview(
          new Request(site + `/api/public/games/${id}`, { method }),
          env,
        )
      ).status,
      405,
    );
  assert.equal(calls.length, 1);
});
test("o proxy é anônimo, mantém MIME e não devolve cookies ou URLs internas", async () => {
  const { env, calls } = fixture(
    () =>
      new Response("{}", {
        headers: {
          "content-type": "application/json",
          "set-cookie": "session=private",
          "content-location": backend,
          link: `<${backend}>`,
          "x-bdb-source": "verified",
        },
      }),
  );
  const response = await publicPreview(
    new Request(site + `/api/public/players/${id}`, {
      headers: {
        cookie: "session=private",
        authorization: "Bearer private",
        referer: site,
        "cf-access-jwt-assertion": "private",
      },
    }),
    env,
  );
  for (const name of [
    "cookie",
    "authorization",
    "referer",
    "cf-access-jwt-assertion",
  ])
    assert.equal(calls[0].headers.get(name), null);
  for (const name of ["set-cookie", "content-location", "link", "location"])
    assert.equal(response.headers.get(name), null);
  assert.equal(response.headers.get("content-type"), "application/json");
  assert.equal(response.headers.get("cache-control"), "no-store");
});
test("HEAD preserva status sem corpo; erros e redirects não revelam o servidor", async () => {
  const { env } = fixture();
  assert.equal(
    await (
      await publicPreview(
        new Request(site + "/publico.html", { method: "HEAD" }),
        env,
      )
    ).text(),
    "",
  );
  for (const reply of [
    () => Response.redirect(backend),
    () => {
      throw Error(backend);
    },
  ]) {
    const response = await publicPreview(
      new Request(site + "/publico.html"),
      fixture(reply).env,
    );
    assert.ok([502, 503].includes(response.status));
    assert.equal(response.headers.get("location"), null);
    assert.ok(!(await response.text()).includes(backend));
  }
});
