// Fonte: docs/design/prototipos/estatisticas/react-prototype/adapted/team-filter.tsx
// Team-filter fieldset extracted from upstream/boxscore-statistics-explorer.tsx.
// Local adapter replaces URL mutations with a controlled array; original choices and actions retained.
import { useEffect, useRef, useState } from "react";
export function TeamFilter({
  options,
  value,
  onChange,
}: {
  options: { id: string; name: string }[];
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const data = { teams: options.map((t) => ({ ...t, slug: t.id })) };
  const selectedTeams = new Set(value),
    selectedTeamCount = value.length;
  const hasTeamFilter = selectedTeamCount !== data.teams.length;
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (!container.current?.contains(e.target as Node)) setOpen(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("keydown", escape);
    document.addEventListener("pointerdown", outside);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  const title =
    selectedTeamCount === data.teams.length
      ? "Todas as equipes"
      : selectedTeamCount === 0
        ? "Nenhuma equipe"
        : "Equipes · " + selectedTeamCount + " de " + data.teams.length;
  return (
    <div
      ref={container}
      className="team-filter"
      data-source-component="TeamFilter"
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          setOpen(false);
          trigger.current?.focus();
        }
      }}
      onBlur={(e) => {
        if (
          e.relatedTarget &&
          !e.currentTarget.contains(e.relatedTarget as Node)
        )
          setOpen(false);
      }}
    >
      <span id="team-filter-label" className="filter-label">
        Equipe
      </span>
      <button
        id="team-filter-toggle"
        ref={trigger}
        type="button"
        aria-labelledby="team-filter-label team-filter-value"
        aria-expanded={open}
        aria-controls="team-filter-panel"
        onClick={() => setOpen((v) => !v)}
      >
        <span id="team-filter-value">{title}</span>
        <span aria-hidden="true">⌄</span>
      </button>
      {open ? (
        <div id="team-filter-panel" className="team-filter-panel">
          <fieldset className="reference-team-filter">
            <legend>
              Equipes · {selectedTeamCount}/{data.teams.length}
            </legend>
            <fieldset className="reference-team-actions">
              <legend className="sr-only">Ações de seleção de equipes</legend>
              <button
                aria-label="Selecionar todas as equipes"
                disabled={!data.teams.length || !hasTeamFilter}
                onClick={() => {
                  onChange(data.teams.map((t) => t.slug));
                  requestAnimationFrame(() =>
                    container.current
                      ?.querySelector<HTMLInputElement>("input")
                      ?.focus(),
                  );
                }}
                type="button"
              >
                Todas
              </button>
              <button
                aria-label="Não selecionar nenhuma equipe"
                disabled={
                  !data.teams.length || (hasTeamFilter && !selectedTeams.size)
                }
                onClick={() => {
                  onChange([]);
                  requestAnimationFrame(() =>
                    container.current
                      ?.querySelector<HTMLInputElement>("input")
                      ?.focus(),
                  );
                }}
                type="button"
              >
                Nenhuma
              </button>
            </fieldset>
            <div className="reference-team-options">
              {data.teams.map((team) => {
                const checked = !hasTeamFilter || selectedTeams.has(team.slug);
                return (
                  <label key={team.id}>
                    <input
                      data-team={team.slug}
                      checked={checked}
                      onChange={() => {
                        const next = new Set(selectedTeams);
                        if (next.has(team.slug)) next.delete(team.slug);
                        else next.add(team.slug);
                        onChange(
                          data.teams
                            .filter((t) => next.has(t.slug))
                            .map((t) => t.slug),
                        );
                      }}
                      type="checkbox"
                    />
                    <span>{team.name}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        </div>
      ) : null}
    </div>
  );
}
