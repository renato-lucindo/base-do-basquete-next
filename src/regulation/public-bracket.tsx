import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import type { PublicStandings } from "./public-contract";
import {
  bracketFormats,
  publicBracket,
  type BracketCard,
} from "./public-bracket-model";
import { useNameTooltip } from "../statistics/reference/tooltip";
import "./public-bracket.css";

function Format({ format }: { format: BracketCard["format"] }) {
  const entry = bracketFormats[format],
    tip = useNameTooltip(entry.description);
  return format.startsWith("best_of_") ? (
    <button type="button" className="knockout-format" {...tip}>
      {entry.label}
    </button>
  ) : (
    <span className="knockout-format">{entry.label}</span>
  );
}

function Match({
  card,
  names,
  seriesNames,
  mixedFormats,
}: {
  card: BracketCard;
  names: ReadonlyMap<string, string>;
  seriesNames: ReadonlyMap<string, string>;
  mixedFormats: boolean;
}) {
  const entries = [
    { id: card.homeId, reference: card.homeReference },
    { id: card.awayId, reference: card.awayReference },
  ];
  const origin = (reference: BracketCard["homeReference"]) =>
    reference.kind === "series_winner" || reference.kind === "series_loser"
      ? `${reference.kind === "series_winner" ? "Vencedor" : "Perdedor"} de ${seriesNames.get(reference.seriesId) ?? "confronto anterior"}`
      : "Participante a definir";
  return (
    <article
      className="knockout-card"
      data-series-id={card.id}
      data-state={card.status}
      data-incomplete={!card.homeId || !card.awayId ? "true" : undefined}
      aria-labelledby={`knockout-${card.id}`}
      style={{ "--match-row": card.row } as CSSProperties}
    >
      <h3 id={`knockout-${card.id}`} className="sr-only">
        {card.name}
      </h3>
      <div className="knockout-score-frame">
        <table
          className="knockout-score-table"
          aria-label={`Jogos da ${card.name}`}
        >
          <colgroup>
            <col />
            {card.slots.map((s) => (
              <col key={s.slot} className="knockout-score-column" />
            ))}
            {card.total && <col className="knockout-score-column" />}
          </colgroup>
          <thead>
            <tr>
              <th scope="col">
                {mixedFormats ? (
                  <Format format={card.format} />
                ) : (
                  <span className="sr-only">Equipe</span>
                )}
              </th>
              {card.slots.map((s) => (
                <th key={s.slot} scope="col">
                  Jogo {s.slot}
                </th>
              ))}
              {card.total && <th scope="col">Total</th>}
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, i) => (
              <tr
                key={i}
                data-unknown={!entry.id ? "true" : undefined}
                data-qualified={
                  !!entry.id && card.winnerId === entry.id ? "true" : undefined
                }
              >
                <th scope="row" className="knockout-team">
                  {entry.id ? (
                    (names.get(entry.id) ?? "Equipe confirmada")
                  ) : (
                    <>
                      A definir
                      <span className="sr-only">
                        : {origin(entry.reference)}
                      </span>
                    </>
                  )}
                  {!!entry.id && card.winnerId === entry.id && (
                    <span className="sr-only">, classificada</span>
                  )}
                </th>
                {card.slots.map((slot) => {
                  const points = i === 0 ? slot.homePoints : slot.awayPoints,
                    won = !!entry.id && slot.winnerId === entry.id;
                  return (
                    <td
                      key={slot.slot}
                      className="knockout-score"
                      data-winner={won ? "true" : undefined}
                    >
                      {points ?? "—"}
                      {won && (
                        <span className="sr-only">
                          {slot.state === "awarded"
                            ? ", vitória por decisão administrativa"
                            : ", vitória"}
                        </span>
                      )}
                      {points === null && slot.state === "awarded" && (
                        <span className="sr-only">, placar não informado</span>
                      )}
                    </td>
                  );
                })}
                {card.total && (
                  <td className="knockout-score">
                    {(i === 0
                      ? card.total.homePoints
                      : card.total.awayPoints) ?? "—"}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {card.status === "conflict" && (
        <p className="knockout-state">
          Confronto em revisão após alteração dos resultados.
        </p>
      )}
      {card.status === "tied" && (
        <p className="knockout-state">Empate agregado: decisão pendente.</p>
      )}
    </article>
  );
}

export function PublicBracket({ value }: { value: PublicStandings }) {
  const model = useMemo(() => publicBracket(value), [value]);
  const names = useMemo(
    () => new Map(value.registrations.map((r) => [r.id, r.name])),
    [value],
  );
  const seriesNames = useMemo(
    () => new Map(value.definition.series.map((s) => [s.id, s.name])),
    [value],
  );
  const board = useRef<HTMLDivElement>(null),
    scroller = useRef<HTMLDivElement>(null);
  const [paths, setPaths] = useState<
    { key: string; kind: string; d: string }[]
  >([]);
  const [arrows, setArrows] = useState({ previous: false, next: false });
  useLayoutEffect(() => {
    const root = board.current!,
      scroll = scroller.current!;
    let frame = 0;
    const draw = () => {
      const cards = new Map(
        [...root.querySelectorAll<HTMLElement>("[data-series-id]")].map((c) => [
          c.dataset.seriesId!,
          c,
        ]),
      );
      const maxHeight = Math.max(
        1,
        ...[...cards.values()].map((c) => c.offsetHeight),
      );
      const headings = [
        ...root.querySelectorAll<HTMLElement>(".knockout-round-heading > *"),
      ];
      const headingHeight =
        Math.max(0, ...headings.map((h) => h.offsetHeight)) + 8;
      root.style.setProperty("--knockout-card-height", `${maxHeight + 1}px`);
      root.style.setProperty("--knockout-heading-height", `${headingHeight}px`);
      const r = root.getBoundingClientRect();
      const rects = new Map(
        [...cards].map(([id, card]) => [id, card.getBoundingClientRect()]),
      );
      const svg = root.querySelector("svg")!;
      svg.setAttribute("viewBox", `0 0 ${r.width} ${r.height}`);
      setPaths(
        model.edges.map((e, i) => {
          const from = rects.get(e.from)!,
            to = rects.get(e.to)!;
          const x1 = from.right - r.left,
            y1 = from.top + from.height / 2 - r.top,
            x2 = to.left - r.left,
            y2 = to.top + to.height / 2 - r.top,
            mid = (x1 + x2) / 2;
          return {
            key: `${e.from}:${e.to}:${i}`,
            kind: e.kind,
            d: `M${x1},${y1} H${mid} V${y2} H${x2}`,
          };
        }),
      );
      updateArrows();
    };
    const updateArrows = () =>
      setArrows({
        previous: scroll.scrollLeft > 2,
        next: scroll.scrollLeft < scroll.scrollWidth - scroll.clientWidth - 2,
      });
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(draw);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(root);
    observer.observe(scroll);
    root
      .querySelectorAll("[data-series-id]")
      .forEach((c) => observer.observe(c));
    root
      .querySelectorAll(".knockout-round-heading > *")
      .forEach((h) => observer.observe(h));
    scroll.addEventListener("scroll", updateArrows, { passive: true });
    draw();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      scroll.removeEventListener("scroll", updateArrows);
    };
  }, [model]);
  const pan = (direction: number) => {
    const first = board.current?.querySelector<HTMLElement>(".knockout-round");
    if (!first || !board.current) return;
    scroller.current?.scrollBy({
      left:
        direction *
        (first.offsetWidth +
          parseFloat(getComputedStyle(board.current).columnGap)),
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  };
  return (
    <div className="public-knockout">
      <div className="knockout-controls">
        <button
          type="button"
          aria-label="Rolar quadro para a esquerda"
          aria-controls="knockout-scroll"
          disabled={!arrows.previous}
          onClick={() => pan(-1)}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="m14 6-6 6 6 6" />
          </svg>
        </button>
        <button
          type="button"
          aria-label="Rolar quadro para a direita"
          aria-controls="knockout-scroll"
          disabled={!arrows.next}
          onClick={() => pan(1)}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="m10 6 6 6-6 6" />
          </svg>
        </button>
      </div>
      <div
        ref={scroller}
        id="knockout-scroll"
        className="knockout-scroll"
        role="region"
        aria-label="Confrontos da eliminatória"
        tabIndex={0}
      >
        <div
          ref={board}
          className="knockout-board"
          style={{ "--bracket-rows": model.rows } as CSSProperties}
        >
          <svg className="knockout-connections" aria-hidden="true">
            {paths.map((p) => (
              <path key={p.key} d={p.d} data-kind={p.kind} />
            ))}
          </svg>
          {model.columns.map((column) => {
            const formats = new Set(column.cards.map((c) => c.format));
            const columns = Math.max(
              ...column.cards.map((c) => c.slots.length + (c.total ? 1 : 0)),
            );
            return (
              <section
                key={column.id}
                className="knockout-round"
                aria-labelledby={`knockout-round-${column.index}`}
                style={{ "--score-columns": columns } as CSSProperties}
              >
                <div className="knockout-round-heading">
                  <h2 id={`knockout-round-${column.index}`}>{column.name}</h2>
                  {formats.size === 1 && (
                    <Format format={column.cards[0].format} />
                  )}
                </div>
                <div className="knockout-matches">
                  {column.cards.map((card) => (
                    <Match
                      key={card.id}
                      card={card}
                      names={names}
                      seriesNames={seriesNames}
                      mixedFormats={formats.size > 1}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
