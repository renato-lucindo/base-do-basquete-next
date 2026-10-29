import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import {
  PublicHeader,
  PublicBreadcrumb,
  PublicFooter,
} from "../public-ui/shell";
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
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const periods = r.facts.teams.home.periods;
  useEffect(() => {
    if (!selected) return;
    dialog.current?.showModal();
    closeButton.current?.focus();
    return () => opener.current?.focus({ preventScroll: true });
  }, [selected]);
  return (
    <article className="public-site scoresheet-public public-game">
      <PublicBreadcrumb
        context={r.context.name}
        page="Súmula"
        href={`/estatisticas.html#${r.disputeId}?scope=all`}
      />
      <section
        className="game-context"
        aria-label="Dados da partida"
        title={`${r.context.name} · ${r.context.year} · ${r.context.category}${r.context.division ? ` · ${r.context.division}` : ""}`}
      >
        <strong>
          {prettyNumber(r.game.number)
            ? `Jogo ${prettyNumber(r.game.number)}`
            : r.context.category}
        </strong>
        <p>
          {[date(r.game.date), r.game.time, r.game.venue]
            .filter(Boolean)
            .join(" · ") || "Data, horário e local não informados"}
        </p>
      </section>
      <section className="period-section" aria-label="Parciais">
        {periods ? (
          <div
            className="period-scroll public-periods"
            role="region"
            aria-label="Parciais e placar final"
            tabIndex={0}
          >
            <table className="period-table">
              <thead>
                <tr>
                  <th scope="col">Equipe</th>
                  {periods.map((_, i) => (
                    <th key={i} scope="col">
                      <span className="period-heading">
                        {i < 4 ? `${i + 1}º Q` : `${i - 3}ª PR`}
                      </span>
                    </th>
                  ))}
                  <th scope="col" className="period-total">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {sides.map((side) => (
                  <tr key={side}>
                    <th scope="row">{r.game[side].name}</th>
                    {r.facts.teams[side].periods?.map((n, i) => (
                      <td key={i}>
                        <span className="period-points">{n}</span>
                        {"foulsByPeriod" in r.facts.teams[side] && (
                          <span
                            className="period-fouls"
                            aria-label={`${r.facts.teams[side].foulsByPeriod[i]} faltas coletivas no ${periodName(i)}`}
                            title={`Faltas coletivas: ${r.facts.teams[side].foulsByPeriod[i]}`}
                          >
                            F{r.facts.teams[side].foulsByPeriod[i]}
                          </span>
                        )}
                      </td>
                    ))}
                    <td className="period-total">
                      <strong className="period-points">
                        {r.facts.teams[side].points}
                      </strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="score-unavailable" role="status">
            <strong>
              {r.game.home.name} {r.facts.teams.home.points} ×{" "}
              {r.facts.teams.away.points} {r.game.away.name}
            </strong>
            <p>Parciais indisponíveis na publicação.</p>
          </div>
        )}
      </section>
      <div className="teams-heading">
        <div
          className="period-filter"
          role="group"
          aria-label="Recorte das estatísticas individuais"
        >
          <button type="button" aria-pressed="true">
            Jogo todo
          </button>
          {periods?.map((_, i) => (
            <button
              key={i}
              type="button"
              disabled
              title="Estatísticas individuais por período não disponíveis na publicação"
            >
              {i < 4 ? `${i + 1}º Q` : `${i - 3}ª PR`}
            </button>
          ))}
        </div>
      </div>
      <div className="teams-grid public-rosters">
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
          const sumFouls = rows.every(
            (p) => !p.played || playerFouls(p) !== null,
          )
            ? rows.reduce((n, p) => n + (playerFouls(p) ?? 0), 0)
            : null;
          const teamFacts = r.facts.teams[side];
          const freeMade =
            "freeMade" in teamFacts ? teamFacts.freeMade : total("free");
          // Makes and attempts may only be paired when their published origins agree.
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
          const percent = freeTaken
            ? `${((100 * freeMade) / freeTaken).toFixed(1).replace(".", ",")}%`
            : "—";
          return (
            <section
              key={side}
              className="team-section public-roster"
              data-team={side}
            >
              <div className="team-heading">
                <h2>
                  <a
                    href={`/equipe.html#${r.game[side].team.id}?disputeId=${r.disputeId}&registrationId=${r.game[side].registrationId}`}
                  >
                    {r.game[side].name}
                  </a>
                </h2>
              </div>
              <p className="scroll-hint">
                <span>Deslize para ver todas as estatísticas</span>
                <span>2P · 3P · LL · F</span>
              </p>
              <div
                className="table-scroll public-athletes"
                role="region"
                aria-label={`Participações de ${r.game[side].name}`}
                tabIndex={0}
              >
                <table
                  className="roster-table"
                  aria-label="Participações e estatísticas publicadas"
                >
                  <caption className="sr-only">
                    {r.game[side].name}. Titulares em negrito e asterisco; CAP
                    identifica o capitão.
                  </caption>
                  <colgroup>
                    <col className="jersey-col" />
                    <col />
                    {[0, 1, 2, 3, 4].map((n) => (
                      <col key={n} className="stat-col" />
                    ))}
                  </colgroup>
                  <thead>
                    <tr>
                      <th scope="col" className="jersey-cell">
                        Nº
                      </th>
                      <th scope="col" className="athlete-cell">
                        Atleta
                      </th>
                      {(["PTS", "2P", "3P", "LL", "F"] as const).map((k) => (
                        <th
                          scope="col"
                          key={k}
                          className={k === "PTS" ? "points-cell" : undefined}
                        >
                          <abbr
                            title={
                              k === "PTS"
                                ? "Pontos totais"
                                : k === "LL"
                                  ? "Lances livres convertidos"
                                  : k === "F"
                                    ? "Faltas cometidas"
                                    : `Cestas de ${k[0]} pontos convertidas`
                            }
                          >
                            {k}
                          </abbr>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((p) => {
                      const fouls = playerFouls(p),
                        status = playerStatus(p);
                      return (
                        <tr
                          key={p.person.id}
                          className={[
                            p.starter ? "starter" : "",
                            !p.played ? "did-not-play" : "",
                          ].join(" ")}
                        >
                          <td className="jersey-cell">{p.jersey}</td>
                          <th scope="row" className="athlete-cell">
                            <div className="athlete-line">
                              <span className="athlete-text">
                                <a
                                  className="athlete-name"
                                  href={`/atleta.html#${p.person.id}`}
                                >
                                  {p.person.nickname || p.person.name}
                                </a>
                                {p.starter && (
                                  <span className="starter-symbol"> *</span>
                                )}
                                {status && (
                                  <span className="discipline-label">
                                    {" "}
                                    {status}
                                  </span>
                                )}
                              </span>
                              {p.captain && (
                                <span className="captain" title="Capitão">
                                  CAP
                                </span>
                              )}
                            </div>
                          </th>
                          <td className="points-cell">
                            {p.played ? p.points : "—"}
                          </td>
                          <td>{p.played ? p.two : "—"}</td>
                          <td>{p.played ? p.three : "—"}</td>
                          <td>{p.played ? p.free : "—"}</td>
                          <td className="foul-cell">
                            {fouls === null ? (
                              "—"
                            ) : (
                              <button
                                className={`foul-button${status ? " discipline" : ""}`}
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
                      <th colSpan={2} scope="row" className="total-label">
                        Total da equipe
                      </th>
                      <td className="points-cell">{total("points")}</td>
                      <td>{total("two")}</td>
                      <td>{total("three")}</td>
                      <td className="total-free">
                        <span className="sr-only">LL da equipe: </span>
                        <span>
                          {freeMade}/{freeTaken === null ? "—" : freeTaken}
                        </span>
                        <small>
                          {freeTaken === null
                            ? "tentativas não informadas"
                            : percent}
                        </small>
                      </td>
                      <td>{stat(sumFouls)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <dl className="staff">
                <div>
                  <dt>Técnico</dt>
                  <dd>
                    {coach.coach?.name ?? "—"}
                    {coach.captainIsCoach ? " (capitão)" : ""}
                  </dd>
                </div>
                <div>
                  <dt>Auxiliar</dt>
                  <dd>{coach.assistant?.name ?? "—"}</dd>
                </div>
              </dl>
            </section>
          );
        })}
      </div>
      <section className="legend" aria-labelledby="legend-title">
        <h2 id="legend-title">Legenda</h2>
        <dl>
          {[
            ["* Titular", "Nome em negrito e asterisco"],
            ["CAP", "Capitão da equipe"],
            ["PTS", "Pontos totais"],
            ["2P / 3P", "Cestas de dois / três pontos"],
            ["LL", "Lances livres convertidos"],
            ["F", "Faltas cometidas"],
          ].map(([code, label]) => (
            <div key={code}>
              <dt>{code}</dt>
              <dd>{label}</dd>
            </div>
          ))}
        </dl>
        <div className="legend-notes">
          <p>
            <strong>5F:</strong> exclusão por cinco faltas.{" "}
            <strong>GD/D:</strong> desqualificação. <strong>—:</strong> não
            participou ou dado sem cobertura.
          </p>
          <p>
            Estatísticas individuais por quarto e faltas detalhadas por período,
            horário e penalidade não constam na projeção publicada.
          </p>
        </div>
      </section>
      {selected && (
        <dialog
          ref={dialog}
          aria-labelledby="public-foul-title"
          aria-describedby="foul-player"
          onCancel={() => setSelected(null)}
          onClose={() => setSelected(null)}
          onClick={(e) => {
            if (e.target !== e.currentTarget) return;
            const box = e.currentTarget.getBoundingClientRect();
            if (
              e.clientX < box.left ||
              e.clientX > box.right ||
              e.clientY < box.top ||
              e.clientY > box.bottom
            )
              setSelected(null);
          }}
        >
          <div className="dialog-header">
            <h2 id="public-foul-title">Faltas do atleta</h2>
            <button
              className="close-dialog"
              ref={closeButton}
              onClick={() => setSelected(null)}
            >
              Fechar
            </button>
          </div>
          <p id="foul-player" className="dialog-athlete">
            {selected.person.name}
          </p>
          <p className="dialog-team">
            {r.game[selected.side].name} · Camisa {selected.jersey}
            {selected.captain ? " · Capitão" : ""}
          </p>
          <div className="foul-summary">
            <span>Faltas</span>
            <strong>{playerFouls(selected)}</strong>
          </div>
          {"technical" in selected && (
            <dl className="foul-breakdown">
              <div>
                <dt>Técnicas (T)</dt>
                <dd>{selected.technical}</dd>
              </div>
              <div>
                <dt>Antidesportivas (U)</dt>
                <dd>{selected.unsportsmanlike}</dd>
              </div>
            </dl>
          )}
          {playerStatus(selected) && (
            <p className="discipline-status alert">
              {playerStatus(selected) === "5F"
                ? "Excluído por cinco faltas"
                : `Desqualificado (${playerStatus(selected)})`}
            </p>
          )}
          <p className="missing-note">
            Os eventos por período, os horários e os lances livres de penalidade
            não estão disponíveis nesta publicação.
          </p>
        </dialog>
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
    <div className="public-site scoresheet-public">
      <a
        className="skip"
        href="#conteudo"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("conteudo")?.focus();
        }}
      >
        Pular para o conteúdo
      </a>
      <PublicHeader />
      <main id="conteudo" tabIndex={-1} className="wrap">
        <h1 className="sr-only" tabIndex={-1} ref={heading}>
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
      <PublicFooter />
    </div>
  );
}
