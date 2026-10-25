import type { RegulationDefinition } from "./persistence-contract";
import type { RegistrationSnapshot } from "../teams/contract";
import type { GameSnapshot } from "../games/contract";
import type { TieCriterion } from "./contract";
export const criteriaLabels: Record<TieCriterion, string> = {
  wins: "Vitórias",
  point_difference: "Saldo de pontos",
  points_for: "Pontos marcados",
  head_to_head_points: "Pontos no confronto direto",
  head_to_head_difference: "Saldo no confronto direto",
  head_to_head_for: "Pontos marcados no confronto direto",
};
const formats = {
  single: "Partida única",
  two_leg: "Ida e volta",
  best_of_3: "Melhor de 3",
  best_of_5: "Melhor de 5",
  best_of_7: "Melhor de 7",
} as const;
const maximums = {
  single: 1,
  two_leg: 2,
  best_of_3: 3,
  best_of_5: 5,
  best_of_7: 7,
};
type Props = {
  definition: RegulationDefinition;
  registrations: RegistrationSnapshot[];
  games: GameSnapshot[];
  change: (f: (d: RegulationDefinition) => void) => void;
};
type Ref = RegulationDefinition["series"][number]["home"];
function ReferenceEditor({
  label,
  value,
  definition,
  registrations,
  onChange,
}: {
  label: string;
  value: Ref;
  definition: RegulationDefinition;
  registrations: RegistrationSnapshot[];
  onChange: (r: Ref) => void;
}) {
  return (
    <fieldset>
      <legend>{label}</legend>
      <label>
        Origem da inscrição
        <select
          aria-label={`${label}: origem`}
          value={value.kind}
          onChange={(e) => {
            const kind = e.target.value;
            if (kind === "registration") onChange({ kind, registrationId: "" });
            else if (kind === "group_rank")
              onChange({ kind, phaseId: "", groupId: "", position: 1 });
            else
              onChange({
                kind: kind as "series_winner" | "series_loser",
                seriesId: "",
              });
          }}
        >
          <option value="registration">Escolher inscrição</option>
          <option value="group_rank">Posição em grupo</option>
          <option value="series_winner">Vencedor de confronto</option>
          <option value="series_loser">Perdedor de confronto</option>
        </select>
      </label>
      {value.kind === "registration" ? (
        <label>
          Inscrição
          <select
            required
            aria-label={`${label}: inscrição`}
            value={value.registrationId}
            onChange={(e) =>
              onChange({ ...value, registrationId: e.target.value })
            }
          >
            <option value="">Selecione</option>
            {registrations
              .filter((r) => definition.registrationIds.includes(r.id))
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
          </select>
        </label>
      ) : value.kind === "group_rank" ? (
        <>
          <label>
            Grupo
            <select
              required
              value={value.phaseId + ":" + value.groupId}
              onChange={(e) => {
                const [phaseId, groupId] = e.target.value.split(":");
                onChange({ ...value, phaseId, groupId });
              }}
            >
              <option value=":">Selecione</option>
              {definition.groupPhases.flatMap((p) =>
                p.groups.map((g) => (
                  <option key={p.phaseId + g.id} value={p.phaseId + ":" + g.id}>
                    {p.name} / {g.name}
                  </option>
                )),
              )}
            </select>
          </label>
          <label>
            Posição no grupo
            <input
              type="number"
              min={1}
              max={1000}
              value={value.position}
              onChange={(e) =>
                onChange({ ...value, position: Number(e.target.value) })
              }
            />
          </label>
        </>
      ) : (
        <label>
          Confronto de origem
          <select
            required
            value={value.seriesId}
            onChange={(e) => onChange({ ...value, seriesId: e.target.value })}
          >
            <option value="">Selecione</option>
            {definition.series.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name}
              </option>
            ))}
          </select>
        </label>
      )}
    </fieldset>
  );
}
export function DefinitionEditor({
  definition: d,
  registrations,
  games,
  change,
}: Props) {
  const selected = registrations.filter((r) =>
    d.registrationIds.includes(r.id),
  );
  const addRound = (groups: number) =>
    change((v) => {
      v.groupPhases.push({
        phaseId: crypto.randomUUID(),
        name: `Fase ${v.groupPhases.length + 1}`,
        rules: {
          format: "round_robin",
          points: { win: NaN, loss: NaN },
          tieBreakers: [],
        },
        groups: Array.from({ length: groups }, (_, i) => ({
          id: crypto.randomUUID(),
          name: `Grupo ${i + 1}`,
          registrationIds: groups === 1 ? [...v.registrationIds] : [],
          gameIds: [],
        })),
      });
    });
  const addKnock = () =>
    change((v) => {
      v.knockoutPhases.push({
        id: crypto.randomUUID(),
        name: `Eliminatória ${v.knockoutPhases.length + 1}`,
      });
    });
  const targetOf = (gameId: string) => {
    for (const p of d.groupPhases)
      for (const g of p.groups)
        if (g.gameIds.includes(gameId)) return `g:${p.phaseId}:${g.id}`;
    for (const n of d.series)
      for (const g of n.games)
        if (g.gameId === gameId) return `s:${n.id}:${g.slot}`;
    return "";
  };
  const assign = (gameId: string, target: string) =>
    change((v) => {
      for (const p of v.groupPhases)
        for (const g of p.groups)
          g.gameIds = g.gameIds.filter((id) => id !== gameId);
      for (const n of v.series)
        n.games = n.games.filter((g) => g.gameId !== gameId);
      if (!target) return;
      const [kind, a, b] = target.split(":");
      if (kind === "g")
        v.groupPhases
          .find((p) => p.phaseId === a)!
          .groups.find((g) => g.id === b)!
          .gameIds.push(gameId);
      else
        v.series
          .find((n) => n.id === a)!
          .games.push({ slot: Number(b), gameId });
    });
  return (
    <>
      <fieldset>
        <legend>Regra de W.O.</legend>
        <label className="reg-check">
          <input
            type="checkbox"
            checked={!!d.occurrenceRules.wo}
            onChange={(e) =>
              change((v) => {
                v.occurrenceRules.wo = e.target.checked
                  ? {
                      winnerLeaguePoints: NaN,
                      loserLeaguePoints: NaN,
                      score: null,
                    }
                  : null;
              })
            }
          />
          Definir regra de W.O.
        </label>
        <p>
          Preencha os efeitos previstos no regulamento. Nenhum placar será
          presumido; a decisão de cada jogo exige conferência própria.
        </p>
        {d.occurrenceRules.wo && (
          <>
            <div className="reg-columns">
              {(["winnerLeaguePoints", "loserLeaguePoints"] as const).map(
                (key) => (
                  <label key={key}>
                    {key === "winnerLeaguePoints"
                      ? "Pontos de classificação do vencedor por W.O."
                      : "Pontos de classificação do perdedor por W.O."}
                    <input
                      type="number"
                      required
                      min={-1000000}
                      max={1000000}
                      step={1}
                      value={
                        Number.isFinite(d.occurrenceRules.wo![key])
                          ? d.occurrenceRules.wo![key]
                          : ""
                      }
                      onChange={(e) =>
                        change((v) => {
                          v.occurrenceRules.wo![key] =
                            e.target.value === ""
                              ? NaN
                              : Number(e.target.value);
                        })
                      }
                    />
                  </label>
                ),
              )}
            </div>
            <label className="reg-check">
              <input
                type="checkbox"
                checked={!!d.occurrenceRules.wo.score}
                onChange={(e) =>
                  change((v) => {
                    v.occurrenceRules.wo!.score = e.target.checked
                      ? { winner: NaN, loser: NaN }
                      : null;
                  })
                }
              />
              Definir placar administrativo do W.O.
            </label>
            {d.occurrenceRules.wo.score && (
              <div className="reg-columns">
                {(["winner", "loser"] as const).map((key) => (
                  <label key={key}>
                    {key === "winner"
                      ? "Placar do vencedor por W.O."
                      : "Placar do perdedor por W.O."}
                    <input
                      type="number"
                      required
                      min={0}
                      max={2147483647}
                      step={1}
                      value={
                        Number.isFinite(d.occurrenceRules.wo!.score![key])
                          ? d.occurrenceRules.wo!.score![key]
                          : ""
                      }
                      onChange={(e) =>
                        change((v) => {
                          v.occurrenceRules.wo!.score![key] =
                            e.target.value === ""
                              ? NaN
                              : Number(e.target.value);
                        })
                      }
                    />
                  </label>
                ))}
              </div>
            )}
          </>
        )}
      </fieldset>
      <fieldset>
        <legend>Inscrições na organização</legend>
        {registrations.map((r) => {
          const used =
            d.groupPhases.some((p) =>
              p.groups.some((g) => g.registrationIds.includes(r.id)),
            ) ||
            d.series.some((n) =>
              [n.home, n.away].some(
                (ref) =>
                  ref.kind === "registration" && ref.registrationId === r.id,
              ),
            );
          return (
            <label className="reg-check" key={r.id}>
              <input
                aria-label={`Incluir ${r.name}`}
                type="checkbox"
                checked={d.registrationIds.includes(r.id)}
                disabled={used}
                onChange={(e) =>
                  change((v) => {
                    v.registrationIds = e.target.checked
                      ? [...v.registrationIds, r.id]
                      : v.registrationIds.filter((id) => id !== r.id);
                  })
                }
              />
              {r.name}{" "}
              <small>
                · {r.team.name}
                {used ? " · em uso na estrutura" : ""}
              </small>
            </label>
          );
        })}
      </fieldset>
      <div className="reg-actions">
        <button type="button" onClick={() => addRound(1)}>
          Adicionar pontos corridos
        </button>
        <button type="button" onClick={addKnock}>
          Adicionar eliminatória
        </button>
        <button
          type="button"
          onClick={() => {
            addRound(2);
            addKnock();
          }}
        >
          Adicionar grupos e mata-mata
        </button>
      </div>
      {d.groupPhases.map((p, pi) => (
        <fieldset className="reg-phase" key={p.phaseId}>
          <legend>{p.name || "Fase de grupos"}</legend>
          <label>
            Nome da fase
            <input
              required
              maxLength={100}
              value={p.name}
              onChange={(e) =>
                change((v) => {
                  v.groupPhases[pi].name = e.target.value;
                })
              }
            />
          </label>
          <div className="reg-columns">
            {(["win", "loss"] as const).map((key) => (
              <label key={key}>
                {key === "win" ? "Pontos por vitória" : "Pontos por derrota"}
                <input
                  required
                  type="number"
                  min={-1000000}
                  max={1000000}
                  step={1}
                  value={
                    Number.isFinite(p.rules.points[key])
                      ? p.rules.points[key]
                      : ""
                  }
                  onChange={(e) =>
                    change((v) => {
                      v.groupPhases[pi].rules.points[key] =
                        e.target.value === "" ? NaN : Number(e.target.value);
                    })
                  }
                />
              </label>
            ))}
          </div>
          <fieldset>
            <legend>Critérios de desempate, na ordem de aplicação</legend>
            <p>Empates sem critério suficiente continuam pendentes.</p>
            {p.rules.tieBreakers.map((criterion, i) => (
              <div className="reg-actions" key={criterion}>
                <span>
                  {i + 1}. {criteriaLabels[criterion]}
                </span>
                <button
                  type="button"
                  disabled={!i}
                  aria-label={`Subir ${criteriaLabels[criterion]}`}
                  onClick={() =>
                    change((v) => {
                      const a = v.groupPhases[pi].rules.tieBreakers;
                      [a[i - 1], a[i]] = [a[i], a[i - 1]];
                    })
                  }
                >
                  Subir
                </button>
                <button
                  type="button"
                  disabled={i === p.rules.tieBreakers.length - 1}
                  aria-label={`Descer ${criteriaLabels[criterion]}`}
                  onClick={() =>
                    change((v) => {
                      const a = v.groupPhases[pi].rules.tieBreakers;
                      [a[i], a[i + 1]] = [a[i + 1], a[i]];
                    })
                  }
                >
                  Descer
                </button>
                <button
                  type="button"
                  onClick={() =>
                    change((v) => {
                      v.groupPhases[pi].rules.tieBreakers.splice(i, 1);
                    })
                  }
                >
                  Remover critério
                </button>
              </div>
            ))}
            <label>
              Adicionar critério
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value)
                    change((v) =>
                      v.groupPhases[pi].rules.tieBreakers.push(
                        e.target.value as TieCriterion,
                      ),
                    );
                }}
              >
                <option value="">Escolha um critério</option>
                {(Object.keys(criteriaLabels) as TieCriterion[])
                  .filter((c) => !p.rules.tieBreakers.includes(c))
                  .map((c) => (
                    <option key={c} value={c}>
                      {criteriaLabels[c]}
                    </option>
                  ))}
              </select>
            </label>
          </fieldset>
          {p.groups.map((g, gi) => (
            <fieldset key={g.id}>
              <legend>{g.name || "Grupo"}</legend>
              <label>
                Nome do grupo
                <input
                  required
                  maxLength={100}
                  value={g.name}
                  onChange={(e) =>
                    change((v) => {
                      v.groupPhases[pi].groups[gi].name = e.target.value;
                    })
                  }
                />
              </label>
              {selected.map((r) => (
                <label className="reg-check" key={r.id}>
                  <input
                    type="checkbox"
                    aria-label={`${g.name}: incluir ${r.name}`}
                    checked={g.registrationIds.includes(r.id)}
                    disabled={p.groups.some(
                      (other) =>
                        other.id !== g.id &&
                        other.registrationIds.includes(r.id),
                    )}
                    onChange={(e) =>
                      change((v) => {
                        const group = v.groupPhases[pi].groups[gi];
                        group.registrationIds = e.target.checked
                          ? [...group.registrationIds, r.id]
                          : group.registrationIds.filter((id) => id !== r.id);
                      })
                    }
                  />
                  {r.name}
                </label>
              ))}
              <p>{g.gameIds.length} jogo(s) atribuído(s).</p>
              <button
                type="button"
                disabled={d.series.some((n) =>
                  [n.home, n.away].some(
                    (r) =>
                      r.kind === "group_rank" &&
                      r.phaseId === p.phaseId &&
                      r.groupId === g.id,
                  ),
                )}
                onClick={() =>
                  change((v) => {
                    v.groupPhases[pi].groups.splice(gi, 1);
                  })
                }
              >
                Remover grupo
              </button>
            </fieldset>
          ))}
          <div className="reg-actions">
            <button
              type="button"
              onClick={() =>
                change((v) => {
                  v.groupPhases[pi].groups.push({
                    id: crypto.randomUUID(),
                    name: `Grupo ${p.groups.length + 1}`,
                    registrationIds: [],
                    gameIds: [],
                  });
                })
              }
            >
              Adicionar grupo
            </button>
            <button
              type="button"
              disabled={d.series.some((n) =>
                [n.home, n.away].some(
                  (r) => r.kind === "group_rank" && r.phaseId === p.phaseId,
                ),
              )}
              onClick={() =>
                change((v) => {
                  v.groupPhases.splice(pi, 1);
                })
              }
            >
              Remover fase
            </button>
          </div>
        </fieldset>
      ))}
      {d.knockoutPhases.map((p, pi) => (
        <fieldset className="reg-phase" key={p.id}>
          <legend>{p.name || "Eliminatória"}</legend>
          <label>
            Nome da fase eliminatória
            <input
              required
              maxLength={100}
              value={p.name}
              onChange={(e) =>
                change((v) => {
                  v.knockoutPhases[pi].name = e.target.value;
                })
              }
            />
          </label>
          {d.series
            .filter((n) => n.phaseId === p.id)
            .map((n) => {
              const index = d.series.findIndex((a) => a.id === n.id);
              return (
                <fieldset key={n.id}>
                  <legend>{n.name || "Confronto"}</legend>
                  <label>
                    Nome do confronto
                    <input
                      required
                      maxLength={100}
                      value={n.name}
                      onChange={(e) =>
                        change((v) => {
                          v.series[index].name = e.target.value;
                        })
                      }
                    />
                  </label>
                  <label>
                    Formato do confronto
                    <select
                      value={n.format}
                      onChange={(e) =>
                        change((v) => {
                          v.series[index].format = e.target
                            .value as typeof n.format;
                        })
                      }
                    >
                      {(Object.keys(formats) as (keyof typeof formats)[]).map(
                        (k) => (
                          <option
                            key={k}
                            value={k}
                            disabled={n.games.some((g) => g.slot > maximums[k])}
                          >
                            {formats[k]}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                  <p>
                    Para reduzir o formato, retire antes as atribuições dos
                    jogos que excedem seus slots.
                  </p>
                  <div className="reg-columns">
                    <ReferenceEditor
                      label={`${n.name}: equipe A`}
                      value={n.home}
                      definition={d}
                      registrations={registrations}
                      onChange={(r) =>
                        change((v) => {
                          v.series[index].home = r;
                        })
                      }
                    />
                    <ReferenceEditor
                      label={`${n.name}: equipe B`}
                      value={n.away}
                      definition={d}
                      registrations={registrations}
                      onChange={(r) =>
                        change((v) => {
                          v.series[index].away = r;
                        })
                      }
                    />
                  </div>
                  <p>{n.games.length} jogo(s) atribuído(s).</p>
                  <button
                    type="button"
                    disabled={d.series.some(
                      (other) =>
                        other.id !== n.id &&
                        [other.home, other.away].some(
                          (r) =>
                            (r.kind === "series_winner" ||
                              r.kind === "series_loser") &&
                            r.seriesId === n.id,
                        ),
                    )}
                    onClick={() =>
                      change((v) => {
                        v.series.splice(index, 1);
                      })
                    }
                  >
                    Remover confronto
                  </button>
                </fieldset>
              );
            })}
          <button
            type="button"
            onClick={() =>
              change((v) => {
                v.series.push({
                  id: crypto.randomUUID(),
                  phaseId: p.id,
                  name: `Confronto ${v.series.length + 1}`,
                  format: "single",
                  home: { kind: "registration", registrationId: "" },
                  away: { kind: "registration", registrationId: "" },
                  games: [],
                });
              })
            }
          >
            Adicionar confronto
          </button>
          <button
            type="button"
            disabled={d.series.some((n) => n.phaseId === p.id)}
            onClick={() =>
              change((v) => {
                v.knockoutPhases.splice(pi, 1);
              })
            }
          >
            Remover eliminatória
          </button>
          <p>Retire os confrontos antes de remover a fase eliminatória.</p>
        </fieldset>
      ))}
      {games.length > 0 && (
        <div
          className="reg-table"
          role="region"
          aria-label="Tabela de jogos para atribuir"
          tabIndex={0}
        >
          <table>
            <caption>Jogos disponíveis nesta página</caption>
            <thead>
              <tr>
                <th scope="col">Jogo</th>
                <th scope="col">Agenda</th>
                <th scope="col">Organização</th>
              </tr>
            </thead>
            <tbody>
              {games.map((game) => {
                const label =
                  game.number || `${game.home.name} × ${game.away.name}`;
                return (
                  <tr key={game.id}>
                    <th scope="row">
                      {game.home.name} × {game.away.name}
                      {game.number && <small> · {game.number}</small>}
                    </th>
                    <td>
                      {game.date
                        ? game.date.split("-").reverse().join("/")
                        : "Data não informada"}
                      {game.time ? ` · ${game.time}` : ""}
                    </td>
                    <td>
                      <label>
                        Organização do jogo {label}
                        <select
                          aria-label={`Organização do jogo ${label}`}
                          value={targetOf(game.id)}
                          onChange={(e) => assign(game.id, e.target.value)}
                        >
                          <option value="">Sem atribuição</option>
                          {d.groupPhases.flatMap((p) =>
                            p.groups.map((g) => (
                              <option
                                key={g.id}
                                value={`g:${p.phaseId}:${g.id}`}
                                disabled={
                                  !g.registrationIds.includes(
                                    game.homeRegistrationId,
                                  ) ||
                                  !g.registrationIds.includes(
                                    game.awayRegistrationId,
                                  )
                                }
                              >
                                {p.name} / {g.name}
                              </option>
                            )),
                          )}
                          {d.series.flatMap((n) =>
                            Array.from(
                              { length: maximums[n.format] },
                              (_, i) => (
                                <option
                                  key={n.id + i}
                                  value={`s:${n.id}:${i + 1}`}
                                  disabled={n.games.some(
                                    (g) =>
                                      g.slot === i + 1 && g.gameId !== game.id,
                                  )}
                                >
                                  {n.name} / Jogo {i + 1}
                                </option>
                              ),
                            ),
                          )}
                        </select>
                      </label>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
