import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";
import { PublicHeader, PublicFooter, PublicBreadcrumb } from "./shell";
import { PublicDiscovery, usePublicCatalog } from "./catalog";
import { readPublicDispute, publicDetailLink } from "./navigation";
import {
  usePublicStandings,
  PublicStandingsTables,
  PublicSchedule,
} from "../regulation/public-page";
import "../public-ui/legacy.css";

function PublicHome() {
  const [route, setRoute] = useState(() =>
    readPublicDispute(window.location.hash),
  );
  useEffect(() => {
    const read = () => setRoute(readPublicDispute(window.location.hash));
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  const catalog = usePublicCatalog(route.id);
  const standings = usePublicStandings(route.id);
  const games = [...catalog.games].sort(
    (a, b) =>
      (a.game.date ?? "9999").localeCompare(b.game.date ?? "9999") ||
      (a.game.time ?? "99").localeCompare(b.game.time ?? "99") ||
      a.id.localeCompare(b.id),
  );
  const invalid =
    window.location.hash.length > 1 &&
    !window.location.hash.startsWith("#?") &&
    !route.id;
  return (
    <div className="public-home">
      <a
        className="public-skip"
        href="#public-content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("public-content")?.focus();
        }}
      >
        Pular para o conteúdo
      </a>
      <PublicHeader
        disputeId={route.id}
        section={route.section}
        context={standings.data?.context}
      />
      <main id="public-content" className="public-main" tabIndex={-1}>
        {!route.id && <PublicBreadcrumb page="Consulta pública" />}
        <h1>
          {route.id
            ? route.section === "jogos"
              ? "Jogos publicados"
              : "Classificação"
            : "Competições"}
        </h1>
        {invalid ? (
          <p role="alert">
            Disputa inválida. <a href="/publico.html">Voltar às competições</a>
          </p>
        ) : !route.id ? (
          <>
            {catalog.loading && (
              <p role="status">Carregando competições publicadas…</p>
            )}
            {catalog.error && (
              <div role="alert">
                <p>{catalog.error}</p>
                <button onClick={catalog.retry}>Tentar novamente</button>
              </div>
            )}
            <PublicDiscovery
              games={catalog.games}
              confirmed={catalog.disputes}
              catalogAvailable={!catalog.loading && !catalog.error}
            />
          </>
        ) : (
          <>
            {standings.loading && (
              <p role="status">Carregando classificação e agenda…</p>
            )}
            {standings.error && (
              <div role="alert">
                <p>{standings.error}</p>
                <button onClick={standings.retry}>Tentar novamente</button>
              </div>
            )}
            {standings.data ? (
              route.section === "jogos" ? (
                <PublicSchedule value={standings.data} />
              ) : (
                <PublicStandingsTables key={route.id} value={standings.data} />
              )
            ) : (
              !standings.loading && (
                <>
                  {route.section === "classificacao" ? (
                    standings.error ? null : catalog.loading ? (
                      <p role="status">Carregando disputa…</p>
                    ) : !catalog.error &&
                      !games.length &&
                      !catalog.disputes.length ? (
                      <p role="status">
                        Disputa não encontrada ou sem consulta pública
                        autorizada.{" "}
                        <a href="/publico.html">Voltar às competições</a>
                      </p>
                    ) : (
                      <section className="public-empty">
                        <h2>Classificação ainda não disponível</h2>
                        <p>
                          A classificação desta disputa ainda não foi publicada.
                          Consulte os jogos, equipes e jogadores nas seções
                          acima.
                        </p>
                      </section>
                    )
                  ) : (
                    <>
                      {catalog.loading && (
                        <p role="status">Carregando jogos publicados…</p>
                      )}
                      {catalog.error && (
                        <div role="alert">
                          <p>{catalog.error}</p>
                          <button onClick={catalog.retry}>
                            Tentar novamente
                          </button>
                        </div>
                      )}
                      {!catalog.loading &&
                        !catalog.error &&
                        (games.length ? (
                          <ul className="public-games">
                            {games.map((g) => (
                              <li key={g.id}>
                                <time dateTime={g.game.date ?? undefined}>
                                  {g.game.date
                                    ?.split("-")
                                    .reverse()
                                    .join("/") ?? "Data a definir"}{" "}
                                  · {g.game.time ?? "Horário a definir"}
                                </time>
                                <a
                                  href={publicDetailLink(
                                    `/resultado.html#${g.id}`,
                                    g.disputeId,
                                  )}
                                >
                                  <span>{g.game.home.name}</span>
                                  <strong>
                                    {g.score.home} × {g.score.away}
                                  </strong>
                                  <span>{g.game.away.name}</span>
                                </a>
                                <small>
                                  {g.game.venue ?? "Local a definir"}
                                </small>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p role="status">
                            Disputa não encontrada ou sem consulta pública
                            autorizada.{" "}
                            <a href="/publico.html">Voltar às competições</a>
                          </p>
                        ))}
                    </>
                  )}
                </>
              )
            )}
          </>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<PublicHome />);
