import { useEffect, useId, useRef, type ReactNode } from "react";
import type { Sort } from "./controls";

const paths = {
  search: "m21 21-5-5M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Z",
  close: "m6 6 12 12M6 18 18 6",
  chevron: "m9 5 7 7-7 7",
  back: "m14 5-7 7 7 7",
  plus: "M12 5v14M5 12h14",
  columns: "M8 4v16M16 4v16M4 4h16v16H4Z",
  player: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2",
  teams:
    "M15 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM6 21v-2a6 6 0 0 1 12 0v2M18 4a3 3 0 0 1 0 6M21 19v-2a5 5 0 0 0-3-4M6 4a3 3 0 0 0 0 6M3 19v-2a5 5 0 0 1 3-4",
  trophy:
    "M8 3h8v6a4 4 0 0 1-8 0V3ZM8 5H4v2a4 4 0 0 0 4 4M16 5h4v2a4 4 0 0 1-4 4M12 13v6M8 21h8M9 19h6",
  check: "m5 12 4 4L19 6",
  arrow: "M5 12h14m-5-5 5 5-5 5",
  file: "M14 2H5v20h14V7l-5-5ZM14 2v5h5M8 12h8M8 16h8",
} as const;
export function Icon({ name }: { name: keyof typeof paths }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}

export type Column<T> = {
  key: string;
  label: ReactNode;
  description?: string;
  numeric?: boolean;
  sortable?: boolean;
  primary?: boolean;
  render: (row: T) => ReactNode;
};
export function DataTable<T>({
  label,
  columns,
  rows,
  rowId,
  sort,
  onSort,
  empty = "Nenhum resultado encontrado.",
}: {
  label: string;
  columns: Column<T>[];
  rows: readonly T[];
  rowId: (row: T) => string;
  sort?: Sort;
  onSort?: (key: string) => void;
  empty?: ReactNode;
}) {
  return (
    <div
      className="bb-table-scroll"
      role="region"
      aria-label={label}
      tabIndex={0}
    >
      <table className="bb-table">
        <caption className="bb-sr-only">{label}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={`${c.numeric ? "bb-numeric" : ""} ${c.primary ? "bb-primary-cell" : ""}`}
                aria-sort={
                  sort?.key === c.key
                    ? sort.direction === "asc"
                      ? "ascending"
                      : "descending"
                    : undefined
                }
              >
                {c.sortable && onSort ? (
                  <button
                    type="button"
                    title={c.description}
                    onClick={() => onSort(c.key)}
                  >
                    {c.label}
                    {sort?.key === c.key && (
                      <span aria-hidden="true">
                        {sort.direction === "asc" ? " ↑" : " ↓"}
                      </span>
                    )}
                  </button>
                ) : (
                  <span title={c.description}>{c.label}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row) => (
              <tr key={rowId(row)}>
                {columns.map((c) =>
                  c.primary ? (
                    <th scope="row" key={c.key} className="bb-primary-cell">
                      {c.render(row)}
                    </th>
                  ) : (
                    <td
                      key={c.key}
                      className={c.numeric ? "bb-numeric" : undefined}
                    >
                      {c.render(row)}
                    </td>
                  ),
                )}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="bb-empty">
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function SectionTabs({
  id,
  label,
  items,
  active,
  onChange,
}: {
  id: string;
  label: string;
  items: readonly { key: string; label: string }[];
  active: string;
  onChange: (key: string) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  return (
    <div className="bb-tabs" role="tablist" aria-label={label}>
      {items.map((item, i) => (
        <button
          key={item.key}
          type="button"
          ref={(el) => {
            refs.current[i] = el;
          }}
          role="tab"
          id={`${id}-${item.key}`}
          aria-controls={`${id}-panel-${item.key}`}
          aria-selected={active === item.key}
          tabIndex={active === item.key ? 0 : -1}
          onClick={() => onChange(item.key)}
          onKeyDown={(event) => {
            const next =
              event.key === "ArrowRight"
                ? (i + 1) % items.length
                : event.key === "ArrowLeft"
                  ? (i + items.length - 1) % items.length
                  : event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? items.length - 1
                      : -1;
            if (next < 0) return;
            event.preventDefault();
            onChange(items[next].key);
            refs.current[next]?.focus();
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function TabPanel({
  id,
  active,
  children,
}: {
  id: string;
  active: string;
  children: ReactNode;
}) {
  return (
    <section
      role="tabpanel"
      id={`${id}-panel-${active}`}
      aria-labelledby={`${id}-${active}`}
    >
      {children}
    </section>
  );
}

export function Modal({
  title,
  children,
  onClose,
  actions,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  actions?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="bb-dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const r = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < r.left ||
            event.clientX > r.right ||
            event.clientY < r.top ||
            event.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <header>
        <h2 id={titleId}>{title}</h2>
        <button
          type="button"
          className="bb-icon-button"
          aria-label="Fechar diálogo"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </header>
      <div className="bb-dialog-body">{children}</div>
      {actions && <footer>{actions}</footer>}
    </dialog>
  );
}

export function Pager({
  page,
  total,
  size,
  onChange,
}: {
  page: number;
  total: number;
  size: number;
  onChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / size));
  return (
    <div className="bb-pager">
      <span>
        {total
          ? `${(page - 1) * size + 1}–${Math.min(page * size, total)} de ${total}`
          : "0 resultados"}
      </span>
      <div>
        <button
          type="button"
          className="bb-icon-button"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label="Página anterior"
        >
          <Icon name="back" />
        </button>
        <span>
          Página {page} de {pages}
        </span>
        <button
          type="button"
          className="bb-icon-button"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
          aria-label="Próxima página"
        >
          <Icon name="chevron" />
        </button>
      </div>
    </div>
  );
}
