import { useEffect, useState } from "react";
import { api } from "../competition/api";
import {
  catalogPageSchema,
  type PublicSection,
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
type CatalogDispute = Pick<PublicDispute, "disputeId" | "context">;
const compareLabels = (a: string, b: string) =>
  a.localeCompare(b, "pt-BR", { numeric: true });

export function DisputeLinks({
  disputes,
  headingLevel,
  section = "classificacao",
  currentId,
  onSelect,
}: {
  disputes: CatalogDispute[];
  headingLevel: "h3" | "h4";
  section?: PublicSection;
  currentId?: string;
  onSelect?: React.MouseEventHandler<HTMLAnchorElement>;
}) {
  const Heading = headingLevel;
  return (
    <div className="gender-columns">
      {(["masculino", "feminino"] as const).map((gender) => {
        const items = disputes
          .filter((d) => d.context.gender === gender)
          .sort(
            (a, b) =>
              compareLabels(a.context.category, b.context.category) ||
              compareLabels(
                a.context.division ?? "",
                b.context.division ?? "",
              ) ||
              a.disputeId.localeCompare(b.disputeId),
          );
        if (!items.length) return null;
        const label = gender === "masculino" ? "Masculino" : "Feminino";
        return (
          <section key={gender} aria-label={label}>
            <Heading>{label}</Heading>
            <ul>
              {items.map(({ disputeId, context }) => (
                <li key={disputeId}>
                  <a
                    href={disputeLink(disputeId, section)}
                    aria-current={disputeId === currentId ? "true" : undefined}
                    onClick={onSelect}
                  >
                    {context.category}
                    {context.division && ` · ${context.division}`}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function CompetitionCatalog({
  games,
  confirmed,
}: {
  games: CatalogGame[];
  confirmed: PublicDispute[];
}) {
  const disputes = publicDisputes(games, confirmed);
  const years = new Map<number, Map<string, CatalogDispute[]>>();
  for (const dispute of disputes) {
    const { year, championshipId } = dispute.context;
    const championships =
      years.get(year) ?? new Map<string, CatalogDispute[]>();
    const edition = championships.get(championshipId) ?? [];
    edition.push(dispute);
    championships.set(championshipId, edition);
    years.set(year, championships);
  }
  if (!years.size) return <p>Nenhuma competição encontrada.</p>;
  return (
    <div className="competition-catalog">
      {[...years]
        .sort(([a], [b]) => b - a)
        .map(([year, championships]) => (
          <section key={year}>
            <h2>{year}</h2>
            {[...championships]
              .sort(
                ([a, gamesA], [b, gamesB]) =>
                  compareLabels(
                    gamesA[0].context.name,
                    gamesB[0].context.name,
                  ) || a.localeCompare(b),
              )
              .map(([id, edition]) => (
                <section key={id}>
                  <h3>{edition[0].context.name}</h3>
                  <DisputeLinks disputes={edition} headingLevel="h4" />
                </section>
              ))}
          </section>
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
          <CompetitionCatalog games={games} confirmed={confirmed} />
        ) : null
      }
    />
  );
}
