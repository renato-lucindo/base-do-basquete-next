import { z } from "zod";

const key = "bdb-test-dispute";
export function previewDisputeId(): string | null {
  if (typeof window === "undefined") return null;
  const url = new URL(window.location.href);
  if (
    ![
      "/publico.html",
      "/equipes.html",
      "/equipe.html",
      "/estatisticas.html",
      "/atleta.html",
      "/resultado.html",
      "/classificacao.html",
      "/jogador.html",
    ].includes(url.pathname)
  )
    return null;
  const requested = z.uuid().safeParse(url.searchParams.get("previa")).data;
  try {
    if (url.searchParams.has("sairPrevia")) {
      window.sessionStorage.removeItem(key);
      return null;
    }
    if (requested) window.sessionStorage.setItem(key, requested);
    return (
      requested ??
      z.uuid().safeParse(window.sessionStorage.getItem(key)).data ??
      null
    );
  } catch {
    return requested ?? null;
  }
}
