import { z } from "zod";
import { disputeLink, type PublicSection } from "./catalog-contract";

const pages = [
  "/publico.html",
  "/estatisticas.html",
  "/equipes.html",
  "/equipe.html",
  "/atleta.html",
  "/resultado.html",
];
export function safePublicReturn(
  value: string | null,
  disputeId: string | null,
): string | null {
  if (
    !value ||
    value.length > 8192 ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\r\n]/u.test(value)
  )
    return null;
  const u = new URL(value, "https://public.example");
  if (u.origin !== "https://public.example" || !pages.includes(u.pathname))
    return null;
  const [id, search = ""] = u.hash.slice(1).split("?", 2);
  if (u.pathname === "/publico.html" && !id) return u.pathname + u.hash;
  const context = ["/equipe.html", "/atleta.html", "/resultado.html"].includes(
    u.pathname,
  )
    ? new URLSearchParams(search).get("disputeId")
    : id;
  if (!disputeId || context !== disputeId) return null;
  u.search = "";
  return u.pathname + u.hash;
}
export function publicDetailLink(href: string, disputeId: string | null) {
  const target = new URL(href, "https://public.example");
  const [id, search = ""] = target.hash.slice(1).split("?", 2);
  const p = new URLSearchParams(search);
  if (disputeId) p.set("disputeId", disputeId);
  target.hash = `${id}${p.size ? `?${p}` : ""}`;
  if (typeof window !== "undefined") {
    const from = safePublicReturn(
      window.location.pathname + window.location.hash,
      disputeId,
    );
    if (from) target.searchParams.set("returnTo", from);
  }
  return target.pathname + target.search + target.hash;
}
export function readPublicDispute(hash: string) {
  const [id = "", search = ""] = hash.replace(/^#/u, "").split("?", 2);
  const p = new URLSearchParams(search);
  return {
    id: z.uuid().safeParse(id).success ? id.toLowerCase() : null,
    section:
      p.get("secao") === "jogos"
        ? ("jogos" as const)
        : ("classificacao" as const),
    query: p.get("q")?.slice(0, 120) ?? "",
  };
}
export function sectionReturn(id: string, section: PublicSection) {
  return (
    safePublicReturn(
      new URLSearchParams(window.location.search).get("returnTo"),
      id,
    ) ?? disputeLink(id, section)
  );
}
