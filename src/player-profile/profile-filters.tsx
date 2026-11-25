import "../ui-system/query-controls.css";
import { SearchInput } from "../ui-system/query-controls";
import { useState } from "react";
import { Modal } from "../ui-system/components";
import { PROFILE_METRICS, metricLabel } from "./public-model";
import { STATISTICS_METRICS } from "../statistics/metrics";
import type { ProfileView } from "./view-state";

type Option = { id: string; name: string };
export function ProfileFilters({
  kind,
  view,
  years,
  championships,
  teams,
  onClose,
  onApply,
}: {
  kind: "stats" | "games";
  view: ProfileView;
  years: number[];
  championships: Option[];
  teams: Option[];
  onClose: () => void;
  onApply: (patch: Partial<ProfileView>) => void;
}) {
  const [draft, setDraft] = useState(() => structuredClone(view));
  const games = kind === "games";
  const select = (
    label: string,
    key: "year" | "championship" | "gameYear" | "gameChampionship" | "gameTeam",
    options: Option[],
  ) => (
    <label className="bb-query-field">
      <span className="bb-query-label">{label}</span>
      <select
        name={key}
        value={draft[key]}
        onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
      >
        <option value="">
          {
            {
              Ano: "Todos os anos",
              Campeonato: "Todos os campeonatos",
              Equipe: "Todas as equipes",
            }[label]
          }
        </option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </label>
  );
  const selected = draft.teams ?? teams.map((t) => t.id);
  return (
    <Modal
      title="Filtrar e ajustar"
      onClose={onClose}
      actions={
        <>
          {(games
            ? !!(
                draft.gameYear ||
                draft.gameChampionship ||
                draft.gameTeam ||
                draft.opponent.trim()
              )
            : !!(
                draft.year ||
                draft.championship ||
                draft.teams !== null ||
                draft.scope !== "all"
              )) && (
            <button
              type="button"
              onClick={() =>
                setDraft({
                  ...draft,
                  ...(games
                    ? {
                        gameYear: "",
                        gameChampionship: "",
                        gameTeam: "",
                        opponent: "",
                      }
                    : {
                        year: "",
                        championship: "",
                        teams: null,
                        scope: "all",
                      }),
                })
              }
            >
              Limpar
            </button>
          )}
          <button type="button" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="bb-primary"
            type="submit"
            form="player-filter-form"
          >
            Aplicar
          </button>
        </>
      }
    >
      <form
        id="player-filter-form"
        className="player-filter-fields"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            onClose();
          }
        }}
        onSubmit={(e) => {
          e.preventDefault();
          onApply(
            games
              ? {
                  gameYear: draft.gameYear,
                  gameChampionship: draft.gameChampionship,
                  gameTeam: draft.gameTeam,
                  opponent: draft.opponent.trim(),
                  page: 1,
                }
              : {
                  year: draft.year,
                  championship: draft.championship,
                  teams: draft.teams,
                  scope: draft.scope,
                  columns: draft.columns,
                  statsPage: 1,
                },
          );
        }}
      >
        {select(
          "Ano",
          games ? "gameYear" : "year",
          years.map((y) => ({ id: String(y), name: String(y) })),
        )}
        {select(
          "Campeonato",
          games ? "gameChampionship" : "championship",
          championships,
        )}
        {games ? (
          <>
            {select("Equipe", "gameTeam", teams)}
            <label className="bb-query-field">
              <span className="bb-query-label">Buscar adversário</span>
              <SearchInput
                placeholder="Buscar adversário…"
                name="adversario"
                type="search"
                maxLength={120}
                autoComplete="off"
                value={draft.opponent}
                onChange={(e) =>
                  setDraft({ ...draft, opponent: e.target.value })
                }
              />
            </label>
          </>
        ) : (
          <>
            <fieldset>
              <legend>Equipes</legend>
              <div className="player-check-actions">
                <button
                  type="button"
                  onClick={() => setDraft({ ...draft, teams: null })}
                >
                  Todas
                </button>
                <button
                  type="button"
                  onClick={() => setDraft({ ...draft, teams: [] })}
                >
                  Nenhuma
                </button>
              </div>
              {teams.map((t) => (
                <label className="player-check" key={t.id}>
                  <input
                    type="checkbox"
                    checked={selected.includes(t.id)}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        teams: e.target.checked
                          ? [...selected, t.id]
                          : selected.filter((id) => id !== t.id),
                      })
                    }
                  />
                  {t.name}
                </label>
              ))}
            </fieldset>
            <label className="bb-query-field">
              <span className="bb-query-label">Fase</span>
              <select
                name="scope"
                value={draft.scope}
                onChange={(e) => setDraft({ ...draft, scope: e.target.value })}
              >
                <option value="all">Todas as fases</option>
                <option value="regular">Regular</option>
                <option value="playoffs">Eliminatórias</option>
              </select>
            </label>
            <fieldset>
              <legend>Colunas</legend>
              <div className="player-check-actions">
                <button
                  type="button"
                  onClick={() =>
                    setDraft({ ...draft, columns: [...PROFILE_METRICS] })
                  }
                >
                  Todas
                </button>
                <button
                  type="button"
                  onClick={() => setDraft({ ...draft, columns: [] })}
                >
                  Nenhuma
                </button>
              </div>
              {PROFILE_METRICS.map((m) => (
                <label className="player-check" key={m}>
                  <input
                    type="checkbox"
                    checked={draft.columns.includes(m)}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        columns: e.target.checked
                          ? [...draft.columns, m]
                          : draft.columns.filter((k) => k !== m),
                      })
                    }
                  />
                  {metricLabel(m)} · {STATISTICS_METRICS[m].name}
                </label>
              ))}
            </fieldset>
          </>
        )}
      </form>
    </Modal>
  );
}
