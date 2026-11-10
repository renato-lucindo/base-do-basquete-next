import {
  publicPlayerAccessibleName,
  publicPlayerName,
} from "../public-ui/player-name";
import { publicDetailLink } from "../public-ui/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { z } from "zod";
import { PublicHeader, PublicFooter } from "../public-ui/shell";
import { api } from "../competition/api";
import { publicResultSchema, type PublicResult } from "./pdf-contract";
import { STATISTICS_METRICS } from "../statistics/metrics";
import { parseFoul } from "../domain/scoresheet";
import { GameHint } from "./game-hint";
import {
  gameRows,
  gameTotals,
  gameLeaders,
  scoringKeys,
  periodName,
  periodShort,
  disciplineName,
  type GamePlayer,
  type Period,
  type Side,
} from "./game-view";
const sides: Side[] = ["home", "away"];
const metrics = [
  { key: "points", label: "PTS", name: STATISTICS_METRICS.points.name },
  { key: "two", label: "2P", name: STATISTICS_METRICS.twoMade.name },
  { key: "three", label: "3P", name: STATISTICS_METRICS.threeMade.name },
  { key: "free", label: "LL", name: STATISTICS_METRICS.freeMade.name },
  { key: "fouls", label: "F", name: STATISTICS_METRICS.foulsCommitted.name },
] as const;
const prettyNumber = (s: string | null) =>
  s ? s.replace(/^0+(?=\d)/u, "") || "0" : null;
