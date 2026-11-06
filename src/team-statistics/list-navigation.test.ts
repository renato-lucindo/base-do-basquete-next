import { expect, it } from "vitest";
import { pubId } from "../../tests/fixtures/publication";
import { parseTeamsListQuery } from "./list-query";
import { serializeTeamsListRoute, readTeamsListRoute } from "./list-navigation";
it("preserva1000IDs em referência local compacta e acusa referência ausente", () => {
  const values = new Map<string, string>(),
    storage = {
      getItem: (k: string) => values.get(k) ?? null,
      setItem: (k: string, v: string) => {
        values.set(k, v);
      },
    };
  const q = {
    ...parseTeamsListQuery(new URLSearchParams()),
    selection: "custom" as const,
    registrationIds: Array.from({ length: 1000 }, (_, i) => pubId(i + 1)),
  };
  const hash = serializeTeamsListRoute(pubId(801), q, storage);
  expect(hash.length).toBeLessThan(2000);
  expect(hash).toContain("stateRef=");
  expect(readTeamsListRoute(hash, storage).query).toEqual(q);
  expect(() =>
    readTeamsListRoute(hash, { ...storage, getItem: () => null }),
  ).toThrow("seleção");
  expect(() =>
    serializeTeamsListRoute(pubId(801), q, {
      ...storage,
      setItem: () => {
        throw Error();
      },
    }),
  ).toThrow();
});

it("consulta curta funciona quando o navegador bloqueia acesso ao armazenamento", () => {
  const descriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "sessionStorage",
  );
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    get() {
      throw new Error("bloqueado");
    },
  });
  try {
    const q = parseTeamsListQuery(new URLSearchParams());
    const hash = serializeTeamsListRoute(pubId(801), q);
    expect(readTeamsListRoute(hash).query).toEqual(q);
  } finally {
    if (descriptor)
      Object.defineProperty(globalThis, "sessionStorage", descriptor);
    else Reflect.deleteProperty(globalThis, "sessionStorage");
  }
});
