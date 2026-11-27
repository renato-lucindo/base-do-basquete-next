import { expect, it } from "vitest";
import { originAliasRedirect } from "./origin-alias";
const env = {
  APP_ORIGIN: "https://app.workers.dev",
  APP_ALIAS: "https://app.example.test",
};
it("preserva caminho e consulta do atalho sem permitir trocar o destino", () => {
  const r = originAliasRedirect(
    new Request(env.APP_ALIAS + "//another.test/path?q=1"),
    env,
  )!;
  const target = new URL(r.headers.get("location")!);
  expect(target.origin).toBe(env.APP_ORIGIN);
  expect(target.pathname).toBe("//another.test/path");
  expect(target.search).toBe("?q=1");
});
it("não redireciona escrita, origem canônica nem hosts desconhecidos", () => {
  expect(
    originAliasRedirect(new Request(env.APP_ALIAS, { method: "POST" }), env),
  ).toBeNull();
  expect(originAliasRedirect(new Request(env.APP_ORIGIN), env)).toBeNull();
  expect(
    originAliasRedirect(new Request("https://other.example.test"), env),
  ).toBeNull();
});
