import { useEffect, useId, useRef, useState } from "react";
import {
  DataTable,
  Icon,
  Modal,
  type Column,
} from "../../../../src/ui-system/components";
import { TeamFilter } from "../../../../src/statistics/reference/team-filter";
import {
  appearances,
  decimal,
  displayDate,
  games,
  honors,
  metricShort,
  participations,
  players,
  publicBio,
  profileSummary,
  publishedGames,
  type Appearance,
  type Participation,
  type PublishedGame,
} from "./fixtures";
import {
  periodLabel,
  periodTeam,
  total,
  type SheetPlayer,
  type SheetTeam,
  type StatKey,
} from "./match-model";
import {
  PilotLink,
  returnRoute,
  syncProfileQuery,
  scrollPositions,
  type Go,
} from "./pilot-navigation";
import { ColumnPicker, useMobile } from "./table-controls";

const profileMetricKeys: StatKey[] = [
  "points",
  "two",
  "three",
  "free",
  "fouls",
];

const show = (value: number | null) =>
  value === null ? "—" : decimal.format(value);
const gameRoute = (game: PublishedGame) =>
  `publico/jogo/${game.id}?${new URLSearchParams({ competition: game.competition, year: String(game.year), gender: game.gender, category: game.category })}`;
const disputeRoute = (row: Participation) =>
  `publico/classificacao?${new URLSearchParams({ competition: row.competition, year: String(row.year), gender: "Masculino", category: row.category })}`;
function Back({ go, to, label }: { go: Go; to: string; label: string }) {
  return (
    <PilotLink
      className="bb-text-button bb-detail-back"
      go={go}
      to={to.includes("?") ? to : `${to}?`}
    >
      <Icon name="back" />
      {label}
    </PilotLink>
  );
}

