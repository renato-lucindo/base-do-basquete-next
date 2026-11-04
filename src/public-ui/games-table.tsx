import { useEffect, useState } from "react";
import { publicDetailLink } from "./navigation";

export type PublicGameRow = {
  id: string;
  disputeId: string;
  home: string;
  away: string;
  date: string | null;
  time: string | null;
  venue: string | null;
  score: { home: number; away: number } | null;
  status: string;
  published: boolean;
};
const formatDate = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" });
const read = () => {
  const p = new URLSearchParams(window.location.hash.split("?")[1] ?? "");
  const n = Number(p.get("paginaJogos"));
  return {
    search: (p.get("buscaJogos") ?? "").slice(0, 120),
    page: Number.isSafeInteger(n) && n > 0 ? n : 1,
  };
};
const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR");

export function PublicGamesTable({ games }: { games: PublicGameRow[] }) {
  const [query, setQuery] = useState(read);
  useEffect(() => {
    const onHash = () => setQuery(read());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  function update(next: typeof query) {
    const [id, search = ""] = window.location.hash.slice(1).split("?", 2);
    const p = new URLSearchParams(search);
    if (next.search) p.set("buscaJogos", next.search);
    else p.delete("buscaJogos");
    if (next.page > 1) p.set("paginaJogos", String(next.page));
    else p.delete("paginaJogos");
    window.history.replaceState(window.history.state, "", `#${id}?${p}`);
    setQuery(next);
  }
  const rows = [...games]
    .sort(
      (a, b) =>
        (a.date ?? "9999").localeCompare(b.date ?? "9999") ||
        (a.time ?? "99").localeCompare(b.time ?? "99") ||
        a.id.localeCompare(b.id),
    )
    .filter((g) =>
      normalize(`${g.home} ${g.away} ${g.venue ?? ""}`).includes(
        normalize(query.search.trim()),
      ),
    );
  const pages = Math.max(1, Math.ceil(rows.length / 20)),
    page = Math.min(query.page, pages);
  return (
    <section className="public-games-block" aria-label="Jogos da disputa">
      <div className="public-games-tools">
        <label>
          Buscar jogo
          <input
            name="buscaJogos"
            type="search"
            value={query.search}
            autoComplete="off"
            placeholder="Equipe ou local"
            onChange={(e) => update({ search: e.target.value, page: 1 })}
          />
        </label>
        <p role="status">
          {rows.length} {rows.length === 1 ? "jogo" : "jogos"}
        </p>
      </div>
      <div
        className="public-games public-table-scroll"
        role="region"
        aria-label="Tabela de jogos"
        tabIndex={0}
      >
        <table>
          <caption className="public-visually-hidden">Jogos por data</caption>
          <thead>
            <tr>
              <th scope="col">Confronto</th>
              <th scope="col" className="public-numeric">
                Placar
              </th>
              <th scope="col">Local</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice((page - 1) * 20, page * 20).map((g) => (
              <tr key={g.id}>
                <th scope="row">
                  {g.published ? (
                    <a
                      href={publicDetailLink(
                        `/resultado.html#${g.id}`,
                        g.disputeId,
                      )}
                    >
                      {g.home} × {g.away}
                    </a>
                  ) : (
                    <span>
                      {g.home} × {g.away}
                    </span>
                  )}
                  <small>
                    <time dateTime={g.date ?? undefined}>
                      {g.date
                        ? formatDate.format(new Date(`${g.date}T12:00:00Z`))
                        : "Data a definir"}{" "}
                      · {g.time ?? "Horário a definir"}
                    </time>
                  </small>
                  {!g.published && <small>{g.status}</small>}
                </th>
                <td className="public-numeric">
                  {g.score ? (
                    `${g.score.home} × ${g.score.away}`
                  ) : (
                    <span aria-label="Sem placar publicado">—</span>
                  )}
                </td>
                <td>{g.venue ?? "Local a definir"}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={3}>Nenhum jogo neste recorte.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {rows.length > 20 && (
        <nav className="public-games-pager" aria-label="Paginação dos jogos">
          <button
            type="button"
            disabled={page === 1}
            onClick={() => update({ ...query, page: page - 1 })}
          >
            Jogos anteriores
          </button>
          <span>
            Página {page} de {pages}
          </span>
          <button
            type="button"
            disabled={page === pages}
            onClick={() => update({ ...query, page: page + 1 })}
          >
            Próximos jogos
          </button>
        </nav>
      )}
    </section>
  );
}
