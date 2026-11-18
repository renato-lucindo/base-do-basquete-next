import { useEffect, useId, useRef, useState } from "react";
import { api, ApiFailure, isSessionFailure } from "./api";
import { AdminToast } from "../ui-system/admin-toast";
import { Icon } from "../ui-system/components";
import { DisputeFormDialog, type DisputeFormTarget } from "./create-dialog";
import {
  disputeStatusLabels,
  disputeAdministrationSchema,
  type DisputeAdministration,
  type DisputeAdministrationCommand,
} from "./administration-contract";
import {
  type ChampionshipOption,
  disputeListPageSchema,
  disputeListQuerySchema,
  type DisputeListRow,
  type DisputeListQuery,
} from "./catalog-contract";
import "./catalog.css";

const activityFormat = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const visibilityOptions = [
  {
    value: "public",
    label: "Pública",
    icon: "globe",
    description: "Disponível no catálogo e na busca.",
  },
  {
    value: "private",
    label: "Privada",
    icon: "lock",
    description: "Indisponível ao público, inclusive por link direto.",
  },
] as const;

function VisibilityControl({
  state,
  label,
  onSaved,
  onFailure,
}: {
  state: DisputeAdministration;
  label: string;
  onSaved: (state: DisputeAdministration) => void;
  onFailure: (failure: unknown) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const pending = useRef<DisputeAdministrationCommand | null>(null);
  const current =
    state.visibility === "public" ? visibilityOptions[0] : visibilityOptions[1];

  async function change(next: (typeof visibilityOptions)[number]["value"]) {
    if (busy || next === current.value) return;
    if (!pending.current || pending.current.expectedVersion !== state.version) {
      pending.current = {
        commandId: crypto.randomUUID(),
        disputeId: state.disputeId,
        expectedVersion: state.version,
        action: "set_visibility",
        visibility: next,
        reason: null,
      };
    }
    setBusy(true);
    try {
      const saved = await api(
        "/api/competition-administration/dispute",
        disputeAdministrationSchema,
        pending.current,
      );
      pending.current = null;
      onSaved(saved);
    } catch (error) {
      onFailure(error);
    } finally {
      setBusy(false);
    }
  }
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  function position() {
    const bounds = button.current?.getBoundingClientRect();
    const menu = panel.current;
    if (!bounds || !menu) return;
    const width = document.documentElement.clientWidth;
    menu.style.left =
      Math.max(8, Math.min(bounds.right, width - 8) - menu.offsetWidth) + "px";
    const below = innerHeight - bounds.bottom;
    menu.style.top =
      Math.max(
        8,
        below >= menu.offsetHeight || bounds.top < below
          ? Math.min(bounds.bottom + 4, innerHeight - menu.offsetHeight - 8)
          : bounds.top - menu.offsetHeight - 4,
      ) + "px";
  }
  useEffect(() => {
    const update = () => {
      if (panel.current?.matches(":popover-open")) position();
    };
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, []);
  if (state.isTest)
    return <span className="dispute-visibility-static">Teste · Privada</span>;
  return (
    <div className="dispute-actions-menu">
      <button
        ref={button}
        type="button"
        popoverTarget={id}
        aria-disabled={busy}
        aria-expanded={expanded}
        aria-haspopup="menu"
        aria-label={current.label + " · " + label}
        className="dispute-visibility secondary"
        onClick={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        <Icon name={current.icon} />
        {busy ? "Salvando…" : current.label}
        <Icon name="chevronDown" />
      </button>
      <div
        ref={panel}
        id={id}
        popover="auto"
        role="menu"
        aria-label="Escolher visibilidade"
        className="dispute-menu-items"
        onBeforeToggle={(event) => {
          if (event.newState === "open") position();
        }}
        onToggle={(event) => {
          const open = event.newState === "open";
          setExpanded(open);
          if (open) {
            position();
            panel.current
              ?.querySelector<HTMLElement>('[aria-checked="true"]')
              ?.focus({ preventScroll: true });
          }
        }}
        onKeyDown={(event) => {
          const options = Array.from(
            event.currentTarget.querySelectorAll<HTMLButtonElement>(
              "[role=menuitemradio]",
            ),
          );
          const index = options.indexOf(
            document.activeElement as HTMLButtonElement,
          );
          switch (event.key) {
            case "ArrowDown":
            case "ArrowUp":
              event.preventDefault();
              options[
                (index +
                  (event.key === "ArrowDown" ? 1 : -1) +
                  options.length) %
                  options.length
              ]?.focus();
              break;
            case "Home":
            case "End":
              event.preventDefault();
              options[event.key === "Home" ? 0 : options.length - 1]?.focus();
              break;
            case "Escape":
              event.preventDefault();
              panel.current?.hidePopover();
              button.current?.focus({ preventScroll: true });
              break;
            case "Tab":
              panel.current?.hidePopover();
              button.current?.focus({ preventScroll: true });
              break;
          }
        }}
      >
        {visibilityOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            role="menuitemradio"
            tabIndex={-1}
            aria-checked={option.value === current.value}
            aria-label={option.label}
            aria-describedby={id + "-" + option.value}
            onClick={() => {
              panel.current?.hidePopover();
              button.current?.focus({ preventScroll: true });
              void change(option.value);
            }}
          >
            <Icon name={option.icon} />
            <span>
              <strong>{option.label}</strong>
              <small id={id + "-" + option.value}>{option.description}</small>
            </span>
            {option.value === current.value && <Icon name="check" />}
          </button>
        ))}
      </div>
    </div>
  );
}

export function DisputeCatalog({
  enabled,
  refresh,
  opening,
  open,
  guard,
  onSessionLost,
}: {
  enabled: boolean;
  refresh: number;
  opening: boolean;
  open: (competitionId: string, disputeId: string) => void;
  guard: { current: () => boolean };
  onSessionLost: () => void;
}) {
  const [query, setQuery] = useState<DisputeListQuery>(() =>
    disputeListQuerySchema.parse({}),
  );
  const [page, setPage] = useState({
    items: [] as DisputeListRow[],
    total: 0,
    hasMore: false,
    years: [] as number[],
    championships: [] as ChampionshipOption[],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);
  const [create, setCreate] = useState<DisputeFormTarget | null>(null);
  const [actionError, setActionError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const scroll = useRef(0);
  const lastRow = useRef<string | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const timer = setTimeout(() => {
      void api(
        "/api/competition-administration/listing",
        disputeListPageSchema,
        query,
        controller.signal,
      )
        .then((value) => {
          if (!controller.signal.aborted) setPage(value);
        })
        .catch((failure) => {
          if (!controller.signal.aborted) {
            if (isSessionFailure(failure)) onSessionLost();
            else
              setError(
                failure instanceof ApiFailure
                  ? failure.message
                  : "Não foi possível carregar as disputas.",
              );
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 180);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [enabled, query, refresh, reload, onSessionLost]);
  useEffect(() => {
    if (!enabled) {
      scroll.current = window.scrollY;
      return;
    }
    if (lastRow.current)
      requestAnimationFrame(() => {
        document
          .getElementById("open-dispute-" + lastRow.current)
          ?.focus({ preventScroll: true });
        window.scrollTo(0, scroll.current);
      });
  }, [enabled]);
  function filter(value: Partial<DisputeListQuery>) {
    setQuery((previous) => ({ ...previous, ...value, offset: 0 }));
  }
  function sort(column: DisputeListQuery["sort"]) {
    filter({
      sort: column,
      direction:
        query.sort === column && query.direction === "asc" ? "desc" : "asc",
    });
  }
  function reset() {
    setQuery(disputeListQuerySchema.parse({}));
  }
  function add(target: DisputeFormTarget) {
    setCreate(target);
    setError("");
    setNotice("");
  }
  function administrationSaved(
    updated: DisputeAdministration,
    message: string,
  ) {
    setPage((old) => ({
      ...old,
      items: old.items.map((row) =>
        row.administration.disputeId === updated.disputeId
          ? { ...row, administration: updated }
          : row,
      ),
    }));
    setActionError("");
    setNotice(message);
    setReload((value) => value + 1);
  }

  const columns = [
    ["activity", "Última alteração"],
    ["championship", "Campeonato"],
    ["year", "Ano"],
    ["category", "Categoria"],
    ["gender", "Naipe"],
    ["division", "Divisão"],
    ["status", "Situação"],
    ["visibility", "Visibilidade"],
  ] as const;
  const filtered = !!(
    query.q ||
    query.year ||
    query.gender ||
    query.status ||
    query.visibility ||
    query.championshipIds.length
  );
  return (
    <div className="dispute-catalog" data-active={enabled || undefined}>
      <div className="dispute-list-heading">
        <h2 ref={heading} tabIndex={-1}>
          Disputas
        </h2>
        <button
          type="button"
          className="primary dispute-add"
          disabled={!!error || (loading && !page.championships.length)}
          onClick={() => add({ mode: "add" })}
        >
          <Icon name="plus" /> Adicionar
        </button>
      </div>
      <div className="dispute-list-filters">
        <label className="dispute-search">
          Buscar
          <input
            name="dispute-search"
            autoComplete="off"
            placeholder="Nome ou categoria…"
            maxLength={120}
            value={query.q}
            onChange={(e) => filter({ q: e.target.value })}
          />
        </label>
        <div className="dispute-championship-filter">
          <span>Campeonatos</span>
          <details
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget))
                event.currentTarget.open = false;
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape" && event.currentTarget.open) {
                event.preventDefault();
                event.currentTarget.open = false;
                event.currentTarget.querySelector("summary")?.focus();
              }
            }}
          >
            <summary aria-label="Filtrar campeonatos">
              {query.championshipIds.length
                ? query.championshipIds.length + " selecionados"
                : "Todos"}
              <Icon name="chevronDown" />
            </summary>
            <fieldset className="dispute-championship-options">
              <legend className="admin-visually-hidden">Campeonatos</legend>
              {page.championships.map((item) => (
                <label key={item.id}>
                  <input
                    type="checkbox"
                    checked={query.championshipIds.includes(item.id)}
                    onChange={(event) =>
                      filter({
                        championshipIds: event.target.checked
                          ? [...query.championshipIds, item.id]
                          : query.championshipIds.filter(
                              (id) => id !== item.id,
                            ),
                      })
                    }
                  />
                  <span>{item.name}</span>
                </label>
              ))}
              {!page.championships.length && (
                <p>Nenhum campeonato cadastrado.</p>
              )}
            </fieldset>
          </details>
        </div>
        <label>
          Ano
          <select
            name="year-filter"
            aria-label="Ano"
            value={query.year ?? ""}
            onChange={(e) =>
              filter({ year: e.target.value ? Number(e.target.value) : null })
            }
          >
            <option value="">Todos</option>
            {page.years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
        <label>
          Naipe
          <select
            name="gender-filter"
            aria-label="Naipe"
            value={query.gender ?? ""}
            onChange={(e) =>
              filter({
                gender: (e.target.value || null) as DisputeListQuery["gender"],
              })
            }
          >
            <option value="">Todos</option>
            <option value="masculino">Masculino</option>
            <option value="feminino">Feminino</option>
          </select>
        </label>
        <label>
          Situação
          <select
            name="status-filter"
            aria-label="Situação"
            value={query.status ?? ""}
            onChange={(e) =>
              filter({
                status: (e.target.value || null) as DisputeListQuery["status"],
              })
            }
          >
            <option value="">Todas</option>
            {Object.entries(disputeStatusLabels).map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Visibilidade
          <select
            name="visibility-filter"
            aria-label="Visibilidade"
            value={query.visibility ?? ""}
            onChange={(e) =>
              filter({
                visibility: (e.target.value ||
                  null) as DisputeListQuery["visibility"],
              })
            }
          >
            <option value="">Todas</option>
            <option value="public">Pública</option>
            <option value="private">Privada</option>
            <option value="test">Teste</option>
          </select>
        </label>
      </div>
      <div className="dispute-list-options">
        {filtered && (
          <button type="button" className="dispute-text-action" onClick={reset}>
            Limpar filtros
          </button>
        )}
        <span role="status">
          {loading
            ? "Carregando…"
            : page.total + " disputa" + (page.total === 1 ? "" : "s")}
        </span>
      </div>
      {error ? (
        <div role="alert" className="error-text">
          {error}{" "}
          <button className="secondary" onClick={() => setReload((n) => n + 1)}>
            Tentar novamente
          </button>
        </div>
      ) : (
        <div
          className="dispute-list-scroll"
          role="region"
          aria-label="Lista de disputas"
          tabIndex={0}
          aria-busy={loading}
        >
          <table className="dispute-list-table" aria-label="Disputas">
            <thead>
              <tr>
                {columns.map(([key, label]) => (
                  <th
                    scope="col"
                    key={key}
                    aria-sort={
                      query.sort === key
                        ? query.direction === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    <button type="button" onClick={() => sort(key)}>
                      {label}
                      {query.sort === key && (
                        <span aria-hidden="true">
                          {query.direction === "asc" ? " ↑" : " ↓"}
                        </span>
                      )}
                    </button>
                  </th>
                ))}
                <th scope="col" className="dispute-actions-heading">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {page.items.map((row) => {
                const a = row.administration;
                const rowLabel = [
                  row.name,
                  row.year,
                  row.category,
                  row.gender,
                  row.division,
                ]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <tr key={a.disputeId}>
                    <td className="dispute-activity">
                      {row.lastActivityAt ? (
                        <time dateTime={row.lastActivityAt}>
                          {activityFormat
                            .format(new Date(row.lastActivityAt))
                            .replace(", ", " ")}
                        </time>
                      ) : (
                        <span aria-label="Sem edição registrada">—</span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        id={"open-dispute-" + a.disputeId}
                        className="dispute-open"
                        title={row.name}
                        disabled={opening}
                        aria-label={"Abrir " + rowLabel}
                        onClick={() => {
                          lastRow.current = a.disputeId;
                          open(row.competitionId, a.disputeId);
                        }}
                      >
                        {row.name}
                      </button>
                    </td>
                    <td className="dispute-year">{row.year}</td>
                    <td>{row.category}</td>
                    <td>
                      {row.gender === "masculino" ? "Masculino" : "Feminino"}
                    </td>
                    <td>{row.division ?? "—"}</td>
                    <td>
                      <span className="dispute-status" data-status={a.status}>
                        {disputeStatusLabels[a.status]}
                      </span>
                    </td>
                    <td>
                      <VisibilityControl
                        state={a}
                        label={rowLabel}
                        onSaved={(updated) =>
                          administrationSaved(
                            updated,
                            updated.visibility === "public"
                              ? "Disputa tornada pública."
                              : "Disputa tornada privada.",
                          )
                        }
                        onFailure={(failure) => {
                          if (isSessionFailure(failure)) onSessionLost();
                          else {
                            setNotice("");
                            setActionError(
                              failure instanceof ApiFailure
                                ? failure.message
                                : "Não foi possível confirmar a alteração. Tente novamente.",
                            );
                            if (
                              failure instanceof ApiFailure &&
                              failure.code === "version_conflict"
                            )
                              setReload((value) => value + 1);
                          }
                        }}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="dispute-edit secondary"
                        aria-label={"Editar " + rowLabel}
                        onClick={() => add({ mode: "edit", row })}
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!loading && !page.items.length && (
            <p className="dispute-list-empty">
              {filtered
                ? "Nenhuma disputa encontrada com esses filtros."
                : "Ainda não há disputas cadastradas."}
            </p>
          )}
        </div>
      )}
      {(query.offset > 0 || page.hasMore) && (
        <div className="dispute-pagination">
          <span>
            {page.total > 0
              ? Math.min(query.offset + 1, page.total) +
                "–" +
                Math.min(query.offset + 25, page.total) +
                " de " +
                page.total
              : ""}
          </span>
          <button
            type="button"
            className="secondary"
            disabled={loading || query.offset === 0}
            onClick={() =>
              setQuery((v) => ({ ...v, offset: Math.max(0, v.offset - 25) }))
            }
          >
            Anterior
          </button>
          <button
            type="button"
            className="secondary"
            disabled={loading || !page.hasMore}
            onClick={() => setQuery((v) => ({ ...v, offset: v.offset + 25 }))}
          >
            Próxima
          </button>
        </div>
      )}
      <AdminToast key={reload} message={notice} />
      <AdminToast message={actionError} tone="error" />
      {create && (
        <DisputeFormDialog
          enabled={enabled}
          target={create}
          championships={page.championships}
          onAdministrationSaved={(updated) =>
            administrationSaved(
              updated,
              "Situação alterada para " +
                disputeStatusLabels[updated.status].toLowerCase() +
                ".",
            )
          }
          onSessionLost={onSessionLost}
          guard={guard}
          onClose={() => {
            setCreate(null);
            guard.current = () => true;
          }}
          onSaved={() => {
            setCreate(null);
            guard.current = () => true;
            setNotice(
              create.mode === "edit" ? "Alterações salvas" : "Cadastro salvo",
            );
            setReload((n) => n + 1);
          }}
        />
      )}
    </div>
  );
}
