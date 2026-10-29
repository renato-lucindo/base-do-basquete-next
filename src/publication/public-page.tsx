import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { api } from "../competition/api";
import { publicResultSchema, type PublicResult } from "./pdf-contract";

type Side = "home" | "away";
type Player = PublicResult["facts"]["players"][number];
const sides: Side[] = ["home", "away"];
const periodName = (i: number) => (i < 4 ? `Q${i + 1}` : `PR${i - 3}`);
const prettyNumber = (s: string | null) =>
  s ? s.replace(/^0+(?=\d)/u, "") || "0" : null;
const date = (s: string | null) => s?.split("-").reverse().join("/") ?? null;
const stat = (v: number | null) => (v === null ? "—" : v);
function playerFouls(p: Player): number | null {
  if (!p.played) return null;
  if ("fouls" in p) return p.fouls;
  return p.advanced?.foulsCommitted ?? null;
}
function playerStatus(p: Player) {
  if ("status" in p && p.status !== "eligible")
    return p.status === "excluded" ? "5F" : p.status;
  return null;
}

export function PublicGameView({ result: r }: { result: PublicResult }) {
  const [selected, setSelected] = useState<Player | null>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const periods = r.facts.teams.home.periods;
  useEffect(() => {
    if (!selected) return;
    closeButton.current?.focus();
    const esc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setSelected(null);
      }
      if (event.key === "Tab") {
        event.preventDefault();
        closeButton.current?.focus();
      }
    };
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("keydown", esc);
      opener.current?.focus();
    };
  }, [selected]);

  return (
    <article className="public-game">
      <div className="public-game-context">
        <span>
          {prettyNumber(r.game.number)
            ? `Jogo ${prettyNumber(r.game.number)}`
            : r.context.category}
        </span>
        {r.game.date && <span>{date(r.game.date)}</span>}
        {r.game.time && <span>{r.game.time}</span>}
        {r.game.venue && <span>{r.game.venue}</span>}
      </div>
      <div className="public-score-label">
        {r.context.name} · {r.context.year} · {r.context.category}
        {r.context.division ? ` · ${r.context.division}` : ""}
      </div>
      {periods ? (
        <div
          className="public-scroll public-periods"
          role="region"
          aria-label="Parciais e placar final"
          tabIndex={0}
        >
          <table>
            <thead>
              <tr>
                <th scope="col">Equipe</th>
                {periods.map((_, i) => (
                  <th key={i} scope="col">
                    {periodName(i)}
                  </th>
                ))}
                <th scope="col">Total</th>
              </tr>
            </thead>
            <tbody>
              {sides.map((side) => (
                <tr key={side}>
                  <th scope="row">{r.game[side].name}</th>
                  {r.facts.teams[side].periods?.map((n, i) => (
                    <td key={i}>
                      <strong>{n}</strong>
                      {"foulsByPeriod" in r.facts.teams[side] && (
                        <small
                          aria-label={
                            String(r.facts.teams[side].foulsByPeriod[i]) +
                            " faltas coletivas no " +
                            periodName(i)
                          }
                          title={
                            "Faltas coletivas: " +
                            r.facts.teams[side].foulsByPeriod[i]
                          }
                        >
                          F {r.facts.teams[side].foulsByPeriod[i]}
                        </small>
                      )}
                    </td>
                  ))}
                  <td className="public-final-score">
                    {r.facts.teams[side].points}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="public-score-fallback" role="status">
          {r.game.home.name} {r.facts.teams.home.points} ×{" "}
          {r.facts.teams.away.points} {r.game.away.name}
          <small>Parciais indisponíveis na publicação.</small>
        </div>
      )}
      <div
        className="public-period-select"
        aria-label="Recorte das estatísticas individuais"
      >
        <span>Atletas ·</span>
        <strong>Jogo todo</strong>
        <span
          className="public-muted"
          title="A projeção pública não registra números individuais por período."
        >
          Por quarto: sem dados publicados
        </span>
      </div>
      <div className="public-rosters">
        {sides.map((side) => {
          const rows = r.facts.players
            .filter((p) => p.side === side)
            .sort(
              (a, b) =>
                Number(a.jersey) - Number(b.jersey) ||
                a.jersey.length - b.jersey.length,
            );
          const coach = r.staff[side];
          const total = (key: "points" | "two" | "three" | "free") =>
            rows.reduce((n, p) => n + (p.played ? p[key] : 0), 0);
          const knownFouls = rows.every(
            (p) => !p.played || playerFouls(p) !== null,
          );
          const sumFouls = knownFouls
            ? rows.reduce((n, p) => n + (playerFouls(p) ?? 0), 0)
            : null;
          const teamFacts = r.facts.teams[side];
          const freeMade =
            "freeMade" in teamFacts ? teamFacts.freeMade : total("free");
          // A manual score and PDF shot attempts may disagree by design.
          // Only show shooting percentage when makes and attempts share a source.
          const manualPdfScore =
            "origins" in r.facts &&
            r.facts.origins.scorePoints.kind === "sheet";
          const freeTaken = manualPdfScore
            ? null
            : "freeTaken" in teamFacts
              ? teamFacts.freeTaken
              : rows.every(
                    (p) =>
                      !p.played || ("advanced" in p && p.advanced !== null),
                  )
                ? rows.reduce(
                    (n, p) =>
                      n +
                      ("advanced" in p
                        ? (p.advanced?.freeThrows.attempted ?? 0)
                        : 0),
                    0,
                  )
                : null;
          return (
            <section key={side} className="public-roster">
              <h2>
                <a
                  href={`/equipe.html#${r.game[side].team.id}?disputeId=${r.disputeId}&registrationId=${r.game[side].registrationId}`}
                >
                  {r.game[side].name}
                </a>
              </h2>
              <div
                className="public-scroll public-athletes"
                role="region"
                aria-label={`Participações de ${r.game[side].name}`}
                tabIndex={0}
              >
                <table aria-label="Participações e estatísticas publicadas">
                  <thead>
                    <tr>
                      <th scope="col">Nº</th>
                      <th scope="col">Atleta</th>
                      {(["PTS", "2P", "3P", "LL", "F"] as const).map((k) => (
                        <th
                          scope="col"
                          title={
                            k === "PTS"
                              ? "Pontos"
                              : k === "LL"
                                ? "Lances livres convertidos"
                                : k === "F"
                                  ? "Faltas cometidas"
                                  : `Cestas de ${k[0]} convertidas`
                          }
                          key={k}
                        >
                          {k}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((p) => {
                      const fouls = playerFouls(p);
                      const status = playerStatus(p);
                      return (
                        <tr
                          key={p.person.id}
                          className={status ? "public-excluded" : undefined}
                        >
                          <td className="public-jersey">{p.jersey}</td>
                          <th scope="row">
                            <div className="public-athlete-name">
                              <a
                                href={`/atleta.html#${p.person.id}`}
                                className={p.starter ? "public-starter" : ""}
                              >
                                {p.person.nickname || p.person.name}
                                {p.starter ? " *" : ""}
                              </a>
                              {p.captain && <small title="Capitão">CAP</small>}
                            </div>
                            {status && (
                              <span className="public-status">{status}</span>
                            )}
                          </th>
                          <td>{p.played ? p.points : "—"}</td>
                          <td>{p.played ? p.two : "—"}</td>
                          <td>{p.played ? p.three : "—"}</td>
                          <td>{p.played ? p.free : "—"}</td>
                          <td>
                            {fouls === null ? (
                              "—"
                            ) : fouls === 0 ? (
                              "0"
                            ) : (
                              <button
                                className="public-foul-button"
                                title={`Ver cobertura de faltas de ${p.person.name}`}
                                aria-label={`${fouls} faltas, detalhes de ${p.person.name}`}
                                onClick={(e) => {
                                  opener.current = e.currentTarget;
                                  setSelected(p);
                                }}
                              >
                                {fouls}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <th colSpan={2} scope="row">
                        Total
                      </th>
                      <td>{total("points")}</td>
                      <td>{total("two")}</td>
                      <td>{total("three")}</td>
                      <td>{total("free")}</td>
                      <td>{stat(sumFouls)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="public-free-throws">
                LL da equipe:{" "}
                {freeTaken === null
                  ? `${freeMade} convertidos · tentativas não informadas`
                  : `${freeMade}/${freeTaken} · ${freeTaken ? `${((100 * freeMade) / freeTaken).toFixed(1).replace(".", ",")}%` : "—"}`}
              </div>
              <div className="public-staff">
                <strong>Comissão técnica</strong>
                <span>
                  Técnico: {coach.coach?.name ?? "—"}
                  {coach.captainIsCoach ? " (capitão)" : ""}
                </span>
                {coach.assistant && (
                  <span>Assistente: {coach.assistant.name}</span>
                )}
              </div>
            </section>
          );
        })}
      </div>
      <p className="public-legend">
        * Titular · CAP Capitão · 5F Exclusão por faltas · GD/D Desqualificação
        · — Não participou ou dado sem cobertura. Faltas detalhadas por período
        e penalidades não constam na projeção publicada.
      </p>
      {selected && (
        <div
          className="public-dialog-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelected(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="public-foul-title"
            className="public-foul-dialog"
          >
            <div className="public-dialog-head">
              <h2 id="public-foul-title">Faltas · {selected.person.name}</h2>
              <button ref={closeButton} onClick={() => setSelected(null)}>
                Fechar
              </button>
            </div>
            <p>
              <strong>{playerFouls(selected)}</strong> faltas registradas no
              jogo.
            </p>
            {"technical" in selected && (
              <p>
                Técnicas (T): {selected.technical} · Antidesportivas (U):{" "}
                {selected.unsportsmanlike}
              </p>
            )}
            <p>
              Os eventos por período, os horários e os lances livres de
              penalidade não estão disponíveis nesta publicação.
            </p>
          </div>
        </div>
      )}
    </article>
  );
}
export function PublicGamePage() {
  const [id, setId] = useState(() => location.hash.slice(1));
  const [result, setResult] = useState<PublicResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [epoch, setEpoch] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const alert = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const read = () => setId(location.hash.slice(1));
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
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
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("conteudo")?.focus();
        }}
      >
        Pular para o conteúdo
      </a>
      <header className="access-header">
        <a href="/foundation.html">Base do Basquete</a>
        <span className="access-preview">Resultados publicados</span>
      </header>
      <main id="conteudo" tabIndex={-1} className="access-main public-result">
        <h1 className="public-screen-title" tabIndex={-1} ref={heading}>
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
