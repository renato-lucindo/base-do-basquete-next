import { expect, it } from "vitest";
import {
  publicPlayerAccessibleName,
  publicPlayerHistoryAccessibleName,
  publicPlayerHistoryName,
  publicPlayerName,
} from "./player-name";

it("prioriza apelido válido e mantém nome completo quando ausente", () => {
  expect(publicPlayerName("Pedro Gabriel Amorim Pessoti", "  Pedro Pessoti  ")).toBe("Pedro Pessoti");
  expect(publicPlayerName("Pedro Gabriel Amorim Pessoti", "  ")).toBe("Pedro Gabriel Amorim Pessoti");
  expect(publicPlayerName("Pedro Gabriel Amorim Pessoti", null)).toBe("Pedro Gabriel Amorim Pessoti");
});

it("preserva o nome completo na identificação acessível", () => {
  expect(publicPlayerAccessibleName("Pedro Gabriel Amorim Pessoti", "Pedro Pessoti")).toBe(
    "Pedro Pessoti — nome completo: Pedro Gabriel Amorim Pessoti",
  );
  expect(publicPlayerAccessibleName("Pedro Gabriel Amorim Pessoti", null)).toBe(
    "Pedro Gabriel Amorim Pessoti",
  );
});

it("tabelas históricas mostram apelido, sem descartar variantes do nome", () => {
  const names = ["Pedro Gabriel Amorim", "Pedro Gabriel Amorim Pessoti"];
  expect(publicPlayerHistoryName(names, [null, "Pedro Pessoti"])).toBe("Pedro Pessoti");
  expect(publicPlayerHistoryAccessibleName(names, [null, "Pedro Pessoti"])).toBe(
    "Pedro Pessoti — nome completo: Pedro Gabriel Amorim / Pedro Gabriel Amorim Pessoti",
  );
  expect(publicPlayerHistoryName(names, [null, "   "])).toBe(names.join(" / "));
});
