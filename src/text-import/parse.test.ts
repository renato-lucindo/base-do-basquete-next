import { describe, expect, it } from "vitest";
import { parseRoster } from "./parse";
import { reviewIssues } from "./review";
const id = () => crypto.randomUUID();
describe("single roster text interpretation", () => {
  it("interprets the MVP feedback sample with short dates, derived years and unitless weights", () => {
    const result = parseRoster(
      'João - Esquerda - 74,9\n12- Ricardo - 193 - 1999\n23- Mike - "MJ" - 2000 - SG\n77- Luke Silva - 180 - 75kg\n88- John - 20/07/2001 - 117kg - Pivô\n91- Pato Ganso - "PH" - Canhoto\nRenato - 01/01/97 - 127 - 151',
      id,
    );
    expect(result.rows[0].data).toMatchObject({
      name: "João",
      dominantHand: "left",
      weightKg: 74.9,
      heightCm: null,
    });
    expect(result.rows[1].data).toMatchObject({
      name: "Ricardo",
      jersey: "12",
      heightCm: 193,
      birthYear: 1999,
    });
    expect(result.rows[4].data).toMatchObject({
      birthDate: "2001-07-20",
      birthYear: 2001,
      weightKg: 117,
    });
    expect(result.rows[6].data).toMatchObject({
      name: "Renato",
      birthDate: "1997-01-01",
      birthYear: 1997,
      weightKg: 127,
      heightCm: 151,
    });
    expect(result.rows[6].provided).toEqual(
      expect.arrayContaining([
        "birthDate",
        "birthYear",
        "weightKg",
        "heightCm",
      ]),
    );
    expect(result.rows.flatMap((r) => r.issues)).toEqual([]);
  });
  it("keeps explicit units authoritative and short-year rules stable", () => {
    const result = parseRoster(
      "Ana - 127cm - 74,9kg - 01/02/05\nBia - 151kg - 1,93m - 31/02/97\nCarla - 31/12/29\nDani - 01/01/30",
      id,
    );
    expect(result.rows[0].data).toMatchObject({
      heightCm: 127,
      weightKg: 74.9,
      birthDate: "2005-02-01",
      birthYear: 2005,
    });
    expect(result.rows[1].data).toMatchObject({
      heightCm: 193,
      weightKg: 151,
      birthDate: null,
      birthYear: null,
    });
    expect(result.rows[1].issues.some((i) => i.field === "birthDate")).toBe(
      true,
    );
    expect(result.rows[2].data.birthYear).toBe(2029);
    expect(result.rows[3].data.birthYear).toBe(1930);
  });
  it("accepts tab-separated fields and signals invalid federation IDs and year zero dates", () => {
    const result = parseRoster(
      "4\tAna\t1,80\t001234\nBia - 12345\nCarla - 0000-02-01",
      id,
    );
    expect(result.rows[0].data).toMatchObject({
      name: "Ana",
      jersey: "4",
      heightCm: 180,
      federationRegistration: "001234",
    });
    expect(
      result.rows[1].issues.some((i) => i.field === "federationRegistration"),
    ).toBe(true);
    expect(result.rows[2].issues.some((i) => i.field === "birthDate")).toBe(
      true,
    );
  });
  it("interprets the complete supplied scope, headers and optional shirts", () => {
    const result = parseRoster(
      'Equipe: Lobos\n\nNº - NOME - NASC. - ALT. - POS.\n4 - João Silva\n12 - Ricardo Souza - 193 - 1999\n23 - Mike Santos - "MJ" - 2000 - SG\n77 - Lucas Oliveira - 1,80 - 75kg\n88 - John Pereira - 2/7/2001 - 117kg - Pivô\nPato Ganso - "PH" - Canhoto\n- Henrique Simões',
      id,
    );
    expect(result.teamName).toBe("Lobos");
    expect(result.rows).toHaveLength(7);
    expect(result.ignoredLines).toHaveLength(2);
    expect(result.rows[1].data).toMatchObject({
      name: "Ricardo Souza",
      heightCm: 193,
      birthYear: 1999,
      birthDate: null,
    });
    expect(result.rows[2].data).toMatchObject({
      nickname: "MJ",
      positions: ["Ala Armador"],
      birthYear: 2000,
    });
    expect(result.rows[3].data).toMatchObject({ heightCm: 180, weightKg: 75 });
    expect(result.rows[4].data).toMatchObject({
      birthDate: "2001-07-02",
      birthYear: 2001,
      weightKg: 117,
      positions: ["Pivô"],
    });
    expect(result.rows[5].data).toMatchObject({
      name: "Pato Ganso",
      jersey: null,
      nickname: "PH",
      dominantHand: "left",
    });
    expect(result.rows[6].data).toMatchObject({
      name: "Henrique Simões",
      jersey: null,
      dominantHand: "right",
    });
    expect(result.rows[6].provided).not.toContain("dominantHand");
    expect(result.rows.flatMap((r) => r.issues)).toEqual([]);
  });
  it("respects quoted and hyphenated names, flexible separators and two positions", () => {
    const r = parseRoster(
      '7- Jean-Pierre ; "J-P" | PG/SF | 1.93m\n4 Ana-Maria - 1-2 - 75,5kg\n00 | Bia | Ala Pivô | Pivô\n0 — Carla — 193cm',
      id,
    );
    expect(r.rows[0].data).toMatchObject({
      name: "Jean-Pierre",
      nickname: "J-P",
      positions: ["Armador", "Ala"],
      heightCm: 193,
    });
    expect(r.rows[1].data).toMatchObject({
      name: "Ana-Maria",
      positions: ["Armador", "Ala Armador"],
      weightKg: 75.5,
    });
    expect(r.rows[2].data).toMatchObject({
      jersey: "00",
      positions: ["Ala Pivô", "Pivô"],
    });
    expect(r.rows[3].data.jersey).toBe("0");
    expect(r.rows.flatMap((r) => r.issues)).toEqual([]);
  });
  it("retains invalid, ambiguous and unknown tokens for review", () => {
    const r = parseRoster(
      '7 - Ana - 31/02/2000 - 12345 - SF/ZZ\n8 - Bia - PG/SF/C\n9 - Carla - 180 - 193\n10 - Dani - "sem fim',
      id,
    );
    expect(r.rows[0].data.birthDate).toBeNull();
    expect(r.rows[0].issues.map((i) => i.token)).toEqual(
      expect.arrayContaining(["31/02/2000", "12345", "SF/ZZ"]),
    );
    expect(r.rows[1].data.positions).toHaveLength(3);
    expect(r.rows[1].issues.some((i) => i.field === "positions")).toBe(true);
    expect(r.rows[2].issues.some((i) => i.field === "heightCm")).toBe(true);
    expect(r.rows[3].issues.some((i) => i.token.includes("sem fim"))).toBe(
      true,
    );
  });
  it("validates real dates and federation IDs without inferring a public birth year", () => {
    const r = parseRoster(
      "Ana - 29/2/2000 - 001234\nBia - 29/2/2001\nCarla - 2000-02-29\nDani - 0000",
      id,
    );
    expect(r.rows[0].data).toMatchObject({
      birthDate: "2000-02-29",
      federationRegistration: "001234",
      birthYear: 2000,
    });
    expect(r.rows[0].data).not.toHaveProperty("publicBirthYear");
    expect(r.rows[1].issues.some((i) => i.field === "birthDate")).toBe(true);
    expect(r.rows[2].data.birthDate).toBe("2000-02-29");
    expect(r.rows[3].issues.some((i) => i.field === "birthYear")).toBe(true);
  });
  it("preserves source lines and blocks multiple teams instead of mixing them", () => {
    const r = parseRoster(
      "\uFEFFEquipe: Lobos\r\n\r\n  0 - Ana  \r\nEquipe: Águias\r\n00 - Bia",
      id,
    );
    expect(r.rows[0]).toMatchObject({ line: 3, source: "  0 - Ana  " });
    expect(r.rows[1]).toMatchObject({ line: 5 });
    expect(r.issues.join(" ")).toContain("uma equipe");
    expect(parseRoster("Equipe: Lobos\nEquipe: LOBOS\nAna", id).issues).toEqual(
      [],
    );
  });
  it("flags invalid numbered shirts and enforces bounds without truncation", () => {
    const r = parseRoster("100 - Ana\n000 - Bia\n-1 - Carla", id);
    expect(
      r.rows.every((r) => r.issues.some((i) => i.field === "jersey")),
    ).toBe(true);
    expect(() => parseRoster("a".repeat(20001), id)).toThrow();
    expect(() => parseRoster(Array(201).fill("Ana").join("\n"), id)).toThrow();
    expect(() => parseRoster(Array(501).fill("").join("\n"), id)).toThrow();
  });
  it("allows multiple missing shirts, detects selected duplicates and preserves applied results", () => {
    const r = parseRoster("Ana\nBia\n0 - Carla\n0 - Dani", id);
    for (const row of r.rows)
      row.decision = { kind: "new", personId: id(), confirmHomonym: false };
    const issues = reviewIssues(r.rows);
    expect(issues.has(r.rows[0].id)).toBe(false);
    expect(issues.get(r.rows[2].id)?.join(" ")).toContain("repetida");
    r.rows[3].selected = false;
    expect(reviewIssues(r.rows).has(r.rows[2].id)).toBe(false);
    r.rows[3].selected = true;
    const applied = [
      { rowId: r.rows[2].id, entityId: r.rows[2].rosterId, entityVersion: 1 },
    ];
    expect(reviewIssues(r.rows, applied).has(r.rows[2].id)).toBe(false);
    expect(
      reviewIssues(r.rows, applied).get(r.rows[3].id)?.join(" "),
    ).toContain("repetida");
  });
});
