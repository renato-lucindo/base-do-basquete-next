import { z } from "zod";

// Only the dedicated Pages deployment supplies this public configuration.
export const siteDisputeId =
  typeof document === "undefined"
    ? null
    : (z
        .uuid()
        .safeParse(
          document
            .querySelector('meta[name="bdb-dispute"]')
            ?.getAttribute("content"),
        ).data ?? null);
export const siteTitle = siteDisputeId ? "Copa ES U15" : "Base do Basquete";
export const siteHome = siteDisputeId
  ? `/publico.html#${siteDisputeId}?secao=classificacao`
  : "/publico.html";

function constrainLocation() {
  if (!siteDisputeId) return;
  const url = new URL(window.location.href);
  const [id, query = ""] = url.hash.slice(1).split("?", 2);
  const params = new URLSearchParams(query);
  if (
    ["/publico.html", "/estatisticas.html", "/equipes.html"].includes(
      url.pathname,
    )
  ) {
    params.delete("q");
    url.hash = `${siteDisputeId}?${params}`;
  } else {
    params.set("disputeId", siteDisputeId);
    url.hash = `${id}?${params}`;
  }
  if (url.href !== window.location.href)
    window.history.replaceState(window.history.state, "", url);
}
if (siteDisputeId) {
  constrainLocation();
  window.addEventListener("hashchange", constrainLocation);
  window.addEventListener("popstate", constrainLocation);
}
