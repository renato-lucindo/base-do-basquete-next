import { useEffect, useRef, useState, type ReactNode } from "react";
import { z } from "zod";
import { PublicHeader, PublicFooter } from "../public-ui/shell";
import { publicDetailLink } from "../public-ui/navigation";
import { api, ApiFailure } from "../competition/api";
import { publicResultSchema } from "../publication/pdf-contract";
import { DataTable, type Column } from "../ui-system/components";
import { loadPublicCareer } from "./public-loader";
import {
  careerGroups,
  careerStatistics,
  chronologicalGames,
  PROFILE_METRICS,
  metricLabel,
  type ProfileMetric,
  type PublicCareer,
} from "./public-model";
import { STATISTICS_METRICS } from "../statistics/metrics";
import type { ConfirmedPlayerGame } from "./participation-contract";

const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const date = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
        new Date(`${value}T12:00:00Z`),
      )
    : "Data não informada";
const sections = [
  ["resumo", "Resumo"],
  ["conquistas", "Conquistas e honrarias"],
  ["estatisticas", "Estatísticas"],
  ["jogos", "Jogos"],
  ["historico", "Histórico"],
  ["evolucao", "Evolução"],
] as const;
const extras = ["jogos", "historico", "evolucao"];
type View = {
  year: string;
  championship: string;
  teams: string[] | null;
  mode: "per-game" | "total";
  scope: string;
  columns: ProfileMetric[];
  panels: string[];
  page: number;
  statsPage: number;
  sort: string;
  direction: "asc" | "desc";
  section: string;
};
function readLocation() {
  const [id = "", search = ""] = window.location.hash.slice(1).split("?", 2),
    p = new URLSearchParams(search);
  const section = sections.some(([key]) => key === p.get("secao"))
    ? p.get("secao")!
    : "resumo";
  const panels = [
    ...new Set(
      (p.get("paineisPerfil") ?? "")
        .split(",")
        .filter((key) => extras.includes(key)),
    ),
  ];
  if (extras.includes(section) && !p.has("paineisPerfil")) panels.push(section);
  return {
    id: z.uuid().safeParse(id).success ? id.toLowerCase() : null,
    origin: z.uuid().safeParse(p.get("disputeId")).success
      ? p.get("disputeId")
      : null,
    view: {
      year: p.get("anoPerfil") ?? "",
      championship: p.get("campeonatoPerfil") ?? "",
      teams: p.has("equipesPerfil")
        ? p.get("equipesPerfil")!.split(",").filter(Boolean)
        : null,
      mode: p.get("mode") === "total" ? "total" : "per-game",
      scope: ["regular", "playoffs"].includes(p.get("scope") ?? "")
        ? p.get("scope")!
        : "all",
      columns: p.has("colunasPerfil")
        ? PROFILE_METRICS.filter((m) =>
            p.get("colunasPerfil")!.split(",").includes(m),
          )
        : matchMedia("(max-width: 600px)").matches
          ? ["points"]
          : [...PROFILE_METRICS],
      panels,
      page: Math.max(1, Math.min(500, Math.floor(Number(p.get("page")) || 1))),
      statsPage: Math.max(
        1,
        Math.min(500, Math.floor(Number(p.get("paginaCampeonatos")) || 1)),
      ),
      sort: [
        "competition",
        "team",
        "jersey",
        "games",
        ...PROFILE_METRICS,
      ].includes(p.get("ordemPerfil") ?? "")
        ? p.get("ordemPerfil")!
        : "year",
      direction: p.get("direcaoPerfil") === "asc" ? "asc" : "desc",
      section,
    } as View,
  };
}
function query(view: View, origin: string | null) {
  const p = new URLSearchParams({ secao: view.section, mode: view.mode });
  if (origin) p.set("disputeId", origin);
  if (view.year) p.set("anoPerfil", view.year);
  if (view.championship) p.set("campeonatoPerfil", view.championship);
  if (view.teams !== null) p.set("equipesPerfil", view.teams.join(","));
  if (view.scope !== "all") p.set("scope", view.scope);
  p.set("colunasPerfil", view.columns.join(","));
  p.set("paineisPerfil", view.panels.join(","));
  if (view.page > 1) p.set("page", String(view.page));
  if (view.statsPage > 1) p.set("paginaCampeonatos", String(view.statsPage));
  if (view.sort !== "year") p.set("ordemPerfil", view.sort);
  p.set("direcaoPerfil", view.direction);
  return p.toString();
}
function Cell({
  summary,
  metric,
}: {
  summary: ReturnType<typeof careerStatistics>;
  metric: ProfileMetric;
}) {
  const cell = summary?.metrics[metric];
  return cell?.status === "available" ? (
    number.format(cell.value)
  ) : (
    <span title="Informação indisponível ou cobertura incompleta">—</span>
  );
}
function Metrics({
  games,
  id,
  mode,
  columns,
}: {
  games: ConfirmedPlayerGame[];
  id: string;
  mode: View["mode"];
  columns: ProfileMetric[];
}) {
  const summary = careerStatistics(games, id, mode);
  return (
    <>
      {columns.map((metric) => (
        <td key={metric} className="player-numeric">
          <Cell summary={summary} metric={metric} />
        </td>
      ))}
    </>
  );
}
function Metadata({ career }: { career: PublicCareer }) {
  const m = career.page.identity.metadata;
  const values: [string, ReactNode][] = m
    ? [
        ["Posição", m.position],
        ["Ano de nascimento", m.publicBirthYear],
        ["Altura", m.heightCm === null ? null : `${m.heightCm} cm`],
        [
          "Peso",
          m.weightKg === null ? null : `${number.format(m.weightKg)} kg`,
        ],
        [
          "Mão dominante",
          m.dominantHand
            ? { left: "Esquerda", right: "Direita", both: "Ambidestra" }[
                m.dominantHand
              ]
            : null,
        ],
        ["Origem", [m.originCity, m.originState].filter(Boolean).join(" · ")],
      ]
    : [];
  return (
    <>
      <dl className="player-metadata">
        {values
          .filter(([, v]) => v !== null && v !== "")
          .map(([k, v]) => (
            <div key={k}>
              <dt>{k}:</dt>
              <dd>{v}</dd>
            </div>
          ))}
      </dl>
      {m?.biography && <p className="player-biography">{m.biography}</p>}
    </>
  );
}
function Honors({ career }: { career: PublicCareer }) {
  const d = career.page;
  return (
    <aside className="player-honors" aria-labelledby="conquistas">
      <h2 id="conquistas" tabIndex={-1}>
        Conquistas e honrarias
      </h2>
      {!d.honors.length && !d.teamPlacements.length ? (
        <p>Nenhuma conquista publicada.</p>
      ) : (
        <>
          {!!d.honors.length && (
            <>
              <h3>Honrarias individuais</h3>
              <ul>
                {d.honors.map((h) => (
                  <li key={`${h.disputeId}/${h.honor.id}`}>
                    <strong>{h.honor.title}</strong>
                    <small>
                      {h.context.name} · {h.context.year} · {h.context.gender} ·{" "}
                      {h.context.category}
                      {h.context.division ? ` · ${h.context.division}` : ""}
                    </small>
                  </li>
                ))}
              </ul>
            </>
          )}
          {!!d.teamPlacements.length && (
            <>
              <h3>Colocações das equipes</h3>
              <ul>
                {d.teamPlacements.map((h) => (
                  <li key={`${h.disputeId}/${h.registration.registrationId}`}>
                    <strong>
                      {h.position}º lugar · {h.registration.name}
                    </strong>
                    <small>
                      {h.context.name} · {h.context.year} · {h.context.gender} ·{" "}
                      {h.context.category}
                      {h.context.division ? ` · ${h.context.division}` : ""}
                    </small>
                  </li>
                ))}
              </ul>
              <p className="player-note">
                Colocação coletiva; não representa premiação individual do
                atleta.
              </p>
            </>
          )}
        </>
      )}
    </aside>
  );
}
function Table({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      className="player-scroll"
      role="region"
      aria-label={label}
      tabIndex={0}
    >
      <table>
        <caption className="player-sr-only">{label}</caption>
        {children}
      </table>
    </div>
  );
}
function Games({
  games,
  recent = false,
}: {
  games: ConfirmedPlayerGame[];
  recent?: boolean;
}) {
  const [scores, setScores] = useState<Record<string, string>>({});
  const ids = games.map((g) => g.fact.gameId).join(",");
  useEffect(() => {
    const controller = new AbortController();
    setScores({});
    // Fetch only visible rows. A corrected result is not paired with an older participation.
    let cursor = 0;
    async function read() {
      while (cursor < games.length && !controller.signal.aborted) {
        const g = games[cursor++];
        try {
          const result = await api(
            `/api/public/games/${g.fact.gameId}`,
            publicResultSchema,
            undefined,
            controller.signal,
          );
          if (controller.signal.aborted) return;
          if (
            result.id === g.fact.gameId &&
            result.disputeId === g.fact.disputeId &&
            result.version === g.fact.publicationVersion &&
            result.publishedAt === g.fact.publishedAt
          )
            setScores((s) => ({
              ...s,
              [g.fact.gameId]:
                `${result.facts.teams.home.points} × ${result.facts.teams.away.points}`,
            }));
        } catch {
          /* Keep unavailable separate from a zero score. */
        }
      }
    }
    void Promise.all([read(), read(), read()]);
    return () => controller.abort();
    // The validated career is immutable for a visit; row IDs determine this read.
  }, [ids]);
  const columns: Column<ConfirmedPlayerGame>[] = [
    { key: "date", label: "Data", render: (g) => date(g.game.date) },
    {
      key: "game",
      label: "Confronto",
      primary: true,
      render: (g) => (
        <>
          <a
            href={publicDetailLink(
              `/resultado.html#${g.fact.gameId}`,
              g.fact.disputeId,
            )}
          >
            {g.game.home.name} × {g.game.away.name}
          </a>
          <small>
            {recent && (
              <span className="player-recent-date">{date(g.game.date)} · </span>
            )}
            {g.fact.context.name} · {g.fact.context.year} ·{" "}
            {g.fact.context.category}
          </small>
        </>
      ),
    },
    {
      key: "score",
      label: "Placar",
      numeric: true,
      render: (g) => (
        <span
          title={
            scores[g.fact.gameId]
              ? "Placar final"
              : "Placar indisponível nesta leitura; consulte a súmula"
          }
        >
          {scores[g.fact.gameId] ?? "—"}
        </span>
      ),
    },
    {
      key: "points",
      label: "PTS",
      numeric: true,
      description: "Pontos do jogador",
      render: (g) => (g.fact.played ? (g.fact.scoring?.points ?? "—") : "—"),
    },
  ];
  if (!recent)
    columns.push({
      key: "played",
      label: "Participação",
      render: (g) => (
        <>
          {!g.fact.played
            ? "Não participou"
            : g.fact.starter
              ? "Titular"
              : "Participou"}
          {g.fact.captain ? " · CAP" : ""}
          <small>
            {g.fact.registration.name} · Camisa {g.fact.jersey}
          </small>
        </>
      ),
    });
  return (
    <DataTable
      label={recent ? "Três últimos jogos" : "Jogos confirmados"}
      columns={columns}
      rows={games}
      rowId={(g) => g.fact.gameId}
      empty="Ainda não há jogos confirmados neste recorte."
    />
  );
}
function CheckOptions({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: { id: string; name: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  return (
    <details
      className="player-options"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.currentTarget.open = false;
          e.currentTarget.querySelector("summary")?.focus();
        }
      }}
    >
      <summary>
        {label} <span>{selected.length}</span>
      </summary>
      <fieldset>
        <legend className="player-sr-only">{label}</legend>
        <div className="player-option-actions">
          <button
            type="button"
            onClick={() => onChange(options.map((o) => o.id))}
          >
            Todas
          </button>
          <button type="button" onClick={() => onChange([])}>
            Nenhuma
          </button>
        </div>
        {options.map((o) => (
          <label key={o.id}>
            <input
              type="checkbox"
              name={label}
              value={o.id}
              checked={selected.includes(o.id)}
              onChange={(e) =>
                onChange(
                  e.target.checked
                    ? [...selected, o.id]
                    : selected.filter((id) => id !== o.id),
                )
              }
            />
            {o.name}
          </label>
        ))}
      </fieldset>
    </details>
  );
}
export function PlayerPublicPage() {
  const [route, setRoute] = useState(readLocation),
    [career, setCareer] = useState<PublicCareer | null>(null),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  const restored = useRef(false);
  const alert = useRef<HTMLDivElement>(null);
  const { id, origin, view } = route;
  useEffect(() => {
    const read = () => setRoute(readLocation());
    window.addEventListener("hashchange", read);
    window.addEventListener("popstate", read);
    return () => {
      window.removeEventListener("hashchange", read);
      window.removeEventListener("popstate", read);
    };
  }, []);
  useEffect(() => {
    setCareer(null);
    setError("");
    restored.current = false;
    if (!id) {
      setError("Abra o perfil a partir de um atleta identificado.");
      return;
    }
    const controller = new AbortController();
    void loadPublicCareer(id, controller.signal)
      .then((next) => {
        if (!controller.signal.aborted) setCareer(next);
      })
      .catch((e: unknown) => {
        if (!controller.signal.aborted)
          setError(
            e instanceof ApiFailure
              ? e.message
              : "Não foi possível consultar o perfil. Tente novamente.",
          );
      });
    return () => controller.abort();
  }, [id, retry]);
  const ready = career?.page.personId === id ? career : null;
  useEffect(() => {
    if (error) alert.current?.focus();
  }, [error]);
  useEffect(() => {
    const save = () => {
      try {
        sessionStorage.setItem(
          `player-scroll:${location.pathname}${location.hash}`,
          String(window.scrollY),
        );
      } catch {
        /* Browsing without storage remains usable. */
      }
    };
    window.addEventListener("pagehide", save);
    return () => window.removeEventListener("pagehide", save);
  }, []);
  useEffect(() => {
    if (!ready || restored.current) return;
    restored.current = true;
    let saved: string | null = null;
    try {
      saved = sessionStorage.getItem(
        `player-scroll:${location.pathname}${location.hash}`,
      );
    } catch {
      /* Optional restoration. */
    }
    const frame = requestAnimationFrame(() => {
      if (saved !== null && Number.isFinite(Number(saved)))
        window.scrollTo(0, Number(saved));
      else if (view.section !== "resumo") {
        const el = document.getElementById(view.section);
        el?.focus({ preventScroll: true });
        el?.scrollIntoView();
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [ready, view.section]);
  function update(patch: Partial<View>, jump = false) {
    const affectsRows = [
      "year",
      "championship",
      "teams",
      "scope",
      "sort",
      "direction",
    ].some((k) => k in patch);
    const next = {
      ...view,
      ...(affectsRows ? { statsPage: 1 } : {}),
      ...patch,
    };
    window.history[jump ? "pushState" : "replaceState"](
      window.history.state,
      "",
      `#${id}?${query(next, origin)}`,
    );
    setRoute({ ...route, view: next });
    if (jump)
      requestAnimationFrame(() => {
        const el = document.getElementById(next.section);
        el?.focus({ preventScroll: true });
        el?.scrollIntoView();
      });
  }
  const groups = ready ? careerGroups(ready) : [];
  const teams = [
    ...new Map(
      groups.map((g) => [
        g.history.registration.team.id,
        {
          id: g.history.registration.team.id,
          name: g.history.registration.team.name,
        },
      ]),
    ).values(),
  ];
  const selected = view.teams ?? teams.map((t) => t.id);
  const years = [...new Set(groups.map((g) => g.history.context.year))].sort(
    (a, b) => b - a,
  );
  const championships = [
    ...new Map(
      groups.map((g) => [
        g.history.context.championshipId,
        { id: g.history.context.championshipId, name: g.history.context.name },
      ]),
    ).values(),
  ];
  const inPhase = (g: ConfirmedPlayerGame) =>
    view.scope === "all" ||
    g.fact.phase === (view.scope === "regular" ? "round_robin" : "knockout");
  const filtered = groups
    .filter(
      (g) =>
        (!view.year || String(g.history.context.year) === view.year) &&
        (!view.championship ||
          g.history.context.championshipId === view.championship) &&
        selected.includes(g.history.registration.team.id),
    )
    .map((g) => ({ ...g, games: g.games.filter(inPhase) }));
  const filteredGames = chronologicalGames(filtered.flatMap((g) => g.games));
  const summaries = new Map(
    filtered.map((g) => [g.key, careerStatistics(g.games, id!, view.mode)]),
  );
  const ordered = [...filtered].sort((a, b) => {
    const value = (g: typeof a): string | number | null => {
      if (view.sort === "competition")
        return `${g.history.context.name} ${g.history.context.year} ${g.history.context.category}`;
      if (view.sort === "team") return g.history.registration.name;
      if (view.sort === "jersey") return g.history.jerseys.join(" / ");
      if (view.sort === "games")
        return g.games.filter((p) => p.fact.played).length;
      if (view.sort === "year") return g.history.context.year;
      return (
        summaries.get(g.key)?.metrics[view.sort as ProfileMetric]?.value ?? null
      );
    };
    const av = value(a),
      bv = value(b);
    if (av === null || bv === null)
      return av === bv ? a.key.localeCompare(b.key) : av === null ? 1 : -1;
    const diff =
      typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av).localeCompare(String(bv), "pt-BR", {
            numeric: true,
            sensitivity: "base",
          });
    return (
      (view.direction === "asc" ? diff : -diff) || a.key.localeCompare(b.key)
    );
  });
  const statsPage = Math.min(
    view.statsPage,
    Math.max(1, Math.ceil(ordered.length / 20)),
  );
  const latest = years[0];
  const summaryRows = [
    {
      label: latest ? String(latest) : "Temporada mais recente",
      games: ready?.games.filter((g) => g.fact.context.year === latest) ?? [],
    },
    { label: "Carreira", games: ready?.games ?? [] },
  ];
  const statsColumns: Column<(typeof groups)[number]>[] = [
    {
      key: "competition",
      label: "Campeonato",
      primary: true,
      render: (g) => (
        <>
          {g.history.context.name}
          <small>
            {g.history.context.year} · {g.history.context.gender} ·{" "}
            {g.history.context.category}
            {g.history.context.division
              ? ` · ${g.history.context.division}`
              : ""}
            <span className="player-mobile-id">
              <br />
              {g.history.registration.name} · Camisa{" "}
              {g.history.jerseys.join(" / ")}
            </span>
          </small>
        </>
      ),
    },
    {
      key: "team",
      label: "Equipe",
      render: (g) => (
        <span className="player-team-cell">
          <a
            href={publicDetailLink(
              `/equipe.html#${g.history.registration.team.id}?registrationId=${g.history.registration.registrationId}`,
              g.history.disputeId,
            )}
          >
            {g.history.registration.name}
          </a>
        </span>
      ),
    },
    {
      key: "jersey",
      label: "Camisa",
      render: (g) => g.history.jerseys.join(" / "),
    },
    {
      key: "games",
      label: "J",
      numeric: true,
      description: "Participações confirmadas em quadra",
      render: (g) => g.games.filter((p) => p.fact.played).length,
    },
    ...view.columns.map((metric) => ({
      key: metric,
      label: metricLabel(metric),
      numeric: true,
      description: STATISTICS_METRICS[metric].name,
      render: (g: (typeof groups)[number]) => (
        <Cell summary={summaries.get(g.key) ?? null} metric={metric} />
      ),
    })),
  ];
  const page = Math.min(
    view.page,
    Math.max(1, Math.ceil(filteredGames.length / 20)),
  );
  return (
    <>
      <a
        className="access-skip"
        href="#player-content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("player-content")?.focus();
        }}
      >
        Pular para o perfil
      </a>
      <PublicHeader
        disputeId={origin}
        section="jogadores"
        detail={ready?.page.identity.name ?? "Perfil do atleta"}
      />
      <main
        id="player-content"
        tabIndex={-1}
        className="access-main player-page bb-ui"
      >
        {error ? (
          <div className="access-error" role="alert" ref={alert} tabIndex={-1}>
            <h1>Perfil do atleta</h1>
            <p>{error}</p>
            {id && (
              <button onClick={() => setRetry((n) => n + 1)}>
                Tentar novamente
              </button>
            )}
          </div>
        ) : !ready ? (
          <>
            <h1>Perfil do atleta</h1>
            <p role="status">Consultando perfil e participações publicadas…</p>
          </>
        ) : (
          <>
            <div
              className={`player-overview ${ready.page.honors.length || ready.page.teamPlacements.length ? "player-with-honors" : ""}`}
            >
              <header className="player-identity">
                <h1>{ready.page.identity.name}</h1>
                {ready.page.identity.nickname && (
                  <p className="player-nickname">
                    {ready.page.identity.nickname}
                  </p>
                )}
                <Metadata career={ready} />
              </header>
              <Honors career={ready} />
            </div>
            <section className="player-summary" aria-labelledby="resumo">
              <h2 id="resumo" tabIndex={-1}>
                Resumo <small>Médias por jogo</small>
              </h2>
              <Table label="Resumo de temporada e carreira">
                <thead>
                  <tr>
                    <th scope="col">Resumo</th>
                    <th scope="col" className="player-numeric">
                      <abbr title="Jogos com participação confirmada">J</abbr>
                    </th>
                    {PROFILE_METRICS.map((m) => (
                      <th key={m} scope="col" className="player-numeric">
                        <abbr title={STATISTICS_METRICS[m].name}>
                          {metricLabel(m)}
                        </abbr>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {summaryRows.map((row) => (
                    <tr key={row.label}>
                      <th scope="row">{row.label}</th>
                      <td className="player-numeric">
                        {row.games.filter((g) => g.fact.played).length}
                      </td>
                      <Metrics
                        games={row.games}
                        id={id!}
                        mode="per-game"
                        columns={[...PROFILE_METRICS]}
                      />
                    </tr>
                  ))}
                </tbody>
              </Table>
            </section>
            <nav className="player-navigation" aria-label="Seções do perfil">
              {sections.map(([key, label]) => (
                <a
                  key={key}
                  href={`#${id}?${query({ ...view, section: key, panels: extras.includes(key) ? [...new Set([...view.panels, key])] : view.panels }, origin)}`}
                  onClick={(e) => {
                    if (
                      e.button ||
                      e.ctrlKey ||
                      e.metaKey ||
                      e.shiftKey ||
                      e.altKey
                    )
                      return;
                    e.preventDefault();
                    update(
                      {
                        section: key,
                        panels: extras.includes(key)
                          ? [...new Set([...view.panels, key])]
                          : view.panels,
                      },
                      true,
                    );
                  }}
                >
                  {label}
                </a>
              ))}
            </nav>
            <section className="player-recent" aria-labelledby="recentes">
              <div className="player-section-title">
                <h2 id="recentes">Três últimos jogos</h2>
                <a
                  href={`#${id}?${query({ ...view, section: "jogos", panels: [...new Set([...view.panels, "jogos"])] }, origin)}`}
                  onClick={(e) => {
                    if (
                      e.button ||
                      e.ctrlKey ||
                      e.metaKey ||
                      e.shiftKey ||
                      e.altKey
                    )
                      return;
                    e.preventDefault();
                    update(
                      {
                        section: "jogos",
                        page: 1,
                        panels: [...new Set([...view.panels, "jogos"])],
                      },
                      true,
                    );
                  }}
                >
                  Ver todos os jogos
                </a>
              </div>
              <Games
                recent
                games={chronologicalGames(
                  ready.games.filter((g) => g.fact.played),
                ).slice(0, 3)}
              />
            </section>
            <section
              className="player-championships"
              aria-labelledby="estatisticas"
            >
              <h2 id="estatisticas" tabIndex={-1}>
                Estatísticas por campeonato
              </h2>
              <div className="player-filters">
                <label>
                  Ano
                  <select
                    name="anoPerfil"
                    value={view.year}
                    onChange={(e) => update({ year: e.target.value, page: 1 })}
                  >
                    <option value="">Todos</option>
                    {years.map((year) => (
                      <option key={year}>{year}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Campeonato
                  <select
                    name="campeonatoPerfil"
                    value={view.championship}
                    onChange={(e) =>
                      update({ championship: e.target.value, page: 1 })
                    }
                  >
                    <option value="">Todos</option>
                    {championships.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <CheckOptions
                  label="Equipes"
                  options={teams}
                  selected={selected}
                  onChange={(ids) => update({ teams: ids, page: 1 })}
                />
                <label>
                  Valores
                  <select
                    name="mode"
                    value={view.mode}
                    onChange={(e) =>
                      update({ mode: e.target.value as View["mode"] })
                    }
                  >
                    <option value="per-game">Médias por jogo</option>
                    <option value="total">Totais</option>
                  </select>
                </label>
                <label>
                  Fase
                  <select
                    name="scope"
                    value={view.scope}
                    onChange={(e) => update({ scope: e.target.value, page: 1 })}
                  >
                    <option value="all">Todas</option>
                    <option value="regular">Regular</option>
                    <option value="playoffs">Eliminatórias</option>
                  </select>
                </label>
                <CheckOptions
                  label="Colunas"
                  options={PROFILE_METRICS.map((m) => ({
                    id: m,
                    name: `${metricLabel(m)} · ${STATISTICS_METRICS[m].name}`,
                  }))}
                  selected={view.columns}
                  onChange={(ids) =>
                    update({
                      columns: PROFILE_METRICS.filter((m) => ids.includes(m)),
                    })
                  }
                />
              </div>
              <div className="player-championship-table">
                <DataTable
                  label="Estatísticas por campeonato"
                  columns={statsColumns.map((c) => ({ ...c, sortable: true }))}
                  sort={{ key: view.sort, direction: view.direction }}
                  onSort={(key) =>
                    update({
                      sort: key,
                      direction:
                        view.sort === key && view.direction === "asc"
                          ? "desc"
                          : "asc",
                    })
                  }
                  rows={ordered.slice((statsPage - 1) * 20, statsPage * 20)}
                  rowId={(g) => g.key}
                  empty="Nenhuma participação neste recorte."
                />
              </div>
              {ordered.length > 20 && (
                <nav
                  className="player-pager"
                  aria-label="Paginação de campeonatos"
                >
                  <button
                    disabled={statsPage === 1}
                    onClick={() => update({ statsPage: statsPage - 1 })}
                  >
                    Campeonatos anteriores
                  </button>
                  <span>
                    Página {statsPage} de {Math.ceil(ordered.length / 20)} ·{" "}
                    {ordered.length} participações
                  </span>
                  <button
                    disabled={statsPage * 20 >= ordered.length}
                    onClick={() => update({ statsPage: statsPage + 1 })}
                  >
                    Próximos campeonatos
                  </button>
                </nav>
              )}
              <p className="player-note">
                J conta os jogos em que o atleta entrou em quadra. — indica
                ausência de informação ou cobertura incompleta; 0 é um resultado
                confirmado. Filtros afetam apenas os campeonatos e os painéis
                abaixo.
              </p>
              <details className="player-glossary">
                <summary>Siglas e cobertura</summary>
                <dl>
                  <div>
                    <dt>J</dt>
                    <dd>
                      Jogos em que o atleta participou, sem contar apenas a
                      inscrição na súmula.
                    </dd>
                  </div>
                  {PROFILE_METRICS.map((m) => (
                    <div key={m}>
                      <dt>{metricLabel(m)}</dt>
                      <dd>
                        {STATISTICS_METRICS[m].name}
                        {view.mode === "per-game"
                          ? ", média por jogo"
                          : ", total"}
                        .
                      </dd>
                    </div>
                  ))}
                </dl>
                <p>
                  Uma métrica sem cobertura em todos os jogos do recorte
                  permanece indisponível. Jogos sem fase confirmada aparecem
                  apenas em Todas.
                </p>
              </details>
            </section>
            <div className="player-extras">
              {extras.map((key) => (
                <details
                  key={key}
                  open={view.panels.includes(key)}
                  onToggle={(e) => {
                    if (e.currentTarget.open !== view.panels.includes(key))
                      update({
                        panels: e.currentTarget.open
                          ? [...view.panels, key]
                          : view.panels.filter((k) => k !== key),
                      });
                  }}
                >
                  <summary
                    id={key}
                    onClick={(e) => {
                      e.preventDefault();
                      update({
                        panels: view.panels.includes(key)
                          ? view.panels.filter((k) => k !== key)
                          : [...view.panels, key],
                      });
                    }}
                  >
                    {key === "jogos"
                      ? "Jogos completos"
                      : key === "historico"
                        ? "Histórico"
                        : "Evolução"}
                  </summary>
                  {view.panels.includes(key) && (
                    <div className="player-extra-content">
                      {key === "jogos" ? (
                        <>
                          <Games
                            games={filteredGames.slice(
                              (page - 1) * 20,
                              page * 20,
                            )}
                          />
                          <nav
                            className="player-pager"
                            aria-label="Paginação de jogos"
                          >
                            <button
                              disabled={page === 1}
                              onClick={() => update({ page: page - 1 })}
                            >
                              Anterior
                            </button>
                            <span>
                              Página {page} de{" "}
                              {Math.max(
                                1,
                                Math.ceil(filteredGames.length / 20),
                              )}{" "}
                              · {filteredGames.length} jogos
                            </span>
                            <button
                              disabled={page * 20 >= filteredGames.length}
                              onClick={() => update({ page: page + 1 })}
                            >
                              Próxima
                            </button>
                          </nav>
                        </>
                      ) : key === "historico" ? (
                        <>
                          <p className="player-note">
                            Inscrições comprovadas por participações publicadas;
                            não indicam vínculo atual.
                          </p>
                          <ul className="player-history">
                            {filtered.map((g) => (
                              <li key={g.key}>
                                <strong>
                                  {g.history.context.year} ·{" "}
                                  {g.history.context.name}
                                </strong>
                                <span>
                                  {g.history.registration.name} ·{" "}
                                  {g.history.context.gender} ·{" "}
                                  {g.history.context.category} · Camisa{" "}
                                  {g.history.jerseys.join(" / ")}
                                </span>
                              </li>
                            ))}
                          </ul>
                          {!filtered.length && (
                            <p>Nenhuma inscrição neste recorte.</p>
                          )}
                        </>
                      ) : (
                        <>
                          <p className="player-note">
                            Médias por jogo nas temporadas selecionadas. Sem
                            interpolar dados ausentes.
                          </p>
                          <Table label="Evolução por temporada">
                            <thead>
                              <tr>
                                <th scope="col">Temporada</th>
                                <th scope="col" className="player-numeric">
                                  J
                                </th>
                                {PROFILE_METRICS.map((m) => (
                                  <th
                                    key={m}
                                    scope="col"
                                    className="player-numeric"
                                  >
                                    {metricLabel(m)}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {years
                                .filter((y) =>
                                  filteredGames.some(
                                    (g) => g.fact.context.year === y,
                                  ),
                                )
                                .map((year) => {
                                  const games = filteredGames.filter(
                                    (g) => g.fact.context.year === year,
                                  );
                                  return (
                                    <tr key={year}>
                                      <th scope="row">{year}</th>
                                      <td className="player-numeric">
                                        {
                                          games.filter((g) => g.fact.played)
                                            .length
                                        }
                                      </td>
                                      <Metrics
                                        games={games}
                                        id={id!}
                                        mode="per-game"
                                        columns={[...PROFILE_METRICS]}
                                      />
                                    </tr>
                                  );
                                })}
                            </tbody>
                          </Table>
                          {!filteredGames.length && (
                            <p>Sem jogos neste recorte.</p>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </details>
              ))}
            </div>
          </>
        )}
      </main>
      <PublicFooter />
    </>
  );
}
