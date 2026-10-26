import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { api } from "../competition/api";
import { publicResultSchema, type PublicResult } from "./pdf-contract";
const sourceName = (kind: "pdf" | "sheet" | undefined) =>
  kind === "sheet" ? "Súmula manual" : kind === "pdf" ? "PDF" : "Não informado";
const minute = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
export function PublicGameView({ result: r }: { result: PublicResult }) {
  const periods = r.facts.teams.home.periods,
    advanced = "origins" in r.facts ? r.facts : null;
  return (
    <article className="public-game">
      <h2>
        {r.game.home.name} {r.facts.teams.home.points} ×{" "}
        {r.facts.teams.away.points} {r.game.away.name}
      </h2>
      <p>
        {r.context.name} · {r.context.year} · {r.context.gender} ·{" "}
        {r.context.category}
        {r.context.division ? ` · ${r.context.division}` : ""}
      </p>
      {(r.game.date || r.game.time || r.game.venue) && (
        <p>
          {r.game.date?.split("-").reverse().join("/")}
          {r.game.time ? ` · ${r.game.time}` : ""}
          {r.game.venue ? ` · ${r.game.venue}` : ""}
        </p>
      )}
      <p>
        {r.source.kind === "sheet"
          ? "Súmula manual"
          : r.source.format === "BASKETBALL_SITE"
            ? "Boxscore Basketball Site"
            : "Boxscore FIBA"}
      </p>
      {advanced && (
        <p>
          Placar: {sourceName(advanced.origins.scorePoints.kind)} · Períodos:{" "}
          {sourceName(advanced.origins.periodScores?.kind)} · Estatísticas
          avançadas: {sourceName(advanced.origins.playerAdvanced?.kind)}
        </p>
      )}
      <p className="public-table-hint">
        Deslize as tabelas para consultar todas as colunas.
      </p>
      {periods ? (
        <div
          className="public-scroll public-periods"
          role="region"
          aria-label="Pontuação por período"
          tabIndex={0}
        >
          <table>
            <thead>
              <tr>
                <th>Equipe</th>
                {periods.map((_, i) => (
                  <th key={i}>{i < 4 ? `Q${i + 1}` : `OT${i - 3}`}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(["home", "away"] as const).map((side) => (
                <tr key={side}>
                  <th scope="row">{r.game[side].name}</th>
                  {r.facts.teams[side].periods?.map((n, i) => (
                    <td key={i}>{n}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>Períodos não informados.</p>
      )}
      {(["home", "away"] as const).map((side) => {
        const rows = r.facts.players
            .filter((p) => p.side === side)
            .sort(
              (a, b) =>
                Number(a.jersey) - Number(b.jersey) ||
                a.jersey.length - b.jersey.length,
            ),
          staff = r.staff[side],
          hasAdvanced = rows.some(
            (p) => "advanced" in p && p.advanced !== null,
          );
        return (
          <section key={side}>
            <h3>
              <a
                href={`/equipe.html#${r.game[side].team.id}?disputeId=${r.disputeId}&registrationId=${r.game[side].registrationId}`}
              >
                {r.game[side].name}
              </a>
            </h3>
            <p>
              Capitão: {staff.captain?.name} · Técnico: {staff.coach?.name}
              {staff.captainIsCoach ? " (capitão)" : ""}
              {staff.assistant
                ? ` · Ass. Técnico: ${staff.assistant.name}`
                : ""}
            </p>
            <div
              className="public-scroll"
              role="region"
              aria-label={`Participações de ${r.game[side].name}`}
              tabIndex={0}
            >
              <table>
                <caption>Participações e estatísticas publicadas</caption>
                <thead>
                  <tr>
                    <th>Camisa</th>
                    <th>Atleta</th>
                    <th>Participação</th>
                    <th>PTS</th>
                    <th>2C</th>
                    <th>3C</th>
                    <th>LLC</th>
                    {hasAdvanced && (
                      <>
                        <th>MIN</th>
                        <th>PTS avançados</th>
                        <th>REB</th>
                        <th>AST</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => {
                    const a = "advanced" in p ? p.advanced : null;
                    return (
                      <tr key={p.person.id}>
                        <td>{p.jersey}</td>
                        <th scope="row">
                          <a href={`/atleta.html#${p.person.id}`}>
                            {p.person.nickname || p.person.name}
                          </a>
                          {p.captain ? " · Capitão" : ""}
                        </th>
                        <td>
                          {p.played
                            ? p.starter
                              ? "Titular"
                              : "Participou"
                            : "Não participou"}
                        </td>
                        <td>{p.points}</td>
                        <td>{p.two}</td>
                        <td>{p.three}</td>
                        <td>{p.free}</td>
                        {hasAdvanced && (
                          <>
                            <td>
                              {a && p.played ? minute(a.secondsPlayed) : "—"}
                            </td>
                            <td>{a?.points ?? "—"}</td>
                            <td>{a?.rebounds ?? "—"}</td>
                            <td>{a?.assists ?? "—"}</td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
      {advanced?.origins.scorePoints.kind === "sheet" &&
        advanced.origins.playerAdvanced?.kind === "pdf" && (
          <p>
            Os pontos oficiais vêm da súmula manual. Os pontos avançados e
            minutos vêm do PDF e mantêm sua cobertura própria.
          </p>
        )}
    </article>
  );
}
export function PublicGamePage() {
  const [id, setId] = useState(() => location.hash.slice(1)),
    [result, setResult] = useState<PublicResult | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [epoch, setEpoch] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null),
    alert = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const change = () => setId(location.hash.slice(1));
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setResult(null);
    setError("");
    setLoading(true);
    if (!z.uuid().safeParse(id).success) {
      setError("Resultado não publicado ou não encontrado.");
      setLoading(false);
      return () => controller.abort();
    }
    void api(
      `/api/public/games/${id}`,
      publicResultSchema,
      undefined,
      controller.signal,
    )
      .then((r) => {
        if (!active) return;
        if (r.id !== id)
          throw Error("O resultado recebido não corresponde ao endereço.");
        setResult(r);
      })
      .catch((e) => {
        if (active)
          setError(
            e instanceof Error
              ? e.message
              : "Não foi possível carregar o resultado.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [id, epoch]);
  useEffect(() => {
    if (error) alert.current?.focus();
    else if (result) heading.current?.focus();
  }, [result, error]);
  return (
    <>
      <a
        className="access-skip"
        href="#conteudo"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("conteudo")?.focus();
        }}
      >
        Pular para o conteúdo
      </a>
      <header className="access-header">
        <span>Base do Basquete</span>
        <span className="access-preview">Ambiente de avaliação</span>
      </header>
      <main id="conteudo" tabIndex={-1} className="access-main public-result">
        <h1 tabIndex={-1} ref={heading}>
          Resultado publicado
        </h1>
        {loading && <p role="status">Carregando resultado…</p>}
        {error && (
          <>
            <p role="alert" tabIndex={-1} ref={alert}>
              {error}
            </p>
            <button onClick={() => setEpoch((n) => n + 1)}>
              Tentar novamente
            </button>
          </>
        )}
        {result && <PublicGameView result={result} />}
      </main>
    </>
  );
}
