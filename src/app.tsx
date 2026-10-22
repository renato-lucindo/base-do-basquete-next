import { useEffect, useRef, useState } from "react";
import {
  Competitions,
  CompetitionEditor,
  TeamEditor,
  Games,
  Rules,
} from "./competition/screens";
import { PdfWorkspace } from "./import/workspace";
import { ScoresheetWorkspace } from "./scoresheet/workspace";
import { initialState, type Prototype } from "./prototype/model";
import {
  BatchSaveError,
  readSaved,
  saveLocal,
  publishBatch,
} from "./prototype/storage";
import {
  Badge,
  disputeLabel,
  formatTime,
  Heading,
  type ScreenProps,
} from "./ui";

function boot() {
  try {
    return { ...readSaved(localStorage), error: "" };
  } catch (e) {
    return { version: 0, data: initialState(), error: (e as Error).message };
  }
}

export function App() {
  const [initial] = useState(boot);
  const [data, setData] = useState(initial.data);
  const version = useRef(initial.version);
  const [route, setRoute] = useState(location.hash.slice(1) || "/campeonatos");
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState({
    text: initial.error,
    error: !!initial.error,
  });
  const [saving, setSaving] = useState(false);
  const [failNext, setFailNext] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dispute, setDispute] = useState(
    initial.data.competition.disputes[0]?.id ?? "",
  );
  const mainRef = useRef<HTMLElement>(null);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const currentRoute = useRef(route);
  currentRoute.current = route;
  const navigationApproved = useRef(false);
  useEffect(() => {
    const listener = () => {
      const next = location.hash.slice(1) || "/campeonatos";
      const approved = navigationApproved.current;
      navigationApproved.current = false;
      if (
        !approved &&
        dirtyRef.current &&
        !window.confirm(
          "Há alterações não salvas. Sair desta área? O que já foi salvo será mantido.",
        )
      ) {
        history.replaceState(null, "", `#${currentRoute.current}`);
        return;
      }
      setRoute(next);
      setTimeout(() => mainRef.current?.focus(), 0);
    };
    const unload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) e.preventDefault();
    };
    window.addEventListener("hashchange", listener);
    window.addEventListener("beforeunload", unload);
    return () => {
      window.removeEventListener("hashchange", listener);
      window.removeEventListener("beforeunload", unload);
    };
  }, []);
  const go = (next: string) => {
    if (next === route) return true;
    if (
      dirtyRef.current &&
      !window.confirm(
        "Há alterações não salvas. Sair desta área? O que já foi salvo será mantido.",
      )
    )
      return false;
    navigationApproved.current = true;
    location.hash = next;
    return true;
  };
  const notify = (text: string, error = false) => setNotice({ text, error });
  const update = (next: Prototype) => {
    setData(next);
    dirtyRef.current = true;
    setDirty(true);
    setNotice({ text: "", error: false });
  };
  useEffect(() => {
    if (!data.competition.disputes.some((d) => d.id === dispute))
      setDispute(data.competition.disputes[0]?.id ?? "");
  }, [data.competition, dispute]);
  const commit = async (next: Prototype, label?: string) => {
    setSaving(true);
    setNotice({ text: "", error: false });
    await new Promise((r) => setTimeout(r, 220));
    try {
      if (failNext) {
        setFailNext(false);
        throw new Error(
          "Falha ao salvar. Seu trabalho foi mantido nesta tela. Tente novamente.",
        );
      }
      const candidate = structuredClone(next);
      candidate.catalog = candidate.catalog.map((c) =>
        c.id === candidate.competition.id ? candidate.competition : c,
      );
      if (label)
        candidate.recent = [
          {
            label,
            at: new Date().toISOString(),
            route: route === "/nova" ? "/competicao" : route,
          },
          ...candidate.recent.filter((r) => r.label !== label),
        ].slice(0, 8);
      const result = saveLocal(localStorage, version.current, candidate);
      version.current = result.version;
      setData(result.data);
      setDirty(false);
      dirtyRef.current = false;
      setConflict(false);
      notify("Salvo neste navegador.");
      return true;
    } catch (e) {
      const msg = (e as Error).message;
      setConflict(msg.includes("outra aba"));
      notify(msg, true);
      return false;
    } finally {
      setSaving(false);
    }
  };
  const reload = () => {
    if (
      dirty &&
      !window.confirm(
        "Recarregar substitui as alterações não salvas pela versão salva. Continuar?",
      )
    )
      return;
    try {
      const next = readSaved(localStorage);
      version.current = next.version;
      setData(next.data);
      setDirty(false);
      setConflict(false);
      notify("Versão salva recarregada. Revise antes de continuar.");
    } catch (e) {
      notify((e as Error).message, true);
    }
  };
  const props: ScreenProps = {
    data,
    update,
    commit,
    notify,
    go,
    dispute,
    openCompetition: (id) => {
      const competition = data.catalog.find((c) => c.id === id);
      if (!competition) return;
      if (!go("/competicao")) return;
      setData({ ...data, competition });
      setDispute(competition.disputes[0]?.id ?? "");
    },
    openGame: (id) => {
      if (id === data.game.id) {
        go("/sumula");
        return;
      }
      const draft = data.gameDrafts?.find((d) => d.game.id === id);
      if (!draft || !go("/sumula")) return;
      setData({
        ...data,
        game: draft.game,
        sheet: draft.sheet,
        fallback: draft.fallback,
        gameDrafts: [
          ...(data.gameDrafts ?? []).filter((d) => d.game.id !== id),
          { game: data.game, sheet: data.sheet, fallback: data.fallback },
        ],
      });
    },
  };
  const tabs = [
    ["Informações", "/competicao"],
    ["Equipes e elencos", "/equipes"],
    ["Jogos", "/jogos"],
    ["Regulamento", "/regulamento"],
  ];
  const task = route === "/importar" || route === "/sumula";
  const context = !["/campeonatos", "/nova", "/publico"].includes(route);
  const screen = () => {
    switch (route) {
      case "/campeonatos":
        return <Competitions {...props} />;
      case "/nova":
      case "/competicao":
        return <CompetitionEditor {...props} isNew={route === "/nova"} />;
      case "/equipes":
        return <TeamEditor {...props} />;
      case "/jogos":
        return <Games {...props} />;
      case "/regulamento":
        return <Rules />;
      case "/importar":
        return (
          <PdfWorkspace
            {...props}
            publish={async (next) => {
              setSaving(true);
              await new Promise((r) => setTimeout(r, 220));
              try {
                if (failNext) {
                  setFailNext(false);
                  throw new Error(
                    "Falha ao salvar o lote. Nenhum jogo foi publicado nesta tentativa.",
                  );
                }
                const result = publishBatch(
                  localStorage,
                  version.current,
                  next,
                );
                version.current = result.version;
                setData(result.data);
                setDirty(false);
                notify(
                  `${result.data.batch.filter((i) => i.status === "published").length} jogos publicados na simulação. Pendências continuam abertas.`,
                );
              } catch (e) {
                // Recupera somente o resultado que esta operação efetivamente gravou.
                // Uma versão concorrente jamais é reciclada para a cópia antiga.
                if (e instanceof BatchSaveError) {
                  version.current = e.saved.version;
                  setData(e.saved.data);
                }
                const message = (e as Error).message;
                setConflict(message.includes("outra aba"));
                notify(message, true);
              } finally {
                setSaving(false);
              }
            }}
          />
        );
      case "/sumula":
        return <ScoresheetWorkspace key={data.game.id} {...props} />;
      case "/publico":
        return (
          <section>
            <Heading
              eyebrow="Consulta demonstrativa"
              title="Resultados publicados"
            />
            <p>
              Apenas jogos confirmados nesta simulação. Dados fictícios; nenhuma
              publicação na internet.
            </p>
            {data.publications.length === 0 ? (
              <div className="empty">
                Nenhum jogo publicado. Confirme um jogo na importação ou súmula.
              </div>
            ) : (
              <div className="publication-list">
                {data.publications
                  .filter(
                    (p) =>
                      p.version ===
                      Math.max(
                        ...data.publications
                          .filter((x) => x.id === p.id)
                          .map((x) => x.version),
                      ),
                  )
                  .map((p) => (
                    <article key={`${p.id}-${p.version}`}>
                      <small>
                        {disputeLabel(data, p.dispute)} · versão {p.version} ·{" "}
                        {formatTime(p.createdAt)}
                      </small>
                      <h2>
                        {p.home}{" "}
                        <span className="public-score">
                          {p.score[0]} × {p.score[1]}
                        </span>{" "}
                        {p.away}
                      </h2>
                      <Badge tone="success">Publicado na simulação</Badge>
                      <p>
                        {p.source === "sheet"
                          ? "Fonte: súmula · Pontos e faltas; tentativas e minutos indisponíveis."
                          : "Fonte: boxscore · Extração e valores ilustrativos."}
                      </p>
                      {p.reason && <p>Revisão: {p.reason}</p>}
                      <button onClick={() => go("/jogos")}>
                        Voltar aos jogos
                      </button>
                    </article>
                  ))}
              </div>
            )}
          </section>
        );
      default:
        return (
          <section>
            <Heading title="Página não encontrada" />
            <button onClick={() => go("/campeonatos")}>
              Voltar aos campeonatos
            </button>
          </section>
        );
    }
  };
  return (
    <>
      <a
        className="skip"
        href="#main"
        onClick={(event) => {
          event.preventDefault();
          mainRef.current?.focus();
        }}
      >
        Pular para o conteúdo
      </a>
      <div className="prototype-banner">
        <strong>Protótipo para avaliação</strong>
        <span>Dados fictícios · salvo apenas neste navegador</span>
      </div>
      <header className="site-header">
        <button
          className="brand"
          onClick={() => go("/campeonatos")}
          aria-label="Base do Basquete, início"
        >
          <span className="brand-mark" aria-hidden="true">
            b.
          </span>
          Base do Basquete
        </button>
        <nav aria-label="Principal">
          <button
            className={route === "/campeonatos" ? "nav-active" : ""}
            onClick={() => go("/campeonatos")}
          >
            Campeonatos
          </button>
          <button onClick={() => go("/publico")}>
            Consulta pública <span aria-hidden="true">↗</span>
          </button>
        </nav>
        <span className="admin-label">Administração · avaliação</span>
      </header>
      <div className="shell">
        <div className="breadcrumb">
          <button onClick={() => go("/campeonatos")}>Campeonatos</button>
          {context && (
            <>
              <span aria-hidden="true">/</span>
              <button onClick={() => go("/competicao")}>
                {data.competition.name || "Novo campeonato"} ·{" "}
                {data.competition.year}
              </button>
            </>
          )}
        </div>
        {context && (
          <div className="context-bar">
            <div>
              <strong>{data.competition.name || "Novo campeonato"}</strong>
              <span>
                {data.competition.year} <span aria-hidden="true">/</span>{" "}
                {disputeLabel(data, dispute)}
              </span>
            </div>
            <div className="dispute-picker">
              <label htmlFor="active-dispute">Disputa em edição</label>
              <select
                id="active-dispute"
                value={dispute}
                onChange={(e) => setDispute(e.target.value)}
              >
                {data.competition.disputes.map((d) => (
                  <option key={d.id} value={d.id}>
                    {disputeLabel(data, d.id)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
        {context && !task && (
          <nav className="tabs" aria-label="Competição">
            {tabs.map(([label, path]) => (
              <a
                key={path}
                href={`#${path}`}
                aria-current={route === path ? "page" : undefined}
              >
                {label}
              </a>
            ))}
          </nav>
        )}
        <div className="save-bar">
          <span role="status" aria-live="polite">
            <span
              className={`status-dot ${dirty ? "unsaved" : ""}`}
              aria-hidden="true"
            />
            {saving
              ? "Salvando…"
              : dirty
                ? "Alterações não salvas"
                : "Rascunho local disponível"}
          </span>
          {context && (
            <button
              className="text-button"
              disabled={saving}
              onClick={() => void commit(data, "Rascunho salvo")}
            >
              Salvar rascunho
            </button>
          )}
        </div>
        {notice.text && (
          <div
            className={`notice ${notice.error ? "error" : "success"}`}
            role={notice.error ? "alert" : "status"}
          >
            {notice.text}
            {conflict && (
              <button onClick={reload}>Recarregar versão salva</button>
            )}
          </div>
        )}
        <main
          id="main"
          tabIndex={-1}
          ref={mainRef}
          aria-busy={saving || loading}
        >
          {loading ? (
            <div className="empty" role="status">
              Carregando o trabalho salvo…
            </div>
          ) : (
            <fieldset className="screen-fieldset" disabled={saving}>
              {screen()}
            </fieldset>
          )}
        </main>
        <details className="evaluation">
          <summary>Cenários de avaliação</summary>
          <p>
            Controles exclusivos do protótipo para demonstrar recuperação e
            falhas.
          </p>
          <div className="actions">
            <label className="check">
              <input
                type="checkbox"
                checked={failNext}
                onChange={(e) => setFailNext(e.target.checked)}
              />
              Falhar na próxima gravação
            </label>
            <button
              onClick={() => {
                try {
                  const saved = readSaved(localStorage);
                  saveLocal(localStorage, saved.version, saved.data);
                  notify(
                    "Outra aba salvou uma alteração simulada. A próxima gravação exigirá recarga explícita.",
                  );
                } catch (e) {
                  notify((e as Error).message, true);
                }
              }}
            >
              Simular alteração em outra aba
            </button>
            <button
              onClick={() => {
                setLoading(true);
                setTimeout(() => setLoading(false), 1300);
              }}
            >
              Demonstrar carregamento
            </button>
            <button onClick={reload}>Recarregar rascunho salvo</button>
          </div>
        </details>
        <footer>
          <span>Base do Basquete</span>
          <span>Primeiro marco · experiência em avaliação</span>
        </footer>
      </div>
    </>
  );
}
