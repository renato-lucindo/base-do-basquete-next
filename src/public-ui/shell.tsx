import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { api } from "../competition/api";
import {
  disputeStatusLabels,
  disputeStatusSchema,
} from "../competition/administration-contract";
import { previewDisputeId } from "./preview";
import {
  disputeLink,
  publicSections,
  type PublicContext,
  type PublicSection,
} from "./catalog-contract";
import { DisputeLinks, publicDisputes, usePublicCatalog } from "./catalog";
import { safePublicReturn, sectionReturn } from "./navigation";
import { PublicSearchForm } from "./search-form";

import "../ui-system/theme.css";
import "./navigation.css";
import "./legend.css";
import { siteDisputeId, siteHome, siteTitle } from "./site";

export function PublicHeader({
  disputeId,
  section,
  context,
  detail,
}: {
  disputeId?: string | null;
  section?: PublicSection;
  context?: PublicContext | null;
  detail?: string;
} = {}) {
  return (
    <header className="site-header public-header">
      {previewDisputeId() && (
        <div className="wrap" role="status">
          Prévia de disputa de teste ·{" "}
          <a href="/publico.html?sairPrevia=1">Sair da prévia</a>
        </div>
      )}
      <div className="wrap header-inner">
        <a href={siteHome} className="brand">
          <span className="brand-mark" aria-hidden="true">
            b.
          </span>
          <span>{siteTitle}</span>
        </a>
        {!siteDisputeId && <PublicSearchForm />}
        {!siteDisputeId && (
          <>
            <a href="/publico.html" className="public-catalog-link">
              Campeonatos
            </a>
            <a href="/foundation.html" className="public-admin">
              Administração
            </a>
          </>
        )}
      </div>
      {disputeId && section && (
        <DisputeNavigation
          key={disputeId}
          disputeId={disputeId}
          section={section}
          context={context}
          detail={detail}
        />
      )}
      {!disputeId && detail && (
        <nav className="public-return wrap" aria-label="Localização">
          <a
            href={
              safePublicReturn(
                new URLSearchParams(window.location.search).get("returnTo"),
                null,
              ) ?? "/publico.html"
            }
          >
            Voltar à origem
          </a>
          <span aria-hidden="true"> / </span>
          <span aria-current="page">{detail}</span>
        </nav>
      )}
    </header>
  );
}
function DisputeNavigation({
  disputeId,
  section,
  context,
  detail,
}: {
  disputeId: string;
  section: PublicSection;
  context?: PublicContext | null;
  detail?: string;
}) {
  const catalog = usePublicCatalog(disputeId);
  const [publicState, setPublicState] = useState<{
    disputeId: string;
    status: keyof typeof disputeStatusLabels | null;
  } | null>(null);
  const status =
    publicState?.disputeId === disputeId ? publicState.status : null;
  useEffect(() => {
    const controller = new AbortController();
    void api(
      "/api/public/dispute-status/" + disputeId,
      disputeStatusSchema.nullable(),
      undefined,
      controller.signal,
    )
      .then((value) => {
        if (!controller.signal.aborted)
          setPublicState({ disputeId, status: value });
      })
      .catch(() => {});
    return () => controller.abort();
  }, [disputeId]);
  const [selecting, setSelecting] = useState<
    "championship" | "edition" | "gender" | null
  >(null);
  const panelId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const c =
    context ?? catalog.disputes[0]?.context ?? catalog.games[0]?.context;
  const statusBadge = status && (
    <span className="public-dispute-status" data-status={status}>
      {disputeStatusLabels[status]}
    </span>
  );
  return (
    <div
      className="public-context wrap"
      data-choosing-dispute={selecting || undefined}
      onKeyDown={(e) => {
        if (selecting && e.key === "Escape") {
          e.preventDefault();
          setSelecting(null);
          trigger.current?.focus();
        }
      }}
    >
      <div className="public-context-line">
        {c ? (
          <div className="public-dispute-identity">
            <nav
              aria-label="Contexto da disputa"
              className="public-dispute-breadcrumb"
            >
              <ol>
                {(
                  [
                    ["championship", c.name],
                    ["edition", String(c.year)],
                    [
                      "gender",
                      c.gender === "masculino" ? "Masculino" : "Feminino",
                    ],
                  ] as const
                ).map(([level, label]) => (
                  <li key={level}>
                    {!siteDisputeId ? (
                      <button
                        type="button"
                        className="public-competition-trigger"
                        aria-expanded={selecting === level}
                        aria-controls={
                          selecting === level ? panelId : undefined
                        }
                        onClick={(event) => {
                          trigger.current = event.currentTarget;
                          setSelecting(selecting === level ? null : level);
                        }}
                      >
                        {label}
                      </button>
                    ) : (
                      <span>{label}</span>
                    )}
                  </li>
                ))}
                <li aria-current="page">
                  <span>
                    {c.category}
                    {c.division ? ` · ${c.division}` : ""}
                  </span>
                </li>
              </ol>
            </nav>
            {statusBadge}
          </div>
        ) : (
          <p>
            {catalog.loading
              ? "Carregando disputa…"
              : "Disputa sem contexto público disponível"}
          </p>
        )}
        {selecting && c && (
          <EditionDisputes
            id={panelId}
            context={c}
            section={section}
            currentId={disputeId}
            level={selecting}
            onClose={() => {
              setSelecting(null);
              trigger.current?.focus();
            }}
          />
        )}
      </div>
      <nav className="dispute-navigation" aria-label="Seções da disputa">
        {publicSections.map((s) => (
          <a
            key={s.id}
            href={disputeLink(disputeId, s.id)}
            aria-current={s.id === section ? "page" : undefined}
          >
            {s.label}
          </a>
        ))}
      </nav>
      {detail && (
        <nav className="public-return" aria-label="Localização">
          <a href={siteHome}>{siteDisputeId ? siteTitle : "Competições"}</a>
          <span aria-hidden="true"> / </span>
          <a href={sectionReturn(disputeId, section)}>
            <span className="public-visually-hidden">Voltar à origem: </span>
            {publicSections.find((s) => s.id === section)?.label}
          </a>
          <span aria-hidden="true"> / </span>
          <span aria-current="page">{detail}</span>
        </nav>
      )}
    </div>
  );
}
function EditionDisputes({
  id,
  context,
  section,
  currentId,
  onClose,
  level,
}: {
  level: "championship" | "edition" | "gender";
  id: string;
  context: PublicContext;
  section: PublicSection;
  currentId: string;
  onClose: () => void;
}) {
  const catalog = usePublicCatalog();
  const disputes = publicDisputes(catalog.games, catalog.disputes).filter(
    (d) =>
      level === "championship" ||
      (d.context.championshipId === context.championshipId &&
        (level === "edition" || d.context.year === context.year)),
  );
  return (
    <nav
      id={id}
      className="public-selector-panel"
      aria-label="Disputas da edição"
    >
      {catalog.loading && <p role="status">Carregando disputas…</p>}
      {catalog.error && (
        <p role="alert">
          {catalog.error}{" "}
          <button type="button" onClick={catalog.retry}>
            Tentar novamente
          </button>
        </p>
      )}
      {!catalog.loading && !catalog.error && (
        <>
          {[
            ...new Map(
              (disputes.length
                ? disputes
                : [{ disputeId: currentId, context }]
              ).map((d) => [
                `${d.context.championshipId}/${d.context.year}`,
                d.context,
              ]),
            ).entries(),
          ].map(([key, group]) => (
            <section key={key}>
              <h3>
                {group.name} · {group.year}
              </h3>
              <DisputeLinks
                disputes={(disputes.length
                  ? disputes
                  : [{ disputeId: currentId, context }]
                ).filter(
                  (d) =>
                    d.context.championshipId === group.championshipId &&
                    d.context.year === group.year,
                )}
                headingLevel="h4"
                section={section}
                currentId={currentId}
                onSelect={(e) => {
                  if (!e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey)
                    onClose();
                }}
              />
            </section>
          ))}
        </>
      )}
      <a href="/publico.html">Ver todos os campeonatos</a>
    </nav>
  );
}

export function PublicBreadcrumb({
  context,
  page,
  href,
}: {
  context?: ReactNode;
  page: string;
  href?: string;
}) {
  return (
    <nav className="breadcrumb" aria-label="Localização">
      <a href={siteHome}>{siteDisputeId ? siteTitle : "Competições"}</a>
      <span aria-hidden="true">/</span>
      {context && (
        <>
          {href ? <a href={href}>{context}</a> : <span>{context}</span>}
          <span aria-hidden="true">/</span>
        </>
      )}
      <span aria-current="page">{page}</span>
    </nav>
  );
}
export function PublicFooter() {
  return (
    <footer className="wrap footer public-footer">
      <a href={siteHome} className="brand public-footer-brand">
        <span className="brand-mark" aria-hidden="true">
          b.
        </span>
        <span>Base do Basquete</span>
      </a>
      <span>Dados a partir de 2026</span>
    </footer>
  );
}
