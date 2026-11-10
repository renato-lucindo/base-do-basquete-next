import { useState } from "react";
import type { CompetitionSetup } from "./format";
import type { CompetitionSetupView } from "./setup-contract";
import type { RegulationDefinition } from "./persistence-contract";
import { SetupPicker } from "./setup-picker";
import { criteriaLabels } from "./definition-editor";
import {
  createFibaRules,
  createDefaultDefinition,
  hasCustomRules,
} from "./defaults";
const numberValue = (n: number) => (Number.isFinite(n) ? n : "");
const comparisonLabels = {
  league_points_per_game: "Pontos de classificação por jogo",
  difference_per_game: "Saldo médio",
  points_for_per_game: "Pontos marcados médios",
  wins_per_game: "Aproveitamento de vitórias",
  league_points: "Pontos de classificação",
  difference: "Saldo de pontos",
  points_for: "Pontos marcados",
  wins: "Vitórias",
};
type Props = {
  document: CompetitionSetup;
  view: CompetitionSetupView;
  definition: RegulationDefinition;
  change: (f: (d: CompetitionSetup) => void) => void;
  disabled: boolean;
};
export function SetupOptions({
  document: d,
  view,
  definition,
  change,
  disabled,
}: Props) {
  const [teamQuery, setTeamQuery] = useState(""),
    [gameQuery, setGameQuery] = useState(""),
    [teamOffset, setTeamOffset] = useState(0),
    [gameOffset, setGameOffset] = useState(0),
    names = new Map(view.registrations.map((r) => [r.id, r.name])),
    teams = view.registrations.filter((r) =>
      r.name.toLocaleLowerCase().includes(teamQuery.toLocaleLowerCase()),
    ),
    games = view.games.filter((g) =>
      `${g.number ?? ""} ${names.get(g.homeRegistrationId)} ${names.get(g.awayRegistrationId)}`
        .toLocaleLowerCase()
        .includes(gameQuery.toLocaleLowerCase()),
    ),
    teamOptions = view.registrations.map((r) => ({
      value: r.id,
      label: r.name,
    })),
    customRules = hasCustomRules({
      ...createDefaultDefinition(),
      occurrenceRules: d.occurrenceRules,
      groupPhases: [
        { phaseId: view.disputeId, name: "Regras", rules: d.rules, groups: [] },
      ],
    }),
    targets = [
      ...definition.groupPhases.flatMap((p) =>
        p.groups.map((g) => ({ value: `g:${g.id}`, label: g.name })),
      ),
      ...definition.series.map((s) => ({ value: `s:${s.id}`, label: s.name })),
    ];
  return (
    <div className="setup-options">
      {d.groupCount > 1 && (
        <details>
          <summary>Equipes e grupos</summary>
          <p className="setup-hint">
            A distribuição dos grupos é independente dos lançamentos dos jogos.
          </p>
          <div className="setup-fields">
            {Array.from({ length: d.groupCount }, (_, i) => (
              <label key={i} className="setup-field">
                Nome do grupo {i + 1}
                <input
                  required
                  maxLength={100}
                  value={
                    d.groupNames[i] ??
                    `Grupo ${i < 26 ? String.fromCharCode(65 + i) : i + 1}`
                  }
                  onChange={(e) =>
                    change((v) => {
                      v.groupNames = Array.from(
                        { length: v.groupCount },
                        (_, n) =>
                          n === i
                            ? e.target.value
                            : (v.groupNames[n] ??
                              `Grupo ${n < 26 ? String.fromCharCode(65 + n) : n + 1}`),
                      );
                    })
                  }
                />
              </label>
            ))}
          </div>
          <label className="setup-field">
            Buscar equipe
            <input
              type="search"
              value={teamQuery}
              onChange={(e) => {
                setTeamQuery(e.target.value);
                setTeamOffset(0);
              }}
            />
          </label>
          <div className="setup-members">
            {teams.slice(teamOffset, teamOffset + 20).map((r) => (
              <SetupPicker
                key={r.id}
                label={`Grupo de ${r.name}`}
                value={
                  d.memberships[r.id] != null ? String(d.memberships[r.id]) : ""
                }
                empty="A definir"
                disabled={disabled}
                options={Array.from({ length: d.groupCount }, (_, i) => ({
                  value: String(i),
                  label:
                    d.groupNames[i] ??
                    `Grupo ${i < 26 ? String.fromCharCode(65 + i) : i + 1}`,
                }))}
                onChange={(value) =>
                  change((v) => {
                    v.memberships[r.id] = value === "" ? null : Number(value);
                  })
                }
              />
            ))}
          </div>
          <div className="setup-inline-actions">
            {teamOffset > 0 && (
              <button
                type="button"
                className="setup-link"
                onClick={() => setTeamOffset((i) => Math.max(0, i - 20))}
              >
                Equipes anteriores
              </button>
            )}
            {teamOffset + 20 < teams.length && (
              <button
                type="button"
                className="setup-link"
                onClick={() => setTeamOffset((i) => i + 20)}
              >
                Próximas equipes
              </button>
            )}
          </div>
        </details>
      )}
      {d.knockoutSize > 0 && (
        <details>
          <summary>Classificados e cruzamentos manuais</summary>
          <label className="setup-check">
            <input
              type="checkbox"
              checked={d.manualOrder.length > 0}
              disabled={disabled}
              onChange={(e) =>
                change((v) => {
                  v.manualOrder = e.target.checked
                    ? Array.from({ length: v.knockoutSize }, () => null)
                    : [];
                })
              }
            />
            Escolher classificados manualmente
          </label>
          {d.manualOrder.length > 0 && (
            <div className="setup-members">
              {Array.from({ length: d.knockoutSize }, (_, i) => (
                <SetupPicker
                  key={i}
                  label={`Classificado ${i + 1}`}
                  value={d.manualOrder[i] ?? ""}
                  empty="A definir"
                  options={teamOptions.filter(
                    (o) =>
                      o.value === d.manualOrder[i] ||
                      !d.manualOrder.includes(o.value),
                  )}
                  disabled={disabled}
                  onChange={(value) =>
                    change((v) => {
                      v.manualOrder = Array.from(
                        { length: v.knockoutSize },
                        (_, n) =>
                          n === i ? value || null : (v.manualOrder[n] ?? null),
                      );
                    })
                  }
                />
              ))}
            </div>
          )}
          <p className="setup-hint">
            Uma escolha manual permanece até você alterá-la ou voltar ao
            automático. A tabela dos grupos é preservada.
          </p>
          {definition.series.map((s) => (
            <details key={s.id} className="setup-match">
              <summary>{s.name}</summary>
              <div className="setup-fields">
                {(["home", "away"] as const).map((side, i) => (
                  <SetupPicker
                    key={side}
                    label={`${s.name}: equipe ${i + 1}`}
                    value={d.manualEntrants[s.id]?.[side] ?? ""}
                    options={teamOptions}
                    disabled={disabled}
                    onChange={(value) =>
                      change((v) => {
                        v.manualEntrants[s.id] = {
                          home: v.manualEntrants[s.id]?.home ?? null,
                          away: v.manualEntrants[s.id]?.away ?? null,
                          [side]: value || null,
                        };
                      })
                    }
                  />
                ))}
              </div>
            </details>
          ))}
        </details>
      )}
      <details>
        <summary>
          Associação dos jogos{" "}
          <span className="setup-count">
            {view.organizationPendingGameIds.length} pendente(s)
          </span>
        </summary>
        <p className="setup-hint">
          Resultados ficam disponíveis mesmo sem grupo ou confronto definido.
        </p>
        <label className="setup-field">
          Buscar jogo
          <input
            type="search"
            value={gameQuery}
            onChange={(e) => {
              setGameQuery(e.target.value);
              setGameOffset(0);
            }}
          />
        </label>
        {games.slice(gameOffset, gameOffset + 20).map((g) => {
          const a = d.assignments.find((a) => a.gameId === g.id),
            value =
              a?.kind === "series"
                ? `s:${a.seriesId}`
                : a?.kind === "group"
                  ? `g:${a.groupId}`
                  : a?.kind === "unassigned"
                    ? "none"
                    : "";
          return (
            <div key={g.id} className="setup-game-assignment">
              <SetupPicker
                label={`${g.number ? `Jogo ${g.number}: ` : ""}${names.get(g.homeRegistrationId)} × ${names.get(g.awayRegistrationId)}`}
                value={value}
                empty="Associar automaticamente"
                options={[
                  { value: "none", label: "Manter sem associação" },
                  ...targets,
                ]}
                disabled={disabled}
                onChange={(target) =>
                  change((v) => {
                    v.assignments = v.assignments.filter(
                      (a) => a.gameId !== g.id,
                    );
                    if (target === "none")
                      v.assignments.push({ kind: "unassigned", gameId: g.id });
                    else if (target.startsWith("g:"))
                      v.assignments.push({
                        kind: "group",
                        gameId: g.id,
                        groupId: target.slice(2),
                      });
                    else if (target.startsWith("s:")) {
                      const seriesId = target.slice(2),
                        used = new Set(
                          v.assignments.flatMap((a) =>
                            a.kind === "series" && a.seriesId === seriesId
                              ? [a.slot]
                              : [],
                          ),
                        );
                      v.assignments.push({
                        kind: "series",
                        gameId: g.id,
                        seriesId,
                        slot:
                          [1, 2, 3, 4, 5, 6, 7].find((n) => !used.has(n)) ?? 1,
                      });
                    }
                  })
                }
              />
              {a?.kind === "series" && (
                <label className="setup-field">
                  Partida na série
                  <input
                    type="number"
                    required
                    min={1}
                    max={7}
                    value={numberValue(a.slot)}
                    disabled={disabled}
                    onChange={(e) =>
                      change((v) => {
                        const assignment = v.assignments.find(
                          (a) => a.gameId === g.id,
                        );
                        if (assignment?.kind === "series")
                          assignment.slot = e.target.valueAsNumber;
                      })
                    }
                  />
                </label>
              )}
            </div>
          );
        })}
        <div className="setup-inline-actions">
          {gameOffset > 0 && (
            <button
              type="button"
              className="setup-link"
              onClick={() => setGameOffset((i) => Math.max(0, i - 20))}
            >
              Jogos anteriores
            </button>
          )}
          {gameOffset + 20 < games.length && (
            <button
              type="button"
              className="setup-link"
              onClick={() => setGameOffset((i) => i + 20)}
            >
              Próximos jogos
            </button>
          )}
        </div>
      </details>
      {d.groupCount > 1 && (
        <details>
          <summary>Comparação entre grupos</summary>
          <p className="setup-hint">
            Usada para ordenar classificados e escolher vagas extras. Médias
            consideram apenas jogos válidos para a classificação.
          </p>
          {d.extras.map((e, i) => (
            <div key={i} className="setup-fields">
              <label className="setup-field">
                Posição comparada na vaga extra {i + 1}
                <input
                  type="number"
                  required
                  min={1}
                  max={1000}
                  value={numberValue(e.position)}
                  onChange={(event) =>
                    change((v) => {
                      v.extras[i].position = event.target.valueAsNumber;
                    })
                  }
                />
              </label>
              <label className="setup-field">
                Quantidade de vagas extras na regra {i + 1}
                <input
                  type="number"
                  required
                  min={1}
                  max={1000}
                  value={numberValue(e.count)}
                  onChange={(event) =>
                    change((v) => {
                      v.extras[i].count = event.target.valueAsNumber;
                    })
                  }
                />
              </label>
              <button
                type="button"
                className="setup-link"
                disabled={disabled}
                onClick={() =>
                  change((v) => {
                    v.extras.splice(i, 1);
                  })
                }
              >
                Retirar regra de vaga extra {i + 1}
              </button>
            </div>
          ))}
          <ol className="setup-criteria">
            {d.comparison.map((c, i) => (
              <li key={c}>
                <select
                  aria-label={`Critério entre grupos ${i + 1}`}
                  value={c}
                  onChange={(e) =>
                    change((v) => {
                      v.comparison[i] = e.target.value as typeof c;
                    })
                  }
                >
                  {Object.entries(comparisonLabels)
                    .filter(
                      ([value]) =>
                        value === c ||
                        !d.comparison.includes(value as typeof c),
                    )
                    .map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  className="setup-link"
                  disabled={i === 0 || disabled}
                  aria-label={`Subir ${comparisonLabels[c]}`}
                  onClick={() =>
                    change((v) => {
                      [v.comparison[i - 1], v.comparison[i]] = [
                        v.comparison[i],
                        v.comparison[i - 1],
                      ];
                    })
                  }
                >
                  Subir
                </button>
                <button
                  type="button"
                  className="setup-link"
                  disabled={d.comparison.length === 1 || disabled}
                  aria-label={`Retirar ${comparisonLabels[c]}`}
                  onClick={() =>
                    change((v) => {
                      v.comparison.splice(i, 1);
                    })
                  }
                >
                  Retirar
                </button>
              </li>
            ))}
          </ol>
          <button
            type="button"
            className="setup-link"
            disabled={disabled || d.comparison.length === 8}
            onClick={() =>
              change((v) => {
                const next = (
                  Object.keys(
                    comparisonLabels,
                  ) as (keyof typeof comparisonLabels)[]
                ).find((k) => !v.comparison.includes(k));
                if (next) v.comparison.push(next);
              })
            }
          >
            Adicionar critério
          </button>
          <button
            type="button"
            className="setup-link"
            disabled={disabled || d.extras.length >= 32}
            onClick={() =>
              change((v) => {
                v.extras.push({ position: v.directPerGroup + 1, count: 1 });
              })
            }
          >
            Adicionar outra regra de vaga extra
          </button>
        </details>
      )}
      <details className="setup-rules">
        <summary>
          Regras de classificação{" "}
          <span className={customRules ? "setup-badge custom" : "setup-badge"}>
            {customRules ? "Personalizadas" : "Padrão FIBA"}
          </span>
        </summary>
        <div className="setup-fields">
          {(["win", "loss"] as const).map((k) => (
            <label key={k} className="setup-field">
              {k === "win" ? "Pontos por vitória" : "Pontos por derrota"}
              <input
                type="number"
                required
                min={-1000000}
                max={1000000}
                value={numberValue(d.rules.points[k])}
                onChange={(e) =>
                  change((v) => {
                    v.rules.points[k] = e.target.valueAsNumber;
                  })
                }
              />
            </label>
          ))}
          {d.occurrenceRules.wo &&
            (["winnerLeaguePoints", "loserLeaguePoints"] as const).map((k) => (
              <label key={k} className="setup-field">
                {k === "winnerLeaguePoints"
                  ? "Pontos por vitória em W.O."
                  : "Pontos por derrota em W.O."}
                <input
                  type="number"
                  required
                  value={numberValue(d.occurrenceRules.wo![k])}
                  onChange={(e) =>
                    change((v) => {
                      if (v.occurrenceRules.wo)
                        v.occurrenceRules.wo[k] = e.target.valueAsNumber;
                    })
                  }
                />
              </label>
            ))}
          {d.occurrenceRules.wo?.score &&
            (["winner", "loser"] as const).map((k) => (
              <label key={k} className="setup-field">
                Placar W.O.: {k === "winner" ? "vencedor" : "perdedor"}
                <input
                  type="number"
                  required
                  min={0}
                  value={numberValue(d.occurrenceRules.wo!.score![k])}
                  onChange={(e) =>
                    change((v) => {
                      if (v.occurrenceRules.wo?.score)
                        v.occurrenceRules.wo.score[k] = e.target.valueAsNumber;
                    })
                  }
                />
              </label>
            ))}
        </div>
        <h5>Ordem dos desempates</h5>
        <ol className="setup-criteria">
          {d.rules.tieBreakers.map((c, i) => (
            <li key={c}>
              <select
                aria-label={`Critério de desempate ${i + 1}`}
                value={c}
                onChange={(e) =>
                  change((v) => {
                    v.rules.tieBreakers[i] = e.target.value as typeof c;
                  })
                }
              >
                {Object.entries(criteriaLabels)
                  .filter(
                    ([value]) =>
                      value === c ||
                      !d.rules.tieBreakers.includes(value as typeof c),
                  )
                  .map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                className="setup-link"
                disabled={i === 0 || disabled}
                aria-label={`Subir ${criteriaLabels[c]}`}
                onClick={() =>
                  change((v) => {
                    [v.rules.tieBreakers[i - 1], v.rules.tieBreakers[i]] = [
                      v.rules.tieBreakers[i],
                      v.rules.tieBreakers[i - 1],
                    ];
                  })
                }
              >
                Subir
              </button>
              <button
                type="button"
                className="setup-link"
                disabled={disabled}
                aria-label={`Retirar ${criteriaLabels[c]}`}
                onClick={() =>
                  change((v) => {
                    v.rules.tieBreakers.splice(i, 1);
                  })
                }
              >
                Retirar
              </button>
            </li>
          ))}
        </ol>
        <button
          type="button"
          className="setup-link"
          disabled={disabled || d.rules.tieBreakers.length === 6}
          onClick={() =>
            change((v) => {
              const next = (
                Object.keys(criteriaLabels) as (keyof typeof criteriaLabels)[]
              ).find((k) => !v.rules.tieBreakers.includes(k));
              if (next) v.rules.tieBreakers.push(next);
            })
          }
        >
          Adicionar desempate
        </button>
        <button
          type="button"
          className="setup-link"
          disabled={disabled}
          onClick={() =>
            change((v) => {
              v.rules = createFibaRules(v.turns);
              v.occurrenceRules = createDefaultDefinition().occurrenceRules;
            })
          }
        >
          Restaurar regras FIBA
        </button>
      </details>
    </div>
  );
}
