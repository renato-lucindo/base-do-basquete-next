import { useEffect, useId, useRef, useState } from "react";
import { selectPublicGames, type PublicGameRow } from "./games-model";
import { publicDetailLink } from "./navigation";
import { teamDetailLink } from "../team-statistics/navigation";
import "./games-list.css";

export type { PublicGameRow } from "./games-model";
const formatDate = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" });
const read = () =>
  new URLSearchParams(window.location.hash.split("?")[1] ?? "")
    .get("buscaJogos")
    ?.slice(0, 120) ?? "";

export function PublicGamesTable({ games }: { games: PublicGameRow[] }) {
  const [search, setSearch] = useState(read);
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onHash = () => {
      const [id, query = ""] = window.location.hash.slice(1).split("?", 2);
      const params = new URLSearchParams(query);
      if (params.has("paginaJogos")) {
        params.delete("paginaJogos");
        window.history.replaceState(
          window.history.state,
          "",
          `#${id}?${params}`,
        );
      }
      setSearch(read());
    };
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  function update(value: string) {
    const [id, query = ""] = window.location.hash.slice(1).split("?", 2);
    const params = new URLSearchParams(query);
    if (value) params.set("buscaJogos", value);
    else params.delete("buscaJogos");
    params.delete("paginaJogos");
    window.history.replaceState(window.history.state, "", `#${id}?${params}`);
    setSearch(value);
  }
  function clear() {
    update("");
    inputRef.current?.focus();
  }
  const rows = selectPublicGames(games, search);
  return (
    <section className="public-games-block" aria-label="Jogos da disputa">
      <div className="public-games-tools public-games-search">
        <div className="public-game-search-field">
          <label htmlFor={inputId}>Buscar jogo</label>
          <div className="public-game-search-controls">
            <input
              id={inputId}
              ref={inputRef}
              name="buscaJogos"
              type="search"
              value={search}
              maxLength={120}
              autoComplete="off"
              placeholder="Equipe ou local"
              onChange={(e) => update(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape" && search) {
                  e.preventDefault();
                  clear();
                }
              }}
            />
            {search && (
              <button type="button" onClick={clear}>
                Limpar
              </button>
            )}
          </div>
        </div>
        <p role="status" aria-live="polite" aria-atomic="true">
          {rows.length}{" "}
          {rows.length === 1 ? "jogo encontrado" : "jogos encontrados"}
        </p>
      </div>
      {!!rows.length && (
        <ol className="public-games-list" aria-label="Jogos por data">
          {rows.map((game) => {
            const phase = game.phase
              ? game.phase +
                (game.seriesGame === null ? "" : ` · Jogo ${game.seriesGame}`)
              : "";
            const context = [phase, game.walkover ? "W.O." : ""]
              .filter(Boolean)
              .join(" - ");
            return (
              <li
                key={game.id}
                className="public-game-row"
                data-game-id={game.id}
              >
                <div className="public-game-meta">
                  <span>Nº do jogo: {game.number?.trim() || "a definir"}</span>
                  <span>
                    {game.date ? (
                      <time dateTime={game.date}>
                        {formatDate.format(new Date(`${game.date}T12:00:00Z`))}
                      </time>
                    ) : (
                      "Data a definir"
                    )}
                    {" · "}
                    {game.time ? (
                      <time dateTime={game.time}>{game.time}</time>
                    ) : (
                      "Horário a definir"
                    )}
                  </span>
                </div>
                <div className="public-game-matchup">
                  <span className="public-game-home">
                    {game.homeProfile ? (
                      <a
                        href={teamDetailLink(
                          game.disputeId,
                          game.homeProfile.teamId,
                          game.homeProfile.registrationId,
                        )}
                      >
                        {game.home}
                      </a>
                    ) : (
                      game.home
                    )}
                  </span>
                  <span
                    className={`public-game-score${game.score ? " has-score" : ""}`}
                  >
                    {game.published && game.score ? (
                      <a
                        href={publicDetailLink(
                          `/resultado.html#${game.id}`,
                          game.disputeId,
                        )}
                        aria-label={`Ver jogo: ${game.home} ${game.score.home} a ${game.score.away} ${game.away}`}
                      >
                        <span>{game.score.home}</span>
                        <span
                          className="public-game-separator"
                          aria-hidden="true"
                        >
                          ×
                        </span>
                        <span>{game.score.away}</span>
                      </a>
                    ) : game.score ? (
                      <>
                        <span>{game.score.home}</span>
                        <span
                          className="public-game-separator"
                          aria-hidden="true"
                        >
                          ×
                        </span>
                        <span className="public-visually-hidden"> a </span>
                        <span>{game.score.away}</span>
                      </>
                    ) : (
                      <span role="img" aria-label="Sem placar publicado">
                        —
                      </span>
                    )}
                  </span>
                  <span className="public-game-away">
                    {game.awayProfile ? (
                      <a
                        href={teamDetailLink(
                          game.disputeId,
                          game.awayProfile.teamId,
                          game.awayProfile.registrationId,
                        )}
                      >
                        {game.away}
                      </a>
                    ) : (
                      game.away
                    )}
                  </span>
                </div>
                {context && <div className="public-game-phase">{context}</div>}
                <div className="public-game-venue">
                  {game.venue?.trim() || "Local a definir"}
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {!rows.length && (
        <div className="public-game-empty">
          <p>Nenhum jogo encontrado.</p>
          {search && (
            <>
              <p>Tente outra equipe ou local.</p>
              <button type="button" onClick={clear}>
                Limpar busca
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}
