import { useState, type ReactNode } from "react";
import {
  contextLabel,
  disputeLink,
  publicSections,
  type PublicContext,
  type PublicSection,
} from "./catalog-contract";
import { CompetitionTree, usePublicCatalog } from "./catalog";
import { safePublicReturn, sectionReturn } from "./navigation";
import { PublicSearchForm } from "./search-form";
import { Modal } from "../ui-system/components";
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
  const [selecting, setSelecting] = useState(false);
  const c =
    context ?? catalog.disputes[0]?.context ?? catalog.games[0]?.context;
  return (
    <div className="public-context wrap">
      <div className="public-context-line">
        {c && !siteDisputeId ? (
          <p>
            <button
              type="button"
              className="public-competition-trigger"
              aria-haspopup="dialog"
              aria-expanded={selecting}
              onClick={() => setSelecting(true)}
            >
              {c.name}
              <span aria-hidden="true"> ⌄</span>
            </button>
            <span>{contextLabel(c).slice(c.name.length)}</span>
          </p>
        ) : (
          <p>
            {c
              ? contextLabel(c)
              : catalog.loading
                ? "Carregando disputa…"
                : "Disputa sem contexto público disponível"}
          </p>
        )}
        {selecting && (
          <div className="public-dispute-dialog bb-ui">
            <Modal title="Escolher disputa" onClose={() => setSelecting(false)}>
              <QuickSelector onSelect={() => setSelecting(false)} />
            </Modal>
          </div>
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
function QuickSelector({ onSelect }: { onSelect: () => void }) {
  const catalog = usePublicCatalog();
  const [query, setQuery] = useState("");
  return (
    <div className="public-selector-panel">
      <label>
        Buscar competição ou disputa
        <input
          type="search"
          name="q"
          autoComplete="off"
          maxLength={120}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      {catalog.loading && <p role="status">Carregando disputas…</p>}
      {catalog.error && (
        <p role="alert">
          {catalog.error}{" "}
          <button onClick={catalog.retry}>Tentar novamente</button>
        </p>
      )}
      {!catalog.loading && !catalog.error && (
        <CompetitionTree
          games={catalog.games}
          confirmed={catalog.disputes}
          query={query}
          onSelect={(e) => {
            if (!e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey)
              onSelect();
          }}
        />
      )}
      <a href="/publico.html">Todas as competições e busca pública</a>
    </div>
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
      <span>{siteTitle}</span>
      <span>Resultados publicados</span>
    </footer>
  );
}
