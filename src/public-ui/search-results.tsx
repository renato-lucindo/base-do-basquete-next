import { type ReactNode } from "react";
import { usePublicPosition } from "./position";
import { contextLabel, disputeLink } from "./catalog-contract";
import { publicDetailLink } from "./navigation";
import { type SearchHit, searchTypes } from "./search-contract";
import {
  searchHref,
  searchLabels,
  resultCount,
  useSearchRoute,
  usePublicSearch,
} from "./search-state";
import "./search.css";
export function searchHitHref(hit: SearchHit, q: string) {
  return hit.kind === "players"
    ? publicDetailLink(`/atleta.html#${hit.id}`, hit.disputeId)
    : hit.kind === "competitions" && hit.directDisputeId
      ? disputeLink(hit.directDisputeId)
      : searchHref(q, hit.kind, 1, hit.id);
}
export function searchHitDescription(hit: SearchHit) {
  if (hit.kind === "competitions" && hit.directDisputeId) {
    const c = hit.disputes.find(
      (s) => s.disputeId === hit.directDisputeId,
    )!.context;
    return `${c.year} · ${c.gender === "masculino" ? "Masculino" : "Feminino"} · ${c.category}${c.division ? ` · ${c.division}` : ""}`;
  }
  return hit.kind === "players"
    ? hit.nickname
      ? hit.nickname
      : ""
    : hit.kind === "teams"
      ? `${hit.participations.length} participações públicas`
      : `${hit.disputes.length} disputas públicas`;
}
function SearchEntity({ hit }: { hit: SearchHit }) {
  if (hit.kind === "players")
    return (
      <a href={searchHitHref(hit, "")}>
        <strong>{hit.name}</strong>
        {hit.nickname && <small>{hit.nickname}</small>}
      </a>
    );
  if (hit.kind === "teams")
    return (
      <details className="public-search-entity" open>
        <summary>
          <strong>{hit.name}</strong>
          <small>{hit.participations.length} participações públicas</small>
        </summary>
        <ul>
          {hit.participations.map((s) => (
            <li key={`${s.disputeId}/${s.registrationId}`}>
              <a
                href={
                  s.hasResults
                    ? publicDetailLink(
                        `/equipe.html#${hit.id}?registrationId=${s.registrationId}`,
                        s.disputeId,
                      )
                    : disputeLink(s.disputeId, "equipes")
                }
              >
                {contextLabel(s.context)}
                <small>{s.name}</small>
              </a>
            </li>
          ))}
        </ul>
      </details>
    );
  const years = [...new Set(hit.disputes.map((d) => d.context.year))].sort(
    (a, b) => b - a,
  );
  return (
    <details className="public-search-entity" open>
      <summary>
        <strong>{hit.name}</strong>
        <small>{hit.disputes.length} disputas públicas</small>
      </summary>
      {years.map((year) => (
        <details key={year} open>
          <summary>{year}</summary>
          <div className="public-search-genders">
            {(["masculino", "feminino"] as const)
              .filter((g) =>
                hit.disputes.some(
                  (d) => d.context.year === year && d.context.gender === g,
                ),
              )
              .map((g) => (
                <section key={g} aria-label={`${year} ${g}`}>
                  <h3>{g === "masculino" ? "Masculino" : "Feminino"}</h3>
                  <ul>
                    {hit.disputes
                      .filter(
                        (d) =>
                          d.context.year === year && d.context.gender === g,
                      )
                      .map((d) => (
                        <li key={d.disputeId}>
                          <a href={disputeLink(d.disputeId)}>
                            {d.context.category}
                            {d.context.division
                              ? ` · ${d.context.division}`
                              : ""}
                          </a>
                        </li>
                      ))}
                  </ul>
                </section>
              ))}
          </div>
        </details>
      ))}
    </details>
  );
}
export function PublicSearchResults({
  fallback,
  catalogAvailable,
}: {
  fallback: ReactNode;
  catalogAvailable: boolean;
}) {
  const { raw, query, attempt, retry } = useSearchRoute(),
    state = usePublicSearch(query, true, 0, attempt);
  usePublicPosition(raw.q ? !!state.data : catalogAvailable);
  if (!raw.q) return <>{fallback}</>;
  if (!query)
    return (
      <p role="alert">
        Informe de 2 a 120 caracteres e confira os filtros.{" "}
        <a href="/publico.html">Limpar busca</a>
      </p>
    );
  return (
    <section
      className="public-search-results"
      aria-label="Resultados da busca"
      aria-busy={state.loading}
    >
      <nav aria-label="Tipos de resultado" className="public-search-types">
        {searchTypes.map((type) => (
          <a
            key={type}
            href={searchHref(query.q, type)}
            aria-current={query.type === type ? "page" : undefined}
          >
            {searchLabels[type]}
          </a>
        ))}
      </nav>
      {query.entityId && (
        <a href={searchHref(query.q, query.type)}>Voltar aos resultados</a>
      )}
      <p role="status">
        {state.loading
          ? "Buscando na base pública…"
          : state.data
            ? `${resultCount(Object.values(state.data.counts).reduce((a, b) => a + b, 0))} para “${query.q}”`
            : ""}
      </p>
      {state.error && (
        <div role="alert">
          {state.error}{" "}
          <button type="button" onClick={retry}>
            Tentar novamente
          </button>
        </div>
      )}
      {state.data && Object.values(state.data.counts).every((n) => n === 0) && (
        <p>Nenhum resultado encontrado. Confira o nome ou tente outro termo.</p>
      )}
      {state.data &&
        searchTypes
          .filter((t) => t !== "all")
          .map((type) => {
            const hits = state.data!.results.filter((r) => r.kind === type);
            return hits.length ? (
              <section key={type} aria-label={searchLabels[type]}>
                <h2>
                  {searchLabels[type]} <small>{state.data!.counts[type]}</small>
                </h2>
                <ul className="public-search-entity-list">
                  {hits.map((hit) => (
                    <li key={hit.id}>
                      <SearchEntity hit={hit} />
                    </li>
                  ))}
                </ul>
                {query.type === "all" && state.data!.counts[type] > 5 && (
                  <a href={searchHref(query.q, type)}>
                    Ver todos os {searchLabels[type].toLocaleLowerCase("pt-BR")}
                  </a>
                )}
              </section>
            ) : null;
          })}
      {state.data && state.data.totalPages > 1 && (
        <nav aria-label="Paginação da busca" className="public-search-pager">
          <a
            href={searchHref(
              query.q,
              query.type,
              Math.max(1, state.data.page - 1),
              query.entityId,
            )}
            aria-disabled={state.data.page === 1}
            onClick={(e) => {
              if (state.data!.page === 1) e.preventDefault();
            }}
          >
            Anterior
          </a>
          <span>
            Página {state.data.page} de {state.data.totalPages}
          </span>
          <a
            href={searchHref(
              query.q,
              query.type,
              Math.min(state.data.totalPages, state.data.page + 1),
              query.entityId,
            )}
            aria-disabled={state.data.page === state.data.totalPages}
            onClick={(e) => {
              if (state.data!.page === state.data!.totalPages)
                e.preventDefault();
            }}
          >
            Próxima
          </a>
        </nav>
      )}
    </section>
  );
}