export function PublicGame({ id, go }: { id: string; go: Go }) {
  const published = publishedGames.find((game) => game.id === id);
  const game = published ?? games.find((game) => game.id === id);
  const [period, setPeriod] = useState("all");
  const [fouls, setFouls] = useState<{
    player: SheetPlayer;
    team: SheetTeam;
  } | null>(null);
  const back = returnRoute(`publico/jogo/${id}`, "publico/jogos");
  if (!game)
    return (
      <>
        <h1>Jogo não encontrado</h1>
        <Back go={go} to="publico/jogos" label="Voltar aos jogos" />
      </>
    );
  return (
    <article className="bb-game-detail public-site scoresheet-public public-game">
      <Back
        go={go}
        to={back}
        label={
          back.includes("jogador/") ? "Voltar ao perfil" : "Voltar aos jogos"
        }
      />
      <header
        className="game-context bb-game-header"
        aria-label="Dados da partida"
      >
        <h1 className="bb-sr-only">
          {published ? "Súmula" : "Jogo"}: {game.home.name} × {game.away.name}
        </h1>
        <strong>Jogo {game.number ?? "sem número"}</strong>
        <p>
          {displayDate(game.date)} · {game.time ?? "Horário a definir"} ·{" "}
          {game.venue ?? "Local a definir"}
        </p>
        <span className="bb-game-status">
          {published ? "Encerrado" : "Agendado"}
        </span>
      </header>
      <div className="period-section">
        {published && (
          <div
            className="bb-parcials period-scroll public-periods"
            role="region"
            tabIndex={0}
            aria-label="Parciais da partida"
          >
            <table className="period-table">
              <caption className="bb-sr-only">
                Pontos e faltas coletivas por período
              </caption>
              <thead>
                <tr>
                  <th scope="col">Equipe</th>
                  {published.sheet.home.periods.map((_, i) => (
                    <th scope="col" className="bb-numeric" key={i}>
                      {periodLabel(i)}
                    </th>
                  ))}
                  <th scope="col" className="bb-numeric">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {[published.sheet.home, published.sheet.away].map((team) => (
                  <tr key={team.id}>
                    <th scope="row">{team.name}</th>
                    {team.periods.map((points, i) => (
                      <td key={i} className="bb-numeric">
                        <span className="period-points">
                          <span>{points}</span>
                          <small
                            className="period-fouls"
                            aria-label={`Faltas coletivas: ${show(team.foulsByPeriod[i])}`}
                          >
                            F{show(team.foulsByPeriod[i])}
                          </small>
                        </span>
                      </td>
                    ))}
                    <td className="period-total">
                      <strong className="bb-final-score period-points">
                        {team.points}
                      </strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {published ? (
        <>
          <div className="teams-heading">
            <div
              className="period-filter"
              role="group"
              aria-label="Período das estatísticas"
            >
              {[
                "all",
                ...published.sheet.home.periods.map((_, i) => String(i)),
              ].map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={period === value}
                  onClick={() => setPeriod(value)}
                >
                  {value === "all" ? "Jogo todo" : periodLabel(Number(value))}
                </button>
              ))}
            </div>
          </div>
          <p className="bb-sr-only" role="status">
            Exibindo{" "}
            {period === "all" ? "jogo todo" : periodLabel(Number(period))} para
            as duas equipes. O placar final permanece inalterado.
          </p>
          <div className="teams-grid public-rosters">
            {[published.sheet.home, published.sheet.away].map((original) => {
              const team = periodTeam(original, period);
              const free = total(team, "free");
              const pct =
                team.freeTaken === null || free === null || team.freeTaken === 0
                  ? null
                  : (free / team.freeTaken) * 100;
              return (
                <section
                  className="team-section public-roster bb-score-team"
                  key={team.id}
                  aria-label={`Elenco de ${team.name}`}
                >
                  <div className="team-heading">
                    <h2>
                      <PilotLink go={go} to={`publico/equipe/${team.id}`}>
                        {team.name}
                      </PilotLink>
                    </h2>
                  </div>
                  <div
                    className="table-scroll public-athletes"
                    role="region"
                    tabIndex={0}
                    aria-label={`Súmula de ${team.name}`}
                  >
                    <table className="roster-table bb-scoresheet-table">
                      <colgroup>
                        <col className="jersey-col" />
                        <col />
                        {[0, 1, 2, 3, 4].map((n) => (
                          <col key={n} className="stat-col" />
                        ))}
                      </colgroup>
                      <caption className="bb-sr-only">
                        {team.name} —{" "}
                        {period === "all"
                          ? "jogo todo"
                          : periodLabel(Number(period))}
                      </caption>
                      <thead>
                        <tr>
                          <th scope="col" className="jersey-cell">
                            Nº
                          </th>
                          <th scope="col" className="athlete-cell">
                            Atleta
                          </th>
                          {["PTS", "2P", "3P", "LL", "F"].map((label) => (
                            <th
                              scope="col"
                              className={
                                label === "PTS" ? "points-cell" : "bb-numeric"
                              }
                              key={label}
                            >
                              {label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[...team.players]
                          .sort(
                            (a, b) =>
                              Number(a.jersey) - Number(b.jersey) ||
                              a.jersey.length - b.jersey.length,
                          )
                          .map((player) => (
                            <tr
                              key={player.id}
                              data-player={player.id}
                              className={
                                player.status &&
                                ["five", "GD", "D"].includes(player.status)
                                  ? "bb-player-excluded"
                                  : !player.played
                                    ? "bb-player-inactive"
                                    : undefined
                              }
                            >
                              <td className="jersey-cell">{player.jersey}</td>
                              <th scope="row" className="athlete-cell">
                                <div className="athlete-line bb-athlete-name">
                                  <PilotLink
                                    go={go}
                                    to={`publico/jogador/${player.id}`}
                                    className={
                                      player.starter
                                        ? "athlete-name bb-starter"
                                        : "athlete-name"
                                    }
                                  >
                                    {player.name}
                                    {player.starter ? " *" : ""}
                                  </PilotLink>
                                  {player.captain && (
                                    <span className="captain bb-captain">
                                      CAP
                                    </span>
                                  )}
                                </div>
                              </th>
                              {(
                                ["points", "two", "three", "free"] as const
                              ).map((key) => (
                                <td
                                  className={
                                    key === "points"
                                      ? "points-cell"
                                      : "bb-numeric"
                                  }
                                  key={key}
                                >
                                  {show(player[key])}
                                </td>
                              ))}
                              <td className="bb-numeric bb-foul-cell">
                                {player.played ? (
                                  <button
                                    type="button"
                                    className="bb-foul-trigger"
                                    aria-label={`Faltas de ${player.name}: ${player.fouls ?? "não informadas"}`}
                                    onClick={() => setFouls({ player, team })}
                                  >
                                    {show(player.fouls)}
                                  </button>
                                ) : (
                                  "—"
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <th scope="row" colSpan={2} className="total-label">
                            Total da equipe
                          </th>
                          {(
                            ["points", "two", "three", "free", "fouls"] as const
                          ).map((key) => (
                            <td className="bb-numeric" key={key}>
                              {key === "free" ? (
                                <span className="bb-free-summary">
                                  {show(free)}/{show(team.freeTaken)}
                                  <small>
                                    {show(pct)}
                                    {pct === null ? "" : "%"}
                                  </small>
                                </span>
                              ) : (
                                show(total(team, key))
                              )}
                            </td>
                          ))}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <dl className="staff bb-coaches">
                    <div>
                      <dt>Técnico</dt>
                      <dd>{team.coach}</dd>
                    </div>
                    <div>
                      <dt>Auxiliar</dt>
                      <dd>{team.assistant}</dd>
                    </div>
                  </dl>
                </section>
              );
            })}
          </div>
          <section className="legend" aria-labelledby="bb-game-legend">
            <h2 id="bb-game-legend">Legenda</h2>
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
                0 indica participação sem registro da ação; — indica ausência de
                participação ou dado não informado. Toque no total de faltas
                para ver os registros.
              </p>
              <p>
                <strong>5F:</strong> exclusão por cinco faltas.{" "}
                <strong>GD/D:</strong> desqualificação.
              </p>
            </div>
          </section>
        </>
      ) : (
        <p className="bb-empty">
          {game.home.name} × {game.away.name}. O resultado deste jogo ainda não
          foi publicado.
        </p>
      )}
      {fouls && (
        <Modal
          title={`Faltas de ${fouls.player.name}`}
          onClose={() => setFouls(null)}
        >
          <p>
            {fouls.team.name} · Camisa {fouls.player.jersey} ·{" "}
            {period === "all" ? "Jogo todo" : periodLabel(Number(period))}
          </p>
          <p className="bb-foul-total">
            Total <strong>{show(fouls.player.fouls)}</strong>
          </p>
          {fouls.player.fouls === null ? (
            <p>Faltas não informadas neste recorte.</p>
          ) : fouls.player.foulEvents.length === 0 ? (
            <p>Nenhuma falta neste recorte.</p>
          ) : (
            <div className="bb-foul-groups">
              {[0, 1, 2].map((half) => {
                const events = fouls.player.foulEvents.filter((event) =>
                  half === 0
                    ? event.period < 2
                    : half === 1
                      ? event.period >= 2 && event.period < 4
                      : event.period >= 4,
                );
                return (
                  events.length > 0 && (
                    <section key={half}>
                      <h2>
                        {half === 0
                          ? "1º tempo"
                          : half === 1
                            ? "2º tempo"
                            : "Prorrogação"}
                      </h2>
                      <ul>
                        {events.map((event, i) => (
                          <li
                            key={i}
                            className={
                              event.period === 0 || event.period === 2
                                ? "bb-quarter-red"
                                : "bb-quarter-blue"
                            }
                          >
                            <strong>{event.kind}</strong>
                            <span>
                              {periodLabel(event.period)} ·{" "}
                              {
                                {
                                  P: "Pessoal",
                                  T: "Técnica",
                                  U: "Antidesportiva",
                                  D: "Desqualificante",
                                }[event.kind]
                              }{" "}
                              ·{" "}
                              {event.compensated
                                ? "Penalidade compensada"
                                : event.freeThrows === null
                                  ? "Penalidade não informada"
                                  : `${event.freeThrows} LL de penalidade`}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )
                );
              })}
            </div>
          )}
          {fouls.player.status === "five" && (
            <p className="bb-exclusion-note">Excluído por cinco faltas</p>
          )}
          {["D", "GD"].includes(fouls.player.status ?? "") && (
            <p className="bb-exclusion-note">
              Desqualificado ({fouls.player.status})
            </p>
          )}
        </Modal>
      )}
    </article>
  );
}

const profileSections = [
  { key: "resumo", label: "Resumo" },
  { key: "recentes", label: "Últimos jogos" },
  { key: "estatisticas", label: "Campeonatos" },
  { key: "jogos", label: "Jogos completos" },
  { key: "historico", label: "Histórico" },
  { key: "evolucao", label: "Evolução" },
];
const extraPanels = ["jogos", "historico", "evolucao"];
export function PlayerProfile({
  id,
  go,
  onSiglas,
}: {
  id: string;
  go: Go;
  onSiglas: () => void;
}) {
  const player = players.find((person) => person.id === id);
  const query = new URLSearchParams(location.hash.split("?")[1]);
  const rows = participations(id),
    allGames = appearances(id),
    bio = publicBio(id),
    awards = honors(id);
  const teamOptions = [
    ...new Map(
      rows.map((row) => [row.teamId, { id: row.teamId, name: row.teamName }]),
    ).values(),
  ];
  const [year, setYear] = useState(
    rows.some((row) => String(row.year) === query.get("anoPerfil"))
      ? query.get("anoPerfil")!
      : "all",
  );
  const [competition, setCompetition] = useState(
    rows.some((row) => row.competition === query.get("competicaoPerfil"))
      ? query.get("competicaoPerfil")!
      : "all",
  );
  const [selectedTeams, setTeams] = useState(
    query.has("equipesPerfil")
      ? [
          ...new Set(
            query
              .get("equipesPerfil")!
              .split(",")
              .filter(Boolean)
              .filter((id) => teamOptions.some((t) => t.id === id)),
          ),
        ]
      : teamOptions.map((t) => t.id),
  );
  const [mode, setMode] = useState(
    query.get("modoPerfil") === "total" ? "total" : "average",
  );
  const mobile = useMobile();
  const [visibleMetrics, setVisibleMetrics] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(
        sessionStorage.getItem("bb-pilot-profile-columns") ?? "null",
      );
      if (
        Array.isArray(saved) &&
        saved.every((key) => profileMetricKeys.includes(key))
      )
        return saved;
    } catch {
      /* Optional session preference. */
    }
    return matchMedia("(max-width: 639px)").matches
      ? ["points"]
      : profileMetricKeys;
  });
  function changeMetrics(keys: string[]) {
    setVisibleMetrics(keys);
    try {
      sessionStorage.setItem("bb-pilot-profile-columns", JSON.stringify(keys));
    } catch {
      /* Optional preference. */
    }
  }
  const back = returnRoute(`publico/jogador/${id}`, "publico/jogadores");
  const filtered = rows.filter(
    (row) =>
      (year === "all" || String(row.year) === year) &&
      (competition === "all" || row.competition === competition) &&
      selectedTeams.includes(row.teamId),
  );
  const filteredGames = allGames.filter((a) =>
    filtered.some(
      (row) =>
        row.year === a.game.year &&
        row.competition === a.game.competition &&
        row.teamId === a.team.id,
    ),
  );

  const summaries = profileSummary(id);
  const sectionId = (section: string) => `bb-profile-${id}-${section}`;
  const [openPanels, setOpenPanels] = useState<string[]>(() => {
    const keys = (query.get("paineisPerfil") ?? "")
      .split(",")
      .filter((key) => extraPanels.includes(key));
    const target = query.get("secao");
    if (target && extraPanels.includes(target) && !keys.includes(target))
      keys.push(target);
    return keys;
  });
  const panels = useRef(openPanels);
  function openPanel(key: string, open: boolean) {
    if (panels.current.includes(key) === open) return;
    const next = open
      ? [...panels.current, key]
      : panels.current.filter((k) => k !== key);
    panels.current = next;
    setOpenPanels(next);
    syncProfileQuery({ paineisPerfil: next.length ? next.join(",") : "all" });
    if (
      !open &&
      new URLSearchParams(location.hash.split("?")[1]).get("secao") === key
    )
      syncProfileQuery({ secao: "resumo" });
  }
  function focusSection(key: string) {
    const element = document.getElementById(sectionId(key));
    element?.focus({ preventScroll: true });
    element?.scrollIntoView({ block: "start" });
  }
  function jump(key: string) {
    if (extraPanels.includes(key)) openPanel(key, true);
    syncProfileQuery({ secao: key });
    requestAnimationFrame(() => focusSection(key));
  }
  function sectionHref(key: string) {
    const [path, search] = location.hash.slice(1).split("?");
    const params = new URLSearchParams(search);
    params.set("secao", key);
    return `#${path}?${params}`;
  }
  useEffect(() => {
    const target = query.get("secao");
    if (!target || scrollPositions.has(location.hash.slice(1))) return;
    const frame = requestAnimationFrame(() => focusSection(target));
    return () => cancelAnimationFrame(frame);
    // Only a new entry with a section link should jump; return restores its scroll.
  }, [id]);
  const numeric = (row: Participation, key: StatKey) =>
    row.games === 0
      ? null
      : row[key] === null
        ? null
        : row[key]! / (mode === "average" ? row.games : 1);
  const statsColumns: Column<Participation>[] = [
    { key: "year", label: "Ano", render: (row) => row.year },
    {
      key: "competition",
      label: "Campeonato",
      primary: true,
      render: (row) => (
        <>
          <PilotLink go={go} to={disputeRoute(row)}>
            {row.competition}
          </PilotLink>
          <small className="bb-stat-category">{row.category}</small>
          {mobile && (
            <small className="bb-stat-category">
              {row.teamName} · {row.shirt}
            </small>
          )}
        </>
      ),
    },
    ...(!mobile
      ? [
          {
            key: "team",
            label: "Equipe / Camisa",
            render: (row: Participation) => (
              <>
                <PilotLink
                  go={go}
                  to={`publico/equipe/${row.teamId}?${new URLSearchParams({ competition: row.competition, year: String(row.year), category: row.category, gender: "Masculino" })}`}
                >
                  {row.teamName}
                </PilotLink>
                <span className="bb-shirt">{row.shirt}</span>
              </>
            ),
          },
        ]
      : []),
    {
      key: "games",
      label: "J",
      numeric: true,
      render: (row) => row.games || "—",
    },
    ...profileMetricKeys
      .filter((key) => visibleMetrics.includes(key))
      .map((key) => ({
        key,
        label: metricShort[key],
        numeric: true,
        render: (row: Participation) => show(numeric(row, key)),
      })),
  ];

  if (!player)
    return (
      <>
        <h1>Jogador não encontrado</h1>
        <Back go={go} to="publico/jogadores" label="Voltar a jogadores" />
      </>
    );
  const metadata = [
    ["Posição", bio?.position],
    ["Nascimento", bio?.birthYear],
    ["Altura", bio?.height],
    ["Peso", bio?.weight],
    ["Mão dominante", bio?.dominantHand],
    ["Origem", bio?.city],
  ].filter(
    ([, value]) => value !== null && value !== undefined && value !== "",
  );
  return (
    <article className="bb-player-detail">
      <Back
        go={go}
        to={back}
        label={
          back.includes("jogo/")
            ? "Voltar ao jogo"
            : back.includes("equipe/")
              ? "Voltar à equipe"
              : "Voltar a jogadores"
        }
      />
      <div
        className={`bb-player-identity-grid${awards.length ? " bb-with-honors" : ""}`}
      >
        <header className="bb-player-header">
          <h1>{player.name}</h1>
          {bio?.nickname && (
            <p className="bb-player-nickname">“{bio.nickname}”</p>
          )}
          {metadata.length > 0 && (
            <dl className="bb-player-metadata">
              {metadata.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}:</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </header>
        <aside
          className="bb-profile-honors"
          aria-labelledby={sectionId("conquistas")}
        >
          <h2 id={sectionId("conquistas")} tabIndex={-1}>
            Conquistas e honrarias
          </h2>
          {awards.length ? (
            [
              { kind: "collective", label: "Títulos coletivos" },
              { kind: "individual", label: "Honrarias individuais" },
            ].map(
              (group) =>
                awards.some((a) => a.kind === group.kind) && (
                  <section key={group.kind}>
                    <h3>{group.label}</h3>
                    <ul className="bb-honors">
                      {awards
                        .filter((a) => a.kind === group.kind)
                        .map((award) => (
                          <li key={award.id}>
                            <Icon name="trophy" />
                            <div>
                              <strong>
                                {award.title} · {award.competition}
                              </strong>
                              <p>
                                {award.year} · {award.category} · {award.team}
                              </p>
                            </div>
                          </li>
                        ))}
                    </ul>
                  </section>
                ),
            )
          ) : (
            <p className="bb-coverage-note">
              Nenhuma conquista publicada para este jogador.
            </p>
          )}
        </aside>
      </div>
      <section
        className="bb-player-summary"
        aria-labelledby={sectionId("resumo")}
      >
        <div className="bb-section-heading">
          <div className="bb-section-title">
            <h2 id={sectionId("resumo")} tabIndex={-1}>
              Resumo estatístico
            </h2>
            <span className="bb-count">Médias por jogo</span>
          </div>
          <button
            className="bb-text-button"
            aria-label="Siglas do resumo estatístico"
            onClick={onSiglas}
          >
            Siglas
          </button>
        </div>
        <DataTable
          label="Resumo da temporada e da carreira"
          columns={[
            {
              key: "label",
              label: "Período",
              render: (row) => <strong>{row.label}</strong>,
            },
            {
              key: "games",
              label: "J",
              numeric: true,
              render: (row) => row.games,
            },
            ...profileMetricKeys.map((key) => ({
              key,
              label: metricShort[key],
              numeric: true,
              render: (row: (typeof summaries)[number]) => show(row[key]),
            })),
          ]}
          rows={summaries}
          rowId={(row) => row.id}
        />
      </section>
      <nav
        className="bb-profile-jumps"
        aria-label="Seções do perfil do jogador"
      >
        {profileSections.map((section) => (
          <a
            key={section.key}
            href={sectionHref(section.key)}
            onClick={(event) => {
              if (
                !event.ctrlKey &&
                !event.metaKey &&
                !event.shiftKey &&
                !event.altKey &&
                event.button === 0
              ) {
                event.preventDefault();
                jump(section.key);
              }
            }}
          >
            {section.label}
          </a>
        ))}
      </nav>
      <section
        className="bb-profile-recent"
        aria-labelledby={sectionId("recentes")}
      >
        <div className="bb-section-heading">
          <h2 id={sectionId("recentes")} tabIndex={-1}>
            Três últimos jogos
          </h2>
          <a
            className="bb-text-button"
            href={sectionHref("jogos")}
            onClick={(event) => {
              if (
                !event.ctrlKey &&
                !event.metaKey &&
                !event.shiftKey &&
                !event.altKey &&
                event.button === 0
              ) {
                event.preventDefault();
                jump("jogos");
              }
            }}
          >
            Ver todos os jogos <Icon name="chevron" />
          </a>
        </div>
        <PlayerGames
          rows={allGames.slice(0, 3)}
          go={go}
          mobile={mobile}
          compact
        />
      </section>
      <section
        className="bb-profile-statistics"
        aria-labelledby={sectionId("estatisticas")}
      >
        <h2 id={sectionId("estatisticas")} tabIndex={-1}>
          Estatísticas por campeonato
        </h2>
        <div className="bb-toolbar bb-profile-filters">
          <label>
            Ano
            <select
              name="profile-year"
              value={year}
              onChange={(event) => {
                setYear(event.target.value);
                syncProfileQuery({ anoPerfil: event.target.value });
              }}
            >
              <option value="all">Todos</option>
              {[...new Set(rows.map((row) => row.year))].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            Campeonato
            <select
              name="profile-competition"
              value={competition}
              onChange={(event) => {
                setCompetition(event.target.value);
                syncProfileQuery({ competicaoPerfil: event.target.value });
              }}
            >
              <option value="all">Todos</option>
              {[...new Set(rows.map((row) => row.competition))].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <TeamFilter
            options={teamOptions}
            value={selectedTeams}
            onChange={(value) => {
              setTeams(value);
              syncProfileQuery({ equipesPerfil: value.join(",") });
            }}
          />
          <button
            type="button"
            className="bb-text-button"
            onClick={() => {
              setYear("all");
              setCompetition("all");
              setTeams(teamOptions.map((t) => t.id));
              syncProfileQuery({
                anoPerfil: "all",
                competicaoPerfil: "all",
                equipesPerfil: "all",
              });
            }}
          >
            Limpar filtros
          </button>
        </div>{" "}
        <div className="bb-section-heading">
          <div className="bb-section-title">
            <span className="bb-count">{filtered.length} participações</span>
            <button type="button" className="bb-text-button" onClick={onSiglas}>
              Siglas
            </button>
          </div>
          <div className="bb-actions">
            <div
              className="bb-segment"
              role="group"
              aria-label="Modo das estatísticas do perfil"
            >
              {["average", "total"].map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={mode === value}
                  onClick={() => {
                    setMode(value);
                    syncProfileQuery({ modoPerfil: value });
                  }}
                >
                  {value === "average" ? "Por jogo" : "Totais"}
                </button>
              ))}
            </div>
            <ColumnPicker
              selected={visibleMetrics}
              options={profileMetricKeys}
              onChange={changeMetrics}
            />
          </div>
        </div>
        <DataTable
          label="Estatísticas da carreira por competição"
          columns={statsColumns}
          rows={filtered}
          rowId={(row) => row.id}
        />
        {filtered.some((row) => !row.games) && (
          <p className="bb-coverage-note">
            Participação registrada sem estatísticas individuais disponíveis.
          </p>
        )}
      </section>
      <div className="bb-profile-extras">
        {extraPanels.map((key) => (
          <details
            key={key}
            className="bb-profile-extra"
            open={openPanels.includes(key)}
            onToggle={(event) => openPanel(key, event.currentTarget.open)}
          >
            <summary
              id={sectionId(key)}
              onClick={(event) => {
                event.preventDefault();
                openPanel(key, !panels.current.includes(key));
              }}
            >
              {key === "jogos"
                ? "Jogos completos"
                : key === "historico"
                  ? "Histórico"
                  : "Evolução"}
            </summary>
            <div className="bb-extra-content">
              {key === "jogos" && (
                <>
                  <h2>
                    Jogos{" "}
                    <span className="bb-count">{filteredGames.length}</span>
                  </h2>
                  <PlayerGames
                    rows={filteredGames}
                    go={go}
                    mobile={mobile}
                    metrics={visibleMetrics}
                  />
                </>
              )}
              {key === "historico" && (
                <>
                  <h2>Equipes e temporadas</h2>
                  <ParticipationList rows={filtered} go={go} />
                </>
              )}
              {key === "evolucao" && <Evolution rows={filteredGames} go={go} />}
            </div>
          </details>
        ))}
      </div>
    </article>
  );
}

function ParticipationList({ rows, go }: { rows: Participation[]; go: Go }) {
  return rows.length ? (
    <ul className="bb-participation-list">
      {rows.map((row) => (
        <li key={row.id}>
          <span className="bb-participation-year">{row.year}</span>
          <div>
            <PilotLink go={go} to={disputeRoute(row)}>
              {row.competition}
            </PilotLink>
            <small>
              {row.category} · {row.teamName} · Camisa {row.shirt}
            </small>
          </div>
          <span className="bb-participation-games">
            {row.games ? `${row.games} jogos` : "Sem estatísticas"}
          </span>
        </li>
      ))}
    </ul>
  ) : (
    <p className="bb-empty">Nenhuma participação neste recorte.</p>
  );
}
function PlayerGames({
  rows,
  go,
  compact = false,
  mobile = false,
  metrics = profileMetricKeys,
}: {
  rows: Appearance[];
  go: Go;
  compact?: boolean;
  mobile?: boolean;
  metrics?: string[];
}) {
  const columns: Column<Appearance>[] = [
    {
      key: "date",
      label: "Data",
      render: (row) =>
        mobile && row.game.date ? (
          <time dateTime={row.game.date}>
            {displayDate(row.game.date).slice(0, 5)}
            <small className="bb-date-year">
              {displayDate(row.game.date).slice(6)}
            </small>
          </time>
        ) : (
          displayDate(row.game.date)
        ),
    },
    {
      key: "match",
      label: "Confronto",
      primary: true,
      render: (row) => (
        <>
          <PilotLink go={go} to={gameRoute(row.game)}>
            {row.game.home.name} × {row.game.away.name}
          </PilotLink>
          {!compact && (
            <small className="bb-stat-category">
              {row.game.competition} · {row.game.category}
            </small>
          )}
          {mobile && (
            <small className="bb-stat-category">
              {row.game.homePoints} × {row.game.awayPoints}
            </small>
          )}
        </>
      ),
    },
    ...(!mobile
      ? [
          {
            key: "score",
            label: "Placar",
            numeric: true,
            render: (row: Appearance) =>
              `${row.game.homePoints} × ${row.game.awayPoints}`,
          },
        ]
      : []),
    ...(compact ? ["points"] : metrics).map((key) => ({
      key,
      label: metricShort[key],
      numeric: true,
      render: (row: Appearance) => show(row.player[key as StatKey]),
    })),
  ];
  return (
    <DataTable
      label={
        compact ? "Jogos recentes do jogador" : "Jogos disputados pelo jogador"
      }
      columns={columns}
      rows={rows}
      rowId={(row) => row.game.id}
      empty="Nenhum jogo com participação neste recorte."
    />
  );
}
function Evolution({ rows, go }: { rows: Appearance[]; go: Go }) {
  const [metric, setMetric] = useState<StatKey>("points");
  const titleId = useId();
  const chronological = [...rows]
    .reverse()
    .filter((row) => row.player[metric] !== null);
  const values = chronological.map((row) => row.player[metric]!);
  const max = Math.max(1, ...values);
  const points = values
    .map(
      (value, i) =>
        `${36 + (i / Math.max(1, values.length - 1)) * 628},${150 - (value / max) * 120}`,
    )
    .join(" ");
  return (
    <section className="bb-evolution">
      <div className="bb-section-heading">
        <h3 id={titleId}>Evolução por partida</h3>
        <label className="bb-chart-metric">
          <span className="bb-sr-only">Indicador da evolução</span>
          <select
            name="profile-evolution"
            value={metric}
            onChange={(event) => setMetric(event.target.value as StatKey)}
          >
            {[
              "Pontos",
              "Cestas de 2 pontos",
              "Cestas de 3 pontos",
              "Lances livres",
              "Faltas",
            ].map((label, i) => (
              <option
                value={
                  (["points", "two", "three", "free", "fouls"] as const)[i]
                }
                key={label}
              >
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {values.length >= 4 ? (
        <figure aria-labelledby={titleId} tabIndex={0}>
          <svg
            viewBox="0 0 700 190"
            role="img"
            aria-label={`${values.length} partidas em ordem de data; valores disponíveis na tabela abaixo`}
          >
            <line
              x1="36"
              x2="664"
              y1="150"
              y2="150"
              className="bb-chart-axis"
            />
            <polyline points={points} className="bb-chart-line" />
            {chronological.map((row, i) => {
              const x = 36 + (i / Math.max(1, values.length - 1)) * 628,
                y = 150 - (values[i] / max) * 120;
              return (
                <g key={row.game.id}>
                  <circle cx={x} cy={y} r="4" />
                  <text x={x} y={y - 10} textAnchor="middle">
                    {show(values[i])}
                  </text>
                  {(i === 0 || i === chronological.length - 1) && (
                    <text x={x} y="177" textAnchor={i === 0 ? "start" : "end"}>
                      {displayDate(row.game.date)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
          <figcaption>
            {values.length} partidas · apenas registros com o indicador
            disponível
          </figcaption>
        </figure>
      ) : (
        <p className="bb-coverage-note">
          São necessárias quatro partidas com este indicador para visualizar a
          evolução.
        </p>
      )}
      <details className="bb-chart-data">
        <summary>Ver valores do gráfico</summary>
        <DataTable
          label="Valores da evolução por partida"
          columns={[
            {
              key: "game",
              label: "Partida",
              primary: true,
              render: (row: Appearance) => (
                <PilotLink go={go} to={gameRoute(row.game)}>
                  {displayDate(row.game.date)} · {row.opponent.name}
                </PilotLink>
              ),
            },
            {
              key: "value",
              label: "Valor",
              numeric: true,
              render: (row) => show(row.player[metric]),
            },
          ]}
          rows={chronological}
          rowId={(row) => row.game.id}
        />
      </details>
    </section>
  );
}
