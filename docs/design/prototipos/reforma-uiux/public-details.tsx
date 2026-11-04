import { useId, useState } from "react";
import {
  DataTable,
  Icon,
  Modal,
  SectionTabs,
  TabPanel,
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
    <article className="bb-game-detail">
      <Back
        go={go}
        to={back}
        label={
          back.includes("jogador/") ? "Voltar ao perfil" : "Voltar aos jogos"
        }
      />
      <div className="bb-game-overview">
        <header className="bb-game-header">
          <h1 className="bb-sr-only">
            {published ? "Súmula" : "Jogo"}: {game.home.name} × {game.away.name}
          </h1>
          <p className="bb-game-kicker">
            Jogo {game.number ?? "sem número"}
            <span aria-hidden="true"> · </span>
            {published ? "Encerrado" : "Agendado"}
          </p>
          <p className="bb-game-meta">
            {displayDate(game.date)} · {game.time ?? "Horário a definir"}
            <span>{game.venue ?? "Local a definir"}</span>
          </p>
          <div
            className="bb-match-score"
            role="group"
            aria-label={`Placar: ${game.home.name} ${game.homePoints ?? "a definir"}, ${game.away.name} ${game.awayPoints ?? "a definir"}`}
          >
            {[game.home, game.away].map((team, i) => (
              <div className="bb-score-side" key={team.id}>
                <PilotLink
                  go={go}
                  to={`publico/equipe/${team.id}`}
                  className="bb-row-link"
                >
                  {team.name}
                </PilotLink>
                <strong className="bb-final-score">
                  {(i === 0 ? game.homePoints : game.awayPoints) ?? "—"}
                </strong>
              </div>
            ))}
          </div>
        </header>
        {published && (
          <div
            className="bb-parcials bb-table-scroll"
            role="region"
            tabIndex={0}
            aria-label="Parciais da partida"
          >
            <table className="bb-table">
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
                        <strong>{points}</strong>
                        <small>{show(team.foulsByPeriod[i])} FC</small>
                      </td>
                    ))}
                    <td className="bb-numeric">
                      <strong>{team.points}</strong>
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
          <div className="bb-sheet-toolbar">
            <h2>Estatísticas do jogo</h2>
            <div
              className="bb-period-filter"
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
          <div className="bb-sheet-teams">
            {[published.sheet.home, published.sheet.away].map((original) => {
              const team = periodTeam(original, period);
              const free = total(team, "free");
              const pct =
                team.freeTaken === null || free === null || team.freeTaken === 0
                  ? null
                  : (free / team.freeTaken) * 100;
              return (
                <section
                  className="bb-score-team"
                  key={team.id}
                  aria-label={`Elenco de ${team.name}`}
                >
                  <h3>
                    <PilotLink go={go} to={`publico/equipe/${team.id}`}>
                      {team.name}
                    </PilotLink>
                  </h3>
                  <div
                    className="bb-table-scroll"
                    role="region"
                    tabIndex={0}
                    aria-label={`Súmula de ${team.name}`}
                  >
                    <table className="bb-table bb-scoresheet-table">
                      <caption className="bb-sr-only">
                        {team.name} —{" "}
                        {period === "all"
                          ? "jogo todo"
                          : periodLabel(Number(period))}
                      </caption>
                      <thead>
                        <tr>
                          <th scope="col" className="bb-numeric">
                            Nº
                          </th>
                          <th scope="col">Atleta</th>
                          {["PTS", "2P", "3P", "LL", "F"].map((label) => (
                            <th scope="col" className="bb-numeric" key={label}>
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
                                  : undefined
                              }
                            >
                              <td className="bb-numeric">{player.jersey}</td>
                              <th scope="row" className="bb-primary-cell">
                                <div className="bb-athlete-name">
                                  <PilotLink
                                    go={go}
                                    to={`publico/jogador/${player.id}`}
                                    className={
                                      player.starter
                                        ? "bb-row-link bb-starter"
                                        : "bb-row-link"
                                    }
                                  >
                                    {player.name}
                                    {player.starter ? " *" : ""}
                                  </PilotLink>
                                  {player.captain && (
                                    <span className="bb-captain">CAP</span>
                                  )}
                                </div>
                              </th>
                              {(
                                ["points", "two", "three", "free"] as const
                              ).map((key) => (
                                <td className="bb-numeric" key={key}>
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
                          <th scope="row" colSpan={2}>
                            Total
                          </th>
                          {(
                            ["points", "two", "three", "free", "fouls"] as const
                          ).map((key) => (
                            <td className="bb-numeric" key={key}>
                              {show(total(team, key))}
                            </td>
                          ))}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <p className="bb-free-summary">
                    Lances livres:{" "}
                    <strong>
                      {show(free)}/{show(team.freeTaken)}
                    </strong>
                    <span>
                      {" "}
                      · {show(pct)}
                      {pct === null ? "" : "%"}
                    </span>
                  </p>
                  <dl className="bb-coaches">
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
          <details className="bb-detail-legend">
            <summary>Legenda da súmula</summary>
            <p>
              <strong>*</strong> Titular · <strong>CAP</strong> Capitão ·{" "}
              <strong>PTS</strong> Pontos · <strong>2P/3P</strong> Cestas
              convertidas · <strong>LL</strong> Lances livres convertidos ·{" "}
              <strong>F</strong> Faltas · <strong>FC</strong> Faltas coletivas
            </p>
            <p>
              0 indica participação sem registro da ação; — indica ausência de
              participação ou dado não informado. Toque no total de faltas para
              ver os registros.
            </p>
          </details>
        </>
      ) : (
        <p className="bb-empty">
          O resultado deste jogo ainda não foi publicado.
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
                      <h3>
                        {half === 0
                          ? "1º tempo"
                          : half === 1
                            ? "2º tempo"
                            : "Prorrogação"}
                      </h3>
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

const profileTabs = [
  { key: "resumo", label: "Resumo" },
  { key: "estatisticas", label: "Estatísticas" },
  { key: "conquistas", label: "Conquistas e honrarias" },
  { key: "jogos", label: "Jogos" },
  { key: "historico", label: "Histórico" },
];
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
  const [active, setActive] = useState(
    profileTabs.some((t) => t.key === query.get("secao"))
      ? query.get("secao")!
      : "resumo",
  );
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
  const points = allGames.reduce((sum, a) => sum + (a.player.points ?? 0), 0);
  const panelId = useId();
  function changeTab(value: string) {
    setActive(value);
    syncProfileQuery({ secao: value });
  }
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
      <header className="bb-player-header">
        <div>
          <p className="bb-eyebrow">Perfil do jogador</p>
          <h1>{player.name}</h1>
          {bio?.nickname && (
            <p className="bb-player-nickname">{bio.nickname}</p>
          )}
          <p className="bb-player-meta">
            {bio
              ? `${bio.position} · ${bio.birthYear} · ${bio.height} · ${bio.city}`
              : player.team.name}
          </p>
        </div>
        <dl className="bb-career-numbers">
          <div>
            <dt>Jogos</dt>
            <dd>{allGames.length}</dd>
          </div>
          <div>
            <dt>Pontos</dt>
            <dd>{allGames.length ? points : "—"}</dd>
          </div>
          <div>
            <dt>Por jogo</dt>
            <dd>{allGames.length ? show(points / allGames.length) : "—"}</dd>
          </div>
        </dl>
      </header>
      <p className="bb-career-caption">
        Carreira publicada · {rows.length} participações ·{" "}
        {rows.at(-1)?.year ?? "—"}–{rows[0]?.year ?? "—"}
      </p>
      <SectionTabs
        id={panelId}
        label="Seções do perfil do jogador"
        items={profileTabs}
        active={active}
        onChange={changeTab}
      />
      <TabPanel id={panelId} active={active}>
        {["estatisticas", "jogos", "historico"].includes(active) && (
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
                {[...new Set(rows.map((row) => row.competition))].map(
                  (value) => (
                    <option key={value}>{value}</option>
                  ),
                )}
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
          </div>
        )}
        {active === "resumo" && (
          <div className="bb-profile-overview">
            <section>
              <div className="bb-section-heading">
                <h2>Participações</h2>
                <button
                  className="bb-text-button"
                  type="button"
                  onClick={() => changeTab("estatisticas")}
                >
                  Ver estatísticas <Icon name="chevron" />
                </button>
              </div>
              <ParticipationList rows={rows} go={go} />
            </section>
            <section>
              <div className="bb-section-heading">
                <h2>Jogos recentes</h2>
                <button
                  className="bb-text-button"
                  type="button"
                  onClick={() => changeTab("jogos")}
                >
                  Ver todos <Icon name="chevron" />
                </button>
              </div>
              <PlayerGames
                rows={allGames.slice(0, 4)}
                go={go}
                mobile={mobile}
                compact
              />
            </section>
          </div>
        )}
        {active === "estatisticas" && (
          <>
            <div className="bb-section-heading">
              <div className="bb-section-title">
                <h2>Desempenho por competição</h2>
                <button
                  type="button"
                  className="bb-text-button"
                  onClick={onSiglas}
                >
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
                Participação registrada sem estatísticas individuais
                disponíveis.
              </p>
            )}
            <Evolution rows={filteredGames} go={go} />
          </>
        )}
        {active === "jogos" && (
          <>
            <h2 className="bb-detail-section-title">
              Jogos <span className="bb-count">{filteredGames.length}</span>
            </h2>
            <div className="bb-profile-game-columns">
              <ColumnPicker
                selected={visibleMetrics}
                options={profileMetricKeys}
                onChange={changeMetrics}
              />
            </div>
            <PlayerGames
              rows={filteredGames}
              go={go}
              mobile={mobile}
              metrics={visibleMetrics}
            />
          </>
        )}
        {active === "historico" && (
          <>
            <h2 className="bb-detail-section-title">Equipes e temporadas</h2>
            <ParticipationList rows={filtered} go={go} />
          </>
        )}
        {active === "conquistas" && (
          <>
            <h2 className="bb-detail-section-title">Conquistas e honrarias</h2>
            {awards.length ? (
              <ul className="bb-honors">
                {awards.map((award) => (
                  <li key={award.id}>
                    <Icon name="trophy" />
                    <div>
                      <h3>{award.title}</h3>
                      <p>
                        {award.year} · {award.competition} · {award.category}
                      </p>
                      <span>{award.team}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="bb-empty">
                Nenhuma conquista publicada para este jogador.
              </p>
            )}
          </>
        )}
      </TabPanel>
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
    { key: "date", label: "Data", render: (row) => displayDate(row.game.date) },
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