const date = (s: string | null) => s?.split("-").reverse().join("/") ?? null;
const stat = (n: number | null) => (n === null ? "—" : n);
const percentage = (made: number, attempted: number | null) =>
  attempted
    ? `${((made / attempted) * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
    : "—";

export function PublicGameView({ result: r }: { result: PublicResult }) {
  const [period, setPeriod] = useState<Period>("all");
  const [selected, setSelected] = useState<GamePlayer | null>(null);
  const dialog = useRef<HTMLDialogElement>(null),
    closeButton = useRef<HTMLButtonElement>(null),
    opener = useRef<HTMLButtonElement | null>(null);
  const periods = r.facts.teams.home.periods;
  const article = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const align = () => {
      const rows = [
        ...(article.current?.querySelectorAll<HTMLTableRowElement>(
          ".roster-table tbody tr",
        ) ?? []),
      ];
      rows.forEach((row) => (row.style.height = ""));
      const tables = [
        ...(article.current?.querySelectorAll<HTMLTableElement>(
          ".roster-table",
        ) ?? []),
      ];
      const heights = Array.from({ length: 12 }, (_, index) =>
        Math.max(
          0,
          ...tables.map(
            (t) =>
              t.tBodies[0].rows[index]?.getBoundingClientRect().height ?? 0,
          ),
        ),
      );
      tables.forEach((t) =>
        [...t.tBodies[0].rows].forEach(
          (row, index) => (row.style.height = `${heights[index]}px`),
        ),
      );
      tables.forEach((t) => {
        const scroll = t.parentElement!,
          cells = t.tHead!.rows[0].cells;
        const fixed =
          cells[0].getBoundingClientRect().width +
          cells[1].getBoundingClientRect().width +
          cells[6].getBoundingClientRect().width;
        scroll.classList.toggle(
          "allow-full-scroll",
          fixed > scroll.clientWidth + 1,
        );
      });
    };
    align();
    window.addEventListener("resize", align);
    const widths = new WeakMap<Element, number>();
    let frame = 0;
    const observer = new ResizeObserver((entries) => {
      if (entries.some((e) => widths.get(e.target) !== e.contentRect.width)) {
        entries.forEach((e) => widths.set(e.target, e.contentRect.width));
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(align);
      }
    });
    article.current
      ?.querySelectorAll(".roster-table")
      .forEach((t) => observer.observe(t));
    return () => {
      window.removeEventListener("resize", align);
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [r, period]);
  useEffect(() => {
    if (!selected) {
      opener.current?.focus({ preventScroll: true });
      return;
    }
    dialog.current?.showModal();
    closeButton.current?.focus();
  }, [selected]);
  const choose = (value: Period) => {
    setSelected(null);
    setPeriod(value);
  };
  const foulEvents = selected
    ? r.details?.fouls.filter(
        (e) =>
          e.side === selected.side &&
          e.jersey === selected.jersey &&
          (period === "all" || e.period === period),
      )
    : undefined;
  return (
    <article
      ref={article}
      className="public-site scoresheet-public public-game"
    >
      <section className="game-context" aria-label="Dados da partida">
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
                    <th
                      key={i}
                      scope="col"
                      className={
                        period === i + 1 ? "selected-period" : undefined
                      }
                    >
                      <button
                        type="button"
                        className="period-link"
                        aria-pressed={period === i + 1}
                        aria-label={`${periodShort(i + 1)}: ${periodName(i + 1)}`}
                        disabled={!r.details}
                        onClick={() => choose(i + 1)}
                      >
                        {periodShort(i + 1)}
                      </button>
                    </th>
                  ))}
                  <th scope="col" className="period-total">
                    <button
                      type="button"
                      className="period-link"
                      aria-pressed={period === "all"}
                      onClick={() => choose("all")}
                    >
                      Total
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sides.map((side) => (
                  <tr key={side}>
                    <th scope="row">{r.game[side].name}</th>
                    {r.facts.teams[side].periods?.map((n, i) => (
                      <td
                        key={i}
                        className={
                          period === i + 1 ? "selected-period" : undefined
                        }
                      >
                        <span className="period-points">{n}</span>
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
        <p
          className="period-status"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {periodName(period)}
        </p>
        <div
          className="period-filter"
          role="group"
          aria-label="Recorte das estatísticas individuais"
        >
          {(["all", ...(periods?.map((_, i) => i + 1) ?? [])] as Period[]).map(
            (value) => (
              <button
                key={value}
                type="button"
                aria-pressed={period === value}
                aria-label={`${periodShort(value)}: ${periodName(value)}`}
                disabled={value !== "all" && !r.details}
                onClick={() => choose(value)}
              >
                {periodShort(value)}
              </button>
            ),
          )}
        </div>
      </div>
      <div className="teams-grid public-rosters">
        {sides.map((side) => {
          const rows = gameRows(r, side, period),
            totals = gameTotals(r, side, period),
            leaders = gameLeaders(rows),
            coach = r.staff[side];
          return (
            <section
              key={side}
              className="team-section public-roster"
              data-team={side}
            >
              <div className="team-heading">
                <h2>
                  <a
                    href={publicDetailLink(
                      `/equipe.html#${r.game[side].team.id}?disputeId=${r.disputeId}&registrationId=${r.game[side].registrationId}`,
                      r.disputeId,
                    )}
                  >
                    {r.game[side].name}
                  </a>
                </h2>
              </div>
              <div
                className="table-scroll public-athletes"
                role="region"
                aria-label={`Participações de ${r.game[side].name}: ${periodName(period)}`}
                tabIndex={0}
              >
                <table
                  className="roster-table"
                  aria-label="Participações e estatísticas publicadas"
                >
                  <caption className="sr-only">
                    {r.game[side].name}: {periodName(period)}. Titulares com
                    asterisco; CAP identifica o capitão.
                  </caption>
                  <colgroup>
                    <col className="jersey-col" />
                    <col className="name-col" />
                    {scoringKeys.map((key) => (
                      <col key={key} className="stat-col" />
                    ))}
                    <col className="foul-col" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th scope="col" className="jersey-cell">
                        Nº
                      </th>
                      <th scope="col" className="athlete-cell">
                        Atleta
                      </th>
                      {metrics.map((m) => (
                        <th
                          key={m.key}
                          scope="col"
                          className={
                            m.key === "points" ? "points-cell" : undefined
                          }
                        >
                          <GameHint
                            className="game-header-tip"
                            text={m.name}
                            aria-label={`${m.label}: ${m.name}`}
                          >
                            {m.label}
                          </GameHint>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((p) => {
                      const status = disciplineName(p),
                        gd = p.status === "GD" || p.status === "D";
                      const foulLabel = `${stat(p.fouls)}${gd ? " GD" : ""}`;
                      const unknown =
                        p.played === null
                          ? "Participação no período não informada"
                          : p.played === false
                            ? "Não participou"
                            : "Dado não informado";
                      return (
                        <tr
                          key={p.person.id}
                          data-jersey={p.jersey}
                          data-played={String(p.played)}
                          className={p.starter ? "starter" : undefined}
                        >
                          <td className="jersey-cell">{p.jersey}</td>
                          <th scope="row" className="athlete-cell">
                            <div className="athlete-line">
                              <span className="athlete-text">
                                <a
                                  className="athlete-name"
                                  title={p.person.name}
                                  aria-label={publicPlayerAccessibleName(
                                    p.person.name,
                                    p.person.nickname,
                                  )}
                                  href={publicDetailLink(
                                    `/atleta.html#${p.person.id}`,
                                    r.disputeId,
                                  )}
                                >
                                  {publicPlayerName(
                                    p.person.name,
                                    p.person.nickname,
                                  )}
                                </a>
                                {p.starter && (
                                  <span
                                    className="starter-symbol"
                                    role="img"
                                    aria-label="Titular do jogo"
                                  >
                                    {" "}
                                    *
                                  </span>
                                )}
                              </span>
                              {p.captain && (
                                <span
                                  className="captain"
                                  role="img"
                                  aria-label="Capitão"
                                >
                                  CAP
                                </span>
                              )}
                            </div>
                          </th>
                          {scoringKeys.map((key) => (
                            <td
                              key={key}
                              data-stat={key}
                              className={
                                key === "points" ? "points-cell" : undefined
                              }
                            >
                              {p[key] === null ? (
                                <span role="img" aria-label={unknown}>
                                  —
                                </span>
                              ) : p[key] > 0 && p[key] === leaders[key] ? (
                                <strong className="stat-leader">
                                  {p[key]}
                                </strong>
                              ) : (
                                p[key]
                              )}
                            </td>
                          ))}
                          <td className="foul-cell">
                            {p.played === false ? (
                              <span role="img" aria-label="Não participou">
                                —
                              </span>
                            ) : (
                              <GameHint
                                className={`foul-button${status ? " discipline" : ""}`}
                                text={status ?? "Faltas cometidas"}
                                aria-label={`${foulLabel}: ${p.person.name}. ${status ?? "Detalhar faltas"}. ${periodName(period)}`}
                                aria-haspopup="dialog"
                                onClick={(e) => {
                                  opener.current = e.currentTarget;
                                  setSelected(p);
                                }}
                              >
                                {foulLabel}
                              </GameHint>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {Array.from(
                      { length: Math.max(0, 12 - rows.length) },
                      (_, i) => (
                        <tr
                          key={`empty-${i}`}
                          className="filler"
                          aria-hidden="true"
                        >
                          <td className="jersey-cell" />
                          <td className="athlete-cell" />
                          <td />
                          <td />
                          <td />
                          <td />
                          <td />
                        </tr>
                      ),
                    )}
                  </tbody>
                  <tfoot>
                    <tr>
                      <th colSpan={2} scope="row" className="total-label">
                        Total da equipe
                      </th>
                      <td className="points-cell">{stat(totals.points)}</td>
                      <td>{totals.two}</td>
                      <td>{totals.three}</td>
                      <td className="total-free">
                        <span className="sr-only">LL da equipe: </span>
                        <span>
                          {totals.free}/{stat(totals.attempts)}
                        </span>
                        <small>
                          {totals.attempts === null ? (
                            <span className="sr-only">
                              tentativas não informadas
                            </span>
                          ) : (
                            percentage(totals.free, totals.attempts)
                          )}
                        </small>
                      </td>
                      <td>{stat(totals.fouls)}</td>
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
      <section className="legend table-legend" aria-labelledby="legend-title">
        <h2 id="legend-title">Legenda</h2>
        <dl>
          {[
            ["*", "Titular do jogo"],
            ["CAP", "Capitão"],
            ...metrics.map((m) => [m.label, m.name]),
            ["5", "Excluído por cinco faltas"],
            ["GD", "Desqualificado"],
            ["—", "Não participou ou dado não informado"],
          ].map(([code, name]) => (
            <div key={code}>
              <dt
                className={
                  code === "5" || code === "GD" ? "discipline-label" : undefined
                }
              >
                {code}
              </dt>
              <dd>{name}</dd>
            </div>
          ))}
        </dl>
      </section>
      {selected && (
        <dialog
          ref={dialog}
          aria-labelledby="public-foul-title"
          aria-describedby="foul-player"
          onCancel={() => setSelected(null)}
          onClose={() => setSelected(null)}
          onKeyDown={(e) => {
            if (e.key !== "Tab") return;
            const buttons = [
                ...e.currentTarget.querySelectorAll<HTMLButtonElement>(
                  "button:not([disabled])",
                ),
              ],
              first = buttons[0],
              last = buttons.at(-1);
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last?.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first?.focus();
            }
          }}
          onClick={(e) => {
            if (e.target !== e.currentTarget) return;
            const b = e.currentTarget.getBoundingClientRect();
            if (
              e.clientX < b.left ||
              e.clientX > b.right ||
              e.clientY < b.top ||
              e.clientY > b.bottom
            )
              setSelected(null);
          }}
        >
          <div className="dialog-header">
            <h2 id="public-foul-title">Faltas do atleta</h2>
            <button
              type="button"
              ref={closeButton}
              className="close-dialog"
              onClick={() => setSelected(null)}
            >
              Fechar
            </button>
          </div>
          <p
            id="foul-player"
            className="dialog-athlete"
            aria-label={publicPlayerAccessibleName(
              selected.person.name,
              selected.person.nickname,
            )}
          >
            {publicPlayerName(selected.person.name, selected.person.nickname)}
          </p>
          <p className="dialog-team">
            {r.game[selected.side].name} · Camisa {selected.jersey} —{" "}
            {periodName(period)}
          </p>
          <div className="foul-summary">
            <span>Faltas{period !== "all" ? " no período" : ""}</span>
            <strong>{stat(selected.fouls)}</strong>
          </div>
          {selected.fouls === null ? (
            <p className="missing-note">
              {selected.played === null
                ? "Participação no período não informada."
                : "Faltas não informadas."}
            </p>
          ) : foulEvents ? (
            foulEvents.length ? (
              <div className="foul-halves">
                {[
                  {
                    name: "1º tempo",
                    events: foulEvents.filter((e) => e.period <= 2),
                  },
                  {
                    name: "2º tempo",
                    events: foulEvents.filter(
                      (e) => e.period > 2 && e.period <= 4,
                    ),
                  },
                  {
                    name: "Prorrogação",
                    events: foulEvents.filter((e) => e.period > 4),
                  },
                ]
                  .filter((g) => g.events.length)
                  .map((g) => (
                    <section
                      key={g.name}
                      className="foul-half"
                      aria-label={g.name}
                    >
                      <h3>{g.name}</h3>
                      <ol className="foul-codes">
                        {g.events.map((e, i) => {
                          const foul = parseFoul(e.code, e.jersey)!;
                          const name = {
                            P: "Falta pessoal",
                            T: "Falta técnica",
                            U: "Falta antidesportiva",
                            D: "Falta desqualificante",
                            B: "Falta de banco",
                            C: "Falta do técnico",
                          }[foul.kind];
                          const penalty = foul.compensated
                            ? "Penalidade compensada"
                            : foul.freeThrows
                              ? `${foul.freeThrows} ${foul.freeThrows === 1 ? "lance livre" : "lances livres"} de penalidade`
                              : "Sem lances livres";
                          return (
                            <li
                              key={i}
                              className={
                                e.period <= 4 && e.period % 2
                                  ? "quarter-red"
                                  : "quarter-blue"
                              }
                            >
                              <GameHint
                                className="event-tip"
                                text={`${name} · ${penalty}`}
                                aria-label={`${e.code} ${periodShort(e.period)}: ${name}. ${penalty}`}
                              >
                                {foul.kind}
                                {foul.compensated ? (
                                  <sub>C</sub>
                                ) : foul.freeThrows ? (
                                  <sub>{foul.freeThrows}</sub>
                                ) : null}{" "}
                                <small>{periodShort(e.period)}</small>
                              </GameHint>
                            </li>
                          );
                        })}
                      </ol>
                    </section>
                  ))}
              </div>
            ) : (
              <p className="missing-note">Nenhuma falta registrada.</p>
            )
          ) : (
            <>
              {selected.technical !== null && (
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
              <p className="missing-note">
                Detalhes por período não informados nesta publicação.
              </p>
            </>
          )}
          {disciplineName(selected) && (
            <p className="discipline-status alert">
              {disciplineName(selected)}
            </p>
          )}
        </dialog>
      )}
    </article>
  );
}
export function PublicGamePage() {
  const [id, setId] = useState(() => location.hash.slice(1).split("?", 1)[0]);
  const [result, setResult] = useState<PublicResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [epoch, setEpoch] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const alert = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const read = () => setId(location.hash.slice(1).split("?", 1)[0]);
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
      <PublicHeader
        disputeId={result?.disputeId}
        context={result?.context}
        section="jogos"
        detail="Súmula"
      />
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
