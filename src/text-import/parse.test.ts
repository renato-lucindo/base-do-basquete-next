import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseText } from "./parse";
import { reviewIssues } from "./review";
const file = (name: string) =>
  readFileSync(
    `especificacao/BASE-DO-BASQUETE-ARQUITETURA-20261022/referencias/exemplos/${name}.txt`,
    "utf8",
  );
const ids = () => {
  let n = 0;
  return () => `b0000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
};
describe("text import preview", () => {
  it("keeps team-only lines and block headers including empty/repeated blocks", () => {
    const teams = parseText(file("equipes"), "teams", ids());
    expect(teams.map((r) => r.name)).toEqual(["Lobos", "Águias", "Estrelas"]);
    expect(teams.every((r) => r.kind === "team" && r.resolution === null)).toBe(
      true,
    );
    const rows = parseText(
      "Equipe: Lobos\n0 - Ana\nEquipe: Lobos\n00 - Bia\nEquipe: Vazia",
      "rosters",
      ids(),
    );
    expect(rows).toHaveLength(5);
    expect(rows[1]).toMatchObject({
      kind: "athlete",
      teamRowId: rows[0].id,
      jersey: "0",
    });
    expect(rows[3]).toMatchObject({
      kind: "athlete",
      teamRowId: rows[2].id,
      jersey: "00",
    });
    expect(rows[0].id).not.toBe(rows[2].id);
    expect(rows[4]).toMatchObject({ kind: "team", name: "Vazia" });
  });
  it("preserves physical source lines and never guesses missing jersey or parent", () => {
    const raw =
      "\uFEFF7 - Sem equipe\r\n\r\n Equipe: Águias \r\nAna sem camisa\r\n00 — Bia\r\n8: Carla\r\n9\tDani\r\n10 Eva\r\n11-";
    const rows = parseText(raw, "rosters", ids());
    expect(rows[0]).toMatchObject({
      line: 1,
      source: "\uFEFF7 - Sem equipe",
      teamRowId: null,
      jersey: "7",
      name: "Sem equipe",
    });
    expect(rows[1]).toMatchObject({
      line: 3,
      source: " Equipe: Águias ",
      name: "Águias",
    });
    expect(rows[2]).toMatchObject({
      line: 4,
      jersey: "",
      name: "Ana sem camisa",
    });
    expect(
      rows.slice(3).map((r) => (r.kind === "athlete" ? r.jersey : null)),
    ).toEqual(["00", "8", "9", "10", "11"]);
    expect(rows.at(-1)?.name).toBe("");
    const empty = parseText(
      "Equipe: Lobos\nEquipe:\n7 - Ana",
      "rosters",
      ids(),
    );
    expect(empty[1].name).toBe("");
    expect(empty[2]).toMatchObject({ teamRowId: empty[1].id });
  });
  it("retains supplied example problems and treats every identity explicitly", () => {
    const rows = parseText(file("equipes-e-elencos"), "rosters", ids());
    expect(rows).toHaveLength(6);
    expect(rows.filter((r) => r.kind === "athlete")).toHaveLength(4);
    const pending = parseText(file("pendencias"), "rosters", ids());
    const header = pending[0];
    if (header.kind !== "team") throw Error("fixture");
    header.resolution = {
      kind: "newTeam",
      teamId: ids()(),
      registrationId: "c0000000-0000-4000-8000-000000000001",
    };
    const issues = reviewIssues(pending);
    expect(issues.get(pending[1].id)?.join(" ")).toContain("repetida");
    expect(issues.get(pending[2].id)?.join(" ")).toContain("repetida");
    expect(issues.get(pending[3].id)?.join(" ")).toContain("1–99");
    expect(issues.get(pending[4].id)?.join(" ")).toContain("identidade");
    pending[2].selected = false;
    expect(reviewIssues(pending).get(pending[1].id)?.join(" ")).not.toContain(
      "repetida",
    );
  });
  it("detects duplicate jersey/person across headers resolved to the same registration", () => {
    const rows = parseText(
      "Equipe: A\n0 - Ana\nEquipe: B\n0 - Bia",
      "rosters",
      ids(),
    );
    for (const r of rows) {
      if (r.kind === "team")
        r.resolution = {
          kind: "registration",
          registrationId: "c0000000-0000-4000-8000-000000000001",
          version: 1,
        };
      else
        r.person = {
          kind: "existing",
          personId: "c0000000-0000-4000-8000-000000000002",
          version: 1,
        };
    }
    const issues = reviewIssues(rows);
    expect(issues.get(rows[1].id)?.join(" ")).toContain("repetida");
    expect(issues.get(rows[3].id)?.join(" ")).toContain("identidade");
  });
  it("bounds previews instead of silently truncating supplied input", () => {
    expect(() => parseText("a".repeat(20001), "teams", ids())).toThrow();
    expect(() =>
      parseText(Array(501).fill("").join("\n"), "teams", ids()),
    ).toThrow();
    expect(() =>
      parseText(Array(201).fill("Equipe").join("\n"), "teams", ids()),
    ).toThrow();
    expect(parseText("\n \n", "teams", ids())).toEqual([]);
  });
});
