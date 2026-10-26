import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { z } from "zod";
import { api, ApiFailure } from "../competition/api";
import {
  playerProfilePageSchema,
  type PlayerProfilePage,
} from "./page-contract";
import {
  parseProfileQuery,
  serializeProfileQuery,
  PROFILE_SECTIONS,
  type ProfileQuery,
} from "./query-contract";
import {
  STATISTICS_METRICS,
  type StatisticsMetric,
} from "../statistics/metrics";
const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const date = (s: string | null) =>
  s ? s.split("-").reverse().join("/") : "Data não informada";
const stamp = (s: string) =>
  new Date(s).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
type Context = PlayerProfilePage["contexts"][number]["context"];
const contextLabel = (c: Context) =>
  `${c.name} · ${c.year} · ${c.gender} · ${c.category}${c.division ? ` · ${c.division}` : ""}`;
function readLocation() {
  const [id = "", search = ""] = window.location.hash.slice(1).split("?", 2);
  try {
    return {
      id: z.uuid().parse(id).toLowerCase(),
      query: parseProfileQuery(new URLSearchParams(search)),
    };
  } catch {
    return { id: null, query: parseProfileQuery(new URLSearchParams()) };
  }
}
function Metadata({
  metadata: m,
}: {
  metadata: PlayerProfilePage["identity"]["metadata"];
}) {
  if (!m) return <p>Campos opcionais do perfil ainda não foram publicados.</p>;
  const values: [string, string | number | null][] = [
    ["Apelido", m.nickname],
    ["Ano de nascimento", m.publicBirthYear],
    ["Altura", m.heightCm === null ? null : `${m.heightCm} cm`],
    ["Peso", m.weightKg === null ? null : `${number.format(m.weightKg)} kg`],
    ["Posição", m.position],
    [
      "Mão dominante",
      m.dominantHand
        ? { left: "Esquerda", right: "Direita", both: "Ambidestra" }[
            m.dominantHand
          ]
        : null,
    ],
    ["Cidade de origem", m.originCity],
    ["Estado de origem", m.originState],
  ];
  return (
    <>
      <dl className="player-metadata">
        {values
          .filter(([, v]) => v !== null && v !== "")
          .map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
      </dl>
      {m.biography && <p className="player-biography">{m.biography}</p>}
    </>
  );
}
function Statistics({ data: d }: { data: PlayerProfilePage }) {
  const s = d.statistics,
    summary = s.summary;
  if (!summary)
    return (
      <p className="statistics-empty">
        {s.status === "mixed-minimums"
          ? "Este recorte reúne mínimos de tempo diferentes. Selecione uma disputa para consultar por 30 minutos."
          : "Nenhum jogo disputado com dados confirmados neste recorte."}
      </p>
    );
  return (
    <>
      <p>
        {summary.gamesPlayed} jogos disputados · {s.relatedGames} participações
        relacionadas.
      </p>
      <p>
        PTS oficiais e pontos avançados preservam fontes e coberturas próprias.
        — indica dado não informado; - indica amostra temporal insuficiente.
      </p>
      <p>
        Cobertura: {summary.coverage.scoringGames} jogos com pontos oficiais;{" "}
        {summary.coverage.advancedGames} com estatísticas avançadas;{" "}
        {summary.coverage.foulGames} com faltas cometidas;{" "}
        {summary.coverage.foulsReceivedGames} com faltas recebidas;{" "}
        {summary.coverage.plusMinusGames} com saldo;{" "}
        {summary.coverage.disciplineGames} com disciplina.
      </p>
      {d.query.mode === "per-30" && (
        <p>
          Mínimo temporal desta fonte: {s.minimumSeconds} segundos. Minutos não
          são normalizados por 30.
        </p>
      )}
      <div
        className="statistics-scroll"
        role="region"
        aria-label="Tabela de estatísticas da carreira"
        tabIndex={0}
      >
        <table>
          <caption>Estatísticas da carreira</caption>
          <thead>
            <tr>
              <th scope="col">Métrica</th>
              <th scope="col">Valor</th>
            </tr>
          </thead>
          <tbody>
            {(Object.keys(STATISTICS_METRICS) as StatisticsMetric[])
              .filter((k) => d.query.mode !== "per-30" || k !== "minutes")
              .map((k) => {
                const c = summary.metrics[k],
                  m = STATISTICS_METRICS[k];
                return (
                  <tr key={k}>
                    <th scope="row">
                      {m.label} <small>{m.name}</small>
                    </th>
                    <td>
                      {c.status === "available" ? (
                        number.format(c.value)
                      ) : (
                        <span
                          title={
                            c.status === "insufficient-sample"
                              ? "Amostra temporal insuficiente"
                              : "Não informado para este cálculo"
                          }
                        >
                          {c.status === "insufficient-sample" ? "-" : "—"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </>
  );
}
function Pager({
  kind,
  page,
  totalPages,
  total,
  onChange,
}: {
  kind: "jogos" | "inscrições";
  page: number;
  totalPages: number;
  total: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="statistics-actions" aria-label={`Paginação de ${kind}`}>
      <button
        type="button"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
        aria-label={`Página anterior de ${kind}`}
      >
        Anterior
      </button>
      <span>
        Página {page} de {totalPages} · {total} {kind}
      </span>
      <button
        type="button"
        disabled={page === totalPages}
        onClick={() => onChange(page + 1)}
        aria-label={`Próxima página de ${kind}`}
      >
        Próxima
      </button>
    </div>
  );
}
function Games({
  data: d,
  onPage,
}: {
  data: PlayerProfilePage;
  onPage: (n: number) => void;
}) {
  if (!d.games.total)
    return <p>Ainda não há jogos confirmados neste recorte.</p>;
  return (
    <>
      <p>
        Ordem da confirmação mais recente. Datas e horários permanecem como
        publicados. O resultado vinculado abre sua versão atual.
      </p>
      <div
        className="statistics-scroll"
        role="region"
        aria-label="Tabela de jogos confirmados"
        tabIndex={0}
      >
        <table>
          <caption>Jogos confirmados</caption>
          <thead>
            <tr>
              {[
                "Jogo",
                "Contexto",
                "Inscrição e camisa",
                "Nome da ocasião",
                "Participação",
                "PTS oficiais",
                "Fontes",
              ].map((t) => (
                <th scope="col" key={t}>
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {d.games.items.map((p) => (
              <tr key={p.fact.gameId}>
                <th scope="row">
                  <a href={`/resultado.html#${p.fact.gameId}`}>
                    {p.game.home.name} × {p.game.away.name}
                  </a>
                  <small>
                    {date(p.game.date)}
                    {p.game.time ? ` · ${p.game.time}` : ""}
                    {p.game.venue ? ` · ${p.game.venue}` : ""}
                  </small>
                </th>
                <td>{contextLabel(p.fact.context)}</td>
                <td>
                  {p.fact.registration.name} · #{p.fact.jersey}
                  <small>{p.fact.registration.team.name}</small>
                </td>
                <td>{p.fact.person.name}</td>
                <td>
                  {!p.fact.played
                    ? "Não participou"
                    : p.fact.starter
                      ? "Titular"
                      : "Participou"}
                  {p.fact.captain ? " · Capitão" : ""}
                </td>
                <td>{p.fact.scoring?.points ?? "—"}</td>
                <td>
                  <details>
                    <summary>Ver fontes</summary>
                    <p>
                      Resultado v{p.fact.publicationVersion} ·{" "}
                      {stamp(p.fact.publishedAt)}
                    </p>
                    <p>
                      PTS:{" "}
                      {p.fact.scoring?.origin.kind === "pdf"
                        ? "PDF"
                        : p.fact.scoring
                          ? "Súmula manual"
                          : "Não informado"}
                      {p.fact.scoring
                        ? ` v${p.fact.scoring.origin.version}`
                        : ""}
                    </p>
                    <p>
                      Avançados:{" "}
                      {p.fact.advanced
                        ? `PDF v${p.fact.advanced.origin.version}`
                        : "Não informados"}
                    </p>
                    <p>
                      Fase:{" "}
                      {p.fact.phase === "round_robin"
                        ? "Regular"
                        : p.fact.phase === "knockout"
                          ? "Eliminatória"
                          : "Não confirmada"}
                    </p>
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager kind="jogos" {...d.games} onChange={onPage} />
    </>
  );
}
function Honors({ data: d }: { data: PlayerProfilePage }) {
  return (
    <>
      <h3>Honrarias individuais</h3>
      {!d.honors.length ? (
        <p>Nenhuma honraria individual confirmada neste recorte.</p>
      ) : (
        <ul className="player-awards">
          {d.honors.map((h) => (
            <li key={h.disputeId + "/" + h.honor.id}>
              <strong>{h.honor.title}</strong>
              <p>{contextLabel(h.context)}</p>
              <p>
                Destinatário publicado: {h.recipient.name} · confirmação v
                {h.version} em {stamp(h.confirmedAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
      <h3>Colocações das equipes na ocasião</h3>
      <p>
        A participação contextual não atribui premiação individual nem
        elegibilidade automática a medalha.
      </p>
      {!d.teamPlacements.length ? (
        <p>Nenhuma colocação de equipe comprovada neste recorte.</p>
      ) : (
        <ul className="player-awards">
          {d.teamPlacements.map((p) => (
            <li key={p.disputeId + "/" + p.registration.registrationId}>
              <strong>
                {p.position}º lugar · {p.registration.name}
              </strong>
              <p>{contextLabel(p.context)}</p>
              <p>
                Confirmação v{p.version} em {stamp(p.confirmedAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
function History({
  data: d,
  onPage,
}: {
  data: PlayerProfilePage;
  onPage: (n: number) => void;
}) {
  if (!d.historyPagination.total)
    return (
      <p>
        Nenhuma inscrição comprovada por participação publicada neste recorte.
      </p>
    );
  return (
    <>
      <p>
        Trajetória nas participações confirmadas, sem inferir equipe atual ou
        datas de início e fim de vínculo. Datas abaixo são de jogos conhecidos.
        O escopo de fase filtra jogos e estatísticas; este histórico reúne as
        inscrições do recorte.
      </p>
      <div
        className="statistics-scroll"
        role="region"
        aria-label="Tabela de histórico do atleta"
        tabIndex={0}
      >
        <table>
          <caption>Inscrições em participações confirmadas</caption>
          <thead>
            <tr>
              {[
                "Contexto",
                "Equipe e inscrição",
                "Nomes da ocasião",
                "Camisas",
                "Participações",
                "Datas de jogos",
              ].map((t) => (
                <th key={t} scope="col">
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {d.history.map((h) => (
              <tr key={h.disputeId + "/" + h.registration.registrationId}>
                <th scope="row">{contextLabel(h.context)}</th>
                <td>
                  {h.teamNames.join(" / ")}
                  <small>{h.registrationNames.join(" / ")}</small>
                </td>
                <td>{h.names.join(" / ")}</td>
                <td>{h.jerseys.join(" / ")}</td>
                <td>
                  {h.playedGames} disputados · {h.relatedGames} relacionados
                </td>
                <td>
                  {h.firstGameDate
                    ? `${date(h.firstGameDate)} a ${date(h.lastGameDate)}`
                    : "Datas não informadas"}
                  {h.unknownDates && h.firstGameDate && (
                    <small>Há outros jogos sem data informada.</small>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager kind="inscrições" {...d.historyPagination} onChange={onPage} />
    </>
  );
}
export function PlayerPublicPage() {
  const [route, setRoute] = useState(readLocation),
    [result, setResult] = useState<{
      key: string;
      data: PlayerProfilePage;
    } | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [retry, setRetry] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null),
    alert = useRef<HTMLDivElement>(null),
    focus = useRef(false);
  const serialized = serializeProfileQuery(route.query),
    key = `${route.id}?${serialized}`;
  const data = result?.key === key ? result.data : null;
  const controls = result?.data.personId === route.id ? result.data : null;
  const q = data?.query ?? route.query;
  useEffect(() => {
    const read = () => {
      focus.current = true;
      setLoading(true);
      setError("");
      setRoute(readLocation());
    };
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  useEffect(() => {
    if (!route.id) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setError("");
    setLoading(true);
    void api(
      `/api/public/players/${route.id}?${serialized}`,
      playerProfilePageSchema,
      undefined,
      controller.signal,
    )
      .then((next) => {
        if (controller.signal.aborted) return;
        const requested = parseProfileQuery(new URLSearchParams(serialized));
        if (
          next.personId !== route.id ||
          serializeProfileQuery({
            ...next.query,
            page: requested.page,
            historyPage: requested.historyPage,
          }) !== serialized ||
          next.query.page > requested.page ||
          next.query.historyPage > requested.historyPage
        )
          throw new ApiFailure(
            503,
            "A resposta não corresponde à consulta. Tente novamente.",
          );
        setResult({ key, data: next });
        window.history.replaceState(
          null,
          "",
          `#${route.id}?${serializeProfileQuery(next.query)}`,
        );
      })
      .catch((e: unknown) => {
        if (!controller.signal.aborted) {
          setResult(null);
          setError(
            e instanceof ApiFailure
              ? e.message
              : "Não foi possível consultar o perfil. Tente novamente.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [route.id, serialized, key, retry]);
  useLayoutEffect(() => {
    const target = error ? alert.current : data ? heading.current : null;
    if (!loading && focus.current && target) {
      focus.current = false;
      target.focus();
    }
  }, [data, loading, error]);
  const href = (next: ProfileQuery) =>
    `#${route.id}?${serializeProfileQuery(next)}`;
  function navigate(patch: Partial<ProfileQuery>) {
    focus.current = true;
    const hash = href({ ...q, ...patch });
    if (window.location.hash === hash) setRetry((v) => v + 1);
    else window.location.hash = hash;
  }
  function filter(patch: Partial<ProfileQuery>) {
    navigate({ ...patch, page: 1, historyPage: 1 });
  }
  const contexts = controls?.contexts ?? [],
    championships = [
      ...new Map(
        contexts.map((r) => [r.context.championshipId, r.context]),
      ).values(),
    ],
    seasons = [
      ...new Map(
        contexts
          .filter(
            (r) =>
              !q.championshipId ||
              r.context.championshipId === q.championshipId,
          )
          .map((r) => [r.context.seasonId, r.context]),
      ).values(),
    ],
    disputes = contexts.filter(
      (r) =>
        (!q.championshipId || r.context.championshipId === q.championshipId) &&
        (!q.seasonId || r.context.seasonId === q.seasonId),
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
      <header className="access-header">
        <a href="/foundation.html">Base do Basquete</a>
        <span className="access-preview">Perfil com fontes confirmadas</span>
      </header>
      <main
        id="player-content"
        tabIndex={-1}
        className="access-main statistics-page player-page"
      >
        <h1>{data?.identity.name ?? "Perfil do atleta"}</h1>
        {!route.id ? (
          <p role="alert">Abra o perfil a partir de um atleta identificado.</p>
        ) : (
          <>
            <nav className="player-navigation" aria-label="Seções do perfil">
              {PROFILE_SECTIONS.map((s) => (
                <a
                  key={s.id}
                  href={href({ ...q, section: s.id })}
                  aria-current={q.section === s.id ? "page" : undefined}
                >
                  {s.label}
                </a>
              ))}
            </nav>
            {controls && (
              <div className="statistics-controls">
                <div className="statistics-fields">
                  <label>
                    Campeonato
                    <select
                      value={q.championshipId ?? ""}
                      disabled={loading}
                      onChange={(e) =>
                        filter({
                          championshipId: e.target.value || null,
                          seasonId: null,
                          disputeId: null,
                        })
                      }
                    >
                      <option value="">Toda a carreira</option>
                      {q.championshipId &&
                        !championships.some(
                          (c) => c.championshipId === q.championshipId,
                        ) && (
                          <option value={q.championshipId}>
                            Recorte sem dados
                          </option>
                        )}
                      {championships.map((c) => (
                        <option key={c.championshipId} value={c.championshipId}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Temporada
                    <select
                      value={q.seasonId ?? ""}
                      disabled={loading}
                      onChange={(e) => {
                        const c = seasons.find(
                          (c) => c.seasonId === e.target.value,
                        );
                        filter({
                          seasonId: e.target.value || null,
                          championshipId: c?.championshipId ?? q.championshipId,
                          disputeId: null,
                        });
                      }}
                    >
                      <option value="">Todas</option>
                      {q.seasonId &&
                        !seasons.some((c) => c.seasonId === q.seasonId) && (
                          <option value={q.seasonId}>Recorte sem dados</option>
                        )}
                      {seasons.map((c) => (
                        <option key={c.seasonId} value={c.seasonId}>
                          {c.year} · {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Disputa
                    <select
                      value={q.disputeId ?? ""}
                      disabled={loading}
                      onChange={(e) => {
                        const c = contexts.find(
                          (r) => r.disputeId === e.target.value,
                        )?.context;
                        filter({
                          disputeId: e.target.value || null,
                          seasonId: c?.seasonId ?? q.seasonId,
                          championshipId: c?.championshipId ?? q.championshipId,
                        });
                      }}
                    >
                      <option value="">Todas</option>
                      {q.disputeId &&
                        !disputes.some((r) => r.disputeId === q.disputeId) && (
                          <option value={q.disputeId}>Recorte sem dados</option>
                        )}
                      {disputes.map((r) => (
                        <option key={r.disputeId} value={r.disputeId}>
                          {contextLabel(r.context)}
                        </option>
                      ))}
                    </select>
                  </label>
                  {(q.section === "estatisticas" ||
                    q.section === "resumo" ||
                    q.section === "jogos") && (
                    <>
                      <label>
                        Modo
                        <select
                          value={q.mode}
                          disabled={loading}
                          onChange={(e) =>
                            filter({
                              mode: e.target.value as ProfileQuery["mode"],
                            })
                          }
                        >
                          <option value="per-game">Por jogo</option>
                          <option value="total">Total</option>
                          <option value="per-30">Por 30 minutos</option>
                        </select>
                      </label>
                      <label>
                        Escopo
                        <select
                          value={q.scope}
                          disabled={loading}
                          onChange={(e) =>
                            filter({
                              scope: e.target.value as ProfileQuery["scope"],
                            })
                          }
                        >
                          <option value="all">Todos</option>
                          <option value="regular">Fase regular</option>
                          <option value="playoffs">Eliminatórias</option>
                        </select>
                      </label>
                    </>
                  )}
                </div>
              </div>
            )}
            {loading ? (
              <p role="status">Consultando perfil confirmado…</p>
            ) : error ? (
              <div
                ref={alert}
                role="alert"
                tabIndex={-1}
                className="access-error"
              >
                <p>{error}</p>
                <button
                  onClick={() => {
                    focus.current = true;
                    setRetry((v) => v + 1);
                  }}
                >
                  Tentar novamente
                </button>
              </div>
            ) : (
              data && (
                <>
                  <p className="player-provenance">
                    Identidade:{" "}
                    {data.identity.origin.kind === "profile"
                      ? "perfil confirmado"
                      : data.identity.origin.kind === "game"
                        ? "ocasião de jogo publicado"
                        : "honraria confirmada"}{" "}
                    · v{data.identity.origin.version} ·{" "}
                    {stamp(data.identity.origin.publishedAt)}.
                  </p>
                  <section aria-labelledby="player-section">
                    <h2 id="player-section" ref={heading} tabIndex={-1}>
                      {PROFILE_SECTIONS.find((s) => s.id === q.section)?.label}
                    </h2>
                    {q.section === "resumo" && (
                      <>
                        <Metadata metadata={data.identity.metadata} />
                        {data.statistics.summary ? (
                          <p>
                            {data.statistics.summary.gamesPlayed} jogos
                            disputados
                          </p>
                        ) : data.statistics.relatedGames === 0 ? (
                          <p>Ainda não há jogos confirmados neste recorte.</p>
                        ) : data.statistics.status === "mixed-minimums" ? (
                          <p>
                            Resumo estatístico indisponível neste modo.
                            Selecione uma disputa em Estatísticas.
                          </p>
                        ) : (
                          <p>
                            Nenhum jogo disputado neste recorte; há
                            participações relacionadas.
                          </p>
                        )}
                        <p>
                          {data.historyPagination.total} inscrições em
                          participações publicadas. Equipes e camisas de cada
                          ocasião estão no Histórico.
                        </p>
                      </>
                    )}
                    {q.section === "estatisticas" && (
                      <>
                        <p>
                          Fases confirmadas:{" "}
                          {data.statistics.phaseCoverage.regularGames}{" "}
                          regulares;{" "}
                          {data.statistics.phaseCoverage.playoffGames}{" "}
                          eliminatórias;{" "}
                          {data.statistics.phaseCoverage.unknownGames} sem fase
                          confirmada. Os jogos sem fase só entram em Todos.
                        </p>
                        <Statistics data={data} />
                      </>
                    )}
                    {q.section === "conquistas" && <Honors data={data} />}
                    {q.section === "jogos" && (
                      <Games
                        data={data}
                        onPage={(page) => navigate({ page })}
                      />
                    )}
                    {q.section === "historico" && (
                      <History
                        data={data}
                        onPage={(historyPage) => navigate({ historyPage })}
                      />
                    )}
                  </section>
                </>
              )
            )}
          </>
        )}
      </main>
    </>
  );
}
