import { useEffect, useState } from "react";
import { api } from "../competition/api";
import {
  catalogPageSchema,
  contextLabel,
  disputeLink,
  searchPageSchema,
  type CatalogGame,
} from "./catalog-contract";
import { publicDetailLink } from "./navigation";
import { PUBLIC_SEARCH_EVENT } from "./search-form";
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
}: {
  games: CatalogGame[];
  query?: string;
  confirmed?: PublicDispute[];
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
  catalogAvailable = true,
  confirmed = [],
}: {
  games: CatalogGame[];
  catalogAvailable?: boolean;
  confirmed?: PublicDispute[];
}) {
  const initial = () =>
    new URLSearchParams(window.location.hash.split("?")[1] ?? "").get("q") ??
    "";
  const [submitted, setSubmitted] = useState(initial);
  const [searchAttempt, setSearchAttempt] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    players: typeof searchPageSchema._output.players;
    hasMore: boolean;
  } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const read = () => {
      setSubmitted(initial());
    };
    const submit = () => {
      read();
      setSearchAttempt((n) => n + 1);
    };
    window.addEventListener("hashchange", read);
    window.addEventListener(PUBLIC_SEARCH_EVENT, submit);
    return () => {
      window.removeEventListener("hashchange", read);
      window.removeEventListener(PUBLIC_SEARCH_EVENT, submit);
    };
  }, []);
  useEffect(() => {
    const c = new AbortController();
    setError("");
    setResult(null);
    if (submitted.trim().length < 2) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void api(
      `/api/public/search?${new URLSearchParams({ q: submitted })}`,
      searchPageSchema,
      undefined,
      c.signal,
    )
      .then((r) => {
        if (!c.signal.aborted) setResult({ ...r, key: submitted });
      })
      .catch(() => {
        if (!c.signal.aborted)
          setError(
            "Não foi possível buscar jogadores. As competições e equipes continuam disponíveis.",
          );
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, [submitted, searchAttempt]);
  const teams = submitted
    ? [
        ...new Map(
          [
            ...games.flatMap((g) =>
              (["home", "away"] as const).map((side) => ({
                ...g.game[side],
                disputeId: g.disputeId,
                context: g.context,
              })),
            ),
            ...confirmed.flatMap((d) =>
              d.registrations.map((r) => ({
                ...r,
                registrationId: r.id,
                disputeId: d.disputeId,
                context: d.context,
              })),
            ),
          ]
            .filter((t) => matches(`${t.name} ${t.team.name}`, submitted))
            .map((t) => [`${t.disputeId}/${t.registrationId}`, t]),
        ).values(),
      ]
    : [];
  return (
    <>
      {catalogAvailable && (
        <CompetitionTree
          games={games}
          confirmed={confirmed}
          query={submitted}
        />
      )}
      {submitted && (
        <section aria-label="Resultados da busca">
          <h2>Equipes</h2>
          {!catalogAvailable ? (
            <p>A consulta de equipes está indisponível neste momento.</p>
          ) : teams.length ? (
            <ul className="public-results">
              {teams.map((t) => (
                <li key={`${t.disputeId}/${t.registrationId}`}>
                  <a
                    href={publicDetailLink(
                      games.some(
                        (g) =>
                          g.disputeId === t.disputeId &&
                          [
                            g.game.home.registrationId,
                            g.game.away.registrationId,
                          ].includes(t.registrationId),
                      )
                        ? `/equipe.html#${t.team.id}?registrationId=${t.registrationId}`
                        : disputeLink(t.disputeId, "equipes"),
                      t.disputeId,
                    )}
                  >
                    {t.name}
                  </a>
                  <small>{contextLabel(t.context)}</small>
                </li>
              ))}
            </ul>
          ) : (
            <p>Nenhuma equipe encontrada.</p>
          )}
          <h2>Jogadores</h2>
          {loading && <p role="status">Buscando jogadores…</p>}
          {error && <p role="alert">{error}</p>}
          {result?.key === submitted && (
            <>
              {result.players.length ? (
                <ul className="public-results">
                  {result.players.map((p) => (
                    <li key={`${p.person.id}/${p.disputeId}`}>
                      <a
                        href={publicDetailLink(
                          `/atleta.html#${p.person.id}`,
                          p.disputeId,
                        )}
                      >
                        {p.person.name}
                        {p.person.nickname ? ` (${p.person.nickname})` : ""}
                      </a>
                      {p.disputeId && (
                        <small>
                          {games.find((g) => g.disputeId === p.disputeId)
                            ? contextLabel(
                                games.find((g) => g.disputeId === p.disputeId)!
                                  .context,
                              )
                            : "Participação publicada"}
                        </small>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Nenhum jogador encontrado.</p>
              )}
              {result.hasMore && (
                <p>
                  Há mais participações ou perfis. Refine a busca para localizar
                  o jogador.
                </p>
              )}
            </>
          )}
        </section>
      )}
    </>
  );
}
