import { useEffect, useState } from "react";
import { api } from "../competition/api";
import {
  catalogPageSchema,
  contextLabel,
  disputeLink,
  type CatalogGame,
} from "./catalog-contract";
import { PublicSearchResults } from "./search-results";
import type { PublicDispute } from "../regulation/publication-contract";

export function usePublicCatalog(disputeId?: string | null) {
  const [state, setState] = useState<{
    key: string;
    games: CatalogGame[];
    disputes: PublicDispute[];
    loading: boolean;
    error: string;
  }>({ key: "", games: [], disputes: [], loading: true, error: "" });
  const [retry, setRetry] = useState(0);
  const key = disputeId ?? "all";
  useEffect(() => {
    const c = new AbortController();
    setState({ key, games: [], disputes: [], loading: true, error: "" });
    void (async () => {
      const games: CatalogGame[] = [];
      const disputes: PublicDispute[] = [];
      let after: string | null = null;
      do {
        const p = new URLSearchParams();
        if (disputeId) p.set("disputeId", disputeId);
        if (after) p.set("after", after);
        const page = await api(
          `/api/public/catalog?${p}`,
          catalogPageSchema,
          undefined,
          c.signal,
        );
        let previous = after;
        for (const g of page.games) {
          if (
            (previous && g.id <= previous) ||
            (disputeId && g.disputeId !== disputeId)
          )
            throw Error("Catálogo inconsistente. Tente novamente.");
          previous = g.id;
        }
        if (page.next && (page.next !== previous || !page.games.length))
          throw Error("Catálogo inconsistente. Tente novamente.");
        games.push(...page.games);
        if (page.disputes.some((d) => disputeId && d.disputeId !== disputeId))
          throw Error("Disputa inesperada.");
        disputes.push(...page.disputes);
        if (games.length > 10000 || (games.length === 10000 && page.next))
          throw Error("O catálogo excede a capacidade desta consulta.");
        after = page.next;
      } while (after && !c.signal.aborted);
      if (!c.signal.aborted)
        setState({ key, games, disputes, loading: false, error: "" });
    })().catch(() => {
      if (!c.signal.aborted)
        setState({
          key,
          games: [],
          disputes: [],
          loading: false,
          error:
            "Não foi possível carregar as competições publicadas. Tente novamente.",
        });
    });
    return () => c.abort();
  }, [key, disputeId, retry]);
  return {
    ...(state.key === key
      ? state
      : { games: [], disputes: [], loading: true, error: "" }),
    retry: () => setRetry((n) => n + 1),
  };
}
export const publicDisputes = (
  games: CatalogGame[],
  disputes: PublicDispute[] = [],
) => [
  ...new Map([...games, ...disputes].map((g) => [g.disputeId, g])).values(),
];
const matches = (text: string, query: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR")
    .includes(
      query
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLocaleLowerCase("pt-BR"),
    );

export function CompetitionTree({
  games,
  query = "",
  confirmed = [],
  onSelect,
}: {
  games: CatalogGame[];
  query?: string;
  confirmed?: PublicDispute[];
  onSelect?: React.MouseEventHandler<HTMLAnchorElement>;
}) {
  const disputes = publicDisputes(games, confirmed).filter((g) =>
    matches(contextLabel(g.context), query),
  );
  const competitions = [
    ...new Map(
      disputes.map((g) => [g.context.championshipId, g.context.name]),
    ).entries(),
  ].sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  if (!competitions.length) return <p>Nenhuma competição encontrada.</p>;
  return (
    <div className="competition-tree">
      {competitions.map(([id, name]) => (
        <details key={id} open={query ? true : undefined}>
          <summary>{name}</summary>
          {[
            ...new Set(
              disputes
                .filter((g) => g.context.championshipId === id)
                .map((g) => g.context.year),
            ),
          ]
            .sort((a, b) => b - a)
            .map((year) => {
              const season = disputes.filter(
                (g) =>
                  g.context.championshipId === id && g.context.year === year,
              );
              return (
                <details key={year} open>
                  <summary>{year}</summary>
                  <div className="gender-columns">
                    {(["masculino", "feminino"] as const).map((gender) => {
                      const items = season.filter(
                        (g) => g.context.gender === gender,
                      );
                      return (
                        items.length > 0 && (
                          <section
                            key={gender}
                            aria-label={`${name} ${year} ${gender}`}
                          >
                            <h3>
                              {gender === "masculino"
                                ? "Masculino"
                                : "Feminino"}
                            </h3>
                            {[...new Set(items.map((g) => g.context.category))]
                              .sort((a, b) =>
                                a.localeCompare(b, "pt-BR", { numeric: true }),
                              )
                              .map((category) => {
                                const rows = items.filter(
                                  (g) => g.context.category === category,
                                );
                                return rows.length === 1 &&
                                  !rows[0].context.division ? (
                                  <a
                                    key={category}
                                    href={disputeLink(rows[0].disputeId)}
                                    onClick={onSelect}
                                  >
                                    {category}
                                  </a>
                                ) : (
                                  <details
                                    key={category}
                                    open={query ? true : undefined}
                                  >
                                    <summary>{category}</summary>
                                    {rows.map((g) => (
                                      <a
                                        key={g.disputeId}
                                        href={disputeLink(g.disputeId)}
                                        onClick={onSelect}
                                      >
                                        {g.context.division || category}
                                      </a>
                                    ))}
                                  </details>
                                );
                              })}
                          </section>
                        )
                      );
                    })}
                  </div>
                </details>
              );
            })}
        </details>
      ))}
    </div>
  );
}

export function PublicDiscovery({
  games,
  confirmed = [],
  catalogAvailable = true,
}: {
  games: CatalogGame[];
  confirmed?: PublicDispute[];
  catalogAvailable?: boolean;
}) {
  return (
    <PublicSearchResults
      catalogAvailable={catalogAvailable}
      fallback={
        catalogAvailable ? (
          <CompetitionTree games={games} confirmed={confirmed} />
        ) : null
      }
    />
  );
}
