import type { ReactNode } from "react";
export function PublicHeader() {
  return (
    <header className="site-header">
      <div className="wrap header-inner">
        <a href="/foundation.html" className="brand">
          <span className="brand-mark" aria-hidden="true">
            b.
          </span>
          <span>Base do Basquete</span>
        </a>
        <span className="public-label">Consulta pública</span>
      </div>
    </header>
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
      <a href="/foundation.html">Campeonatos</a>
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
    <footer className="wrap footer">
      <span>Base do Basquete</span>
      <span>Resultados publicados</span>
    </footer>
  );
}
