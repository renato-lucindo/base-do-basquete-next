import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { api, ApiFailure, isSessionFailure } from "./api";
import { AdminToast } from "../ui-system/admin-toast";
import { Icon } from "../ui-system/components";
import { AdminDialog } from "./admin-dialog";
import { DisputeControls } from "./dispute-controls";
import { ChampionshipPicker } from "./championship-picker";
import { CreateCompetitionDialog, type CreateTarget } from "./create-dialog";
import { disputeStatusLabels } from "./administration-contract";
import {
  disputeListPageSchema,
  disputeListQuerySchema,
  type DisputeListRow,
  type DisputeListQuery,
} from "./catalog-contract";
import "./catalog.css";

function Actions({
  label,
  primary = false,
  children,
}: {
  label: string;
  primary?: boolean;
  children: ReactNode;
}) {
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
  return (
    <div className="dispute-actions-menu">
      <button
        ref={button}
        type="button"
        popoverTarget={id}
        aria-label={label}
        className={primary ? "primary" : "secondary"}
      >
        {primary ? (
          <>
            <Icon name="plus" />
            {label}
            <span aria-hidden="true">⌄</span>
          </>
        ) : (
          <span aria-hidden="true">⋯</span>
        )}
      </button>
      <div
        ref={panel}
        id={id}
        popover="auto"
        className="dispute-menu-items"
        onBeforeToggle={(event) => {
          if (event.newState === "open") requestAnimationFrame(position);
        }}
        onClick={(event) => {
          if (
            !(event.target instanceof Element) ||
            !event.target.closest("button, a")
          )
            return;
          panel.current?.hidePopover();
          button.current?.focus({ preventScroll: true });
        }}
      >
        {children}
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
  const [championship, setChampionship] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [page, setPage] = useState({
    items: [] as DisputeListRow[],
    total: 0,
    hasMore: false,
    years: [] as number[],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);
  const [create, setCreate] = useState<CreateTarget | null>(null);
  const [managing, setManaging] = useState<DisputeListRow | null>(null);
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
      recent: false,
    });
  }
  function reset() {
    setChampionship(null);
    setQuery(disputeListQuerySchema.parse({}));
  }
  function add(target: CreateTarget) {
    setCreate(target);
    setError("");
    setNotice("");
  }
  const columns = [
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
    query.championshipId ||
    query.recent
  );
  return (
    <div className="dispute-catalog">
      <div className="dispute-list-heading">
        <h2 ref={heading} tabIndex={-1}>
          Disputas
        </h2>
        <Actions label="Adicionar" primary>
          <button type="button" onClick={() => add({ kind: "championship" })}>
            Novo campeonato
          </button>
          <button type="button" onClick={() => add({ kind: "season" })}>
            Nova temporada
          </button>
          <button type="button" onClick={() => add({ kind: "dispute" })}>
            Nova disputa
          </button>
        </Actions>
      </div>
      <div className="dispute-list-filters">
        <label className="dispute-search">
          Buscar
          <input
            name="dispute-search"
            autoComplete="off"
            placeholder="Campeonato, categoria ou divisão…"
            maxLength={120}
            value={query.q}
            onChange={(e) => filter({ q: e.target.value })}
          />
        </label>
        <ChampionshipPicker
          value={championship}
          onSessionLost={onSessionLost}
          onChange={(value) => {
            setChampionship(value);
            filter({ championshipId: value?.id ?? null });
          }}
        />
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
        <label className="competition-radio">
          <input
            type="checkbox"
            checked={query.recent}
            onChange={(e) => filter({ recent: e.target.checked })}
          />
          Mais recentes primeiro
        </label>
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
                      query.sort === key && !query.recent
                        ? query.direction === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    <button type="button" onClick={() => sort(key)}>
                      {label}
                      {query.sort === key && !query.recent && (
                        <span aria-hidden="true">
                          {query.direction === "asc" ? " ↑" : " ↓"}
                        </span>
                      )}
                    </button>
                  </th>
                ))}
                <th scope="col">
                  <span className="admin-visually-hidden">Ações</span>
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
                    <td>
                      <button
                        type="button"
                        id={"open-dispute-" + a.disputeId}
                        className="dispute-open"
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
                        <span aria-hidden="true">
                          {a.status === "completed"
                            ? "✓"
                            : a.status === "cancelled"
                              ? "×"
                              : "●"}
                        </span>
                        {disputeStatusLabels[a.status]}
                      </span>
                    </td>
                    <td>
                      <span className="dispute-visibility">
                        {a.isTest
                          ? "Teste"
                          : a.visibility === "public"
                            ? "Pública"
                            : "Privada"}
                      </span>
                    </td>
                    <td>
                      <Actions label={"Ações de " + rowLabel}>
                        <button
                          type="button"
                          onClick={() => {
                            lastRow.current = a.disputeId;
                            open(row.competitionId, a.disputeId);
                          }}
                        >
                          Abrir disputa
                        </button>
                        <button
                          type="button"
                          onClick={() => add({ kind: "dispute", row })}
                        >
                          Nova disputa nesta temporada
                        </button>
                        <button
                          type="button"
                          onClick={() => add({ kind: "season", row })}
                        >
                          Nova temporada neste campeonato
                        </button>
                        <button type="button" onClick={() => setManaging(row)}>
                          Situação e visibilidade
                        </button>
                        {a.isTest && (
                          <a
                            href={"/publico.html?previa=" + a.disputeId}
                            target="_blank"
                            rel="noopener"
                          >
                            Abrir prévia
                          </a>
                        )}
                      </Actions>
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
          className="secondary"
          disabled={loading || query.offset === 0}
          onClick={() =>
            setQuery((v) => ({ ...v, offset: Math.max(0, v.offset - 25) }))
          }
        >
          Anterior
        </button>
        <button
          className="secondary"
          disabled={loading || !page.hasMore}
          onClick={() => setQuery((v) => ({ ...v, offset: v.offset + 25 }))}
        >
          Próxima
        </button>
      </div>
      <AdminToast key={reload} message={notice} />
      {create && (
        <CreateCompetitionDialog
          enabled={enabled}
          target={create}
          onSessionLost={onSessionLost}
          guard={guard}
          onClose={() => {
            setCreate(null);
            guard.current = () => true;
          }}
          onSaved={() => {
            setCreate(null);
            guard.current = () => true;
            setNotice("Cadastro salvo");
            setReload((n) => n + 1);
          }}
        />
      )}
      {managing && (
        <AdminDialog
          open={enabled}
          busy={false}
          title={
            managing.name + " · " + managing.year + " · " + managing.category
          }
          onClose={() => setManaging(null)}
        >
          <DisputeControls
            state={managing.administration}
            disabled={false}
            onSessionLost={onSessionLost}
            onReload={() => {
              setManaging(null);
              setReload((n) => n + 1);
            }}
            onSaved={(administration) => {
              setManaging({ ...managing, administration });
              setReload((n) => n + 1);
            }}
          />
        </AdminDialog>
      )}
    </div>
  );
}
