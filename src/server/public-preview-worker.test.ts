import { afterEach, expect, it, vi } from "vitest";
import { publicPreviewResponse } from "./public-preview";
const upstream = vi.hoisted(() =>
  vi.fn(async () => new Response("public", { status: 200 })),
);

const env = {
  APP_ORIGIN: "https://preview.example.test",
  BDB_SOURCE: "source",
};
const read = (request: Request, target = env) =>
  publicPreviewResponse(request, target, upstream);
afterEach(() => upstream.mockClear());
it("serve páginas e leitores públicos na origem configurada", async () => {
  const r = await read(
    new Request(env.APP_ORIGIN + "/api/public/catalog"),
    env,
  );
  expect(r.status).toBe(200);
  expect(await r.text()).toBe("public");
  expect(r.headers.get("x-preview-source")).toBe("source");
  expect(r.headers.get("cache-control")).toBe("private, no-store");
  const home = await read(new Request(env.APP_ORIGIN), env);
  expect(home.headers.get("location")).toBe(env.APP_ORIGIN + "/publico.html");
});
it("bloqueia operações privadas, escrita, prévia de teste e outra origem antes de delegar", async () => {
  for (const path of [
    "/api/session",
    "/api/competitions",
    "/foundation.html",
    "/admin",
    "/publico.html?previa=disputa",
  ])
    expect((await read(new Request(env.APP_ORIGIN + path), env)).status).toBe(
      403,
    );
  expect(
    (
      await read(
        new Request(env.APP_ORIGIN + "/api/public/catalog", { method: "POST" }),
        env,
      )
    ).status,
  ).toBe(405);
  expect(
    (
      await read(
        new Request(env.APP_ORIGIN + "/api/public/catalog", {
          headers: { "X-Dispute-Preview": "disputa" },
        }),
        env,
      )
    ).status,
  ).toBe(403);
  expect(
    (await read(new Request("https://other.example.test/publico.html"), env))
      .status,
  ).toBe(421);
  expect(upstream).not.toHaveBeenCalled();
});

it("link administrativo do preview abre o domínio administrativo configurado", async () => {
  const r = await publicPreviewResponse(
    new Request(env.APP_ORIGIN + "/foundation.html"),
    { ...env, ADMIN_ORIGIN: "https://admin.example.test" },
    upstream,
  );
  expect(r.status).toBe(302);
  expect(r.headers.get("location")).toBe("https://admin.example.test/admin");
  expect(upstream).not.toHaveBeenCalled();
});
