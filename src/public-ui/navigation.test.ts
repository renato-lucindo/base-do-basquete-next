import { describe, expect, it } from "vitest";
import {
  publicDetailLink,
  safePublicReturn,
  readPublicDispute,
} from "./navigation";
import { disputeLink } from "./catalog-contract";
import { pubId } from "../../tests/fixtures/publication";
const id = pubId(3);
describe("public context URLs", () => {
  it("opens standings by default and preserves existing HTML entries", () => {
    expect(disputeLink(id)).toBe(`/publico.html#${id}?secao=classificacao`);
    expect(disputeLink(id, "jogadores")).toBe(
      `/estatisticas.html#${id}?scope=all`,
    );
    expect(readPublicDispute(`#${id}?secao=jogos`).section).toBe("jogos");
    expect(readPublicDispute("#bad").id).toBeNull();
  });
  it("keeps global identity, registration and dispute in detail links", () => {
    const link = new URL(
      publicDetailLink(
        `/equipe.html#${pubId(9)}?registrationId=${pubId(5)}`,
        id,
      ),
      "https://public.example",
    );
    expect(link.hash.split("?")[0]).toBe(`#${pubId(9)}`);
    expect(new URLSearchParams(link.hash.split("?")[1]).get("disputeId")).toBe(
      id,
    );
    expect(link.hash).toContain(`registrationId=${pubId(5)}`);
  });
  it("accepts matching list filters and the global search as return targets", () => {
    const from = `/estatisticas.html#${id}?q=Ana&page=2&scope=all`;
    expect(safePublicReturn(from, id)).toBe(from);
    expect(safePublicReturn("/publico.html#?q=Ana", id)).toBe(
      "/publico.html#?q=Ana",
    );
  });
  it.each([
    "https://evil.test",
    "//evil.test",
    "/foundation.html",
    "/\\evil.test",
    `/equipes.html#${pubId(99)}`,
    "/publico.html#bad",
  ])("rejects forged return %s", (target) => {
    expect(safePublicReturn(target, id)).toBeNull();
  });
});
