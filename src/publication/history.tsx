import { useEffect, useRef, useState } from "react";
import { api, isSessionFailure } from "../competition/api";
import {
  publicationStateSchema,
  publicationVersionSchema,
  type PublicationState,
  type PublicationVersion,
} from "./data-contract";
import { PublicGameView } from "./public-page";
import "./public-view.css";
type Props = { gameId: string; enabled: boolean; onSessionLost: () => void };
const sourceName = (s: string) =>
  s === "sheet" ? "Súmula manual" : s === "pdf" ? "PDF" : "Não publicar";
export function PublicationHistory(p: Props) {
  const [opened, setOpened] = useState(false),
    [offset, setOffset] = useState(0),
    [list, setList] = useState<PublicationState | null>(null),
    [selected, setSelected] = useState<number | null>(null),
    [version, setVersion] = useState<PublicationVersion | null>(null),
    [listBusy, setListBusy] = useState(false),
    [versionBusy, setVersionBusy] = useState(false),
    [listError, setListError] = useState(""),
    [versionError, setVersionError] = useState(""),
    [retry, setRetry] = useState(0);
  const trigger = useRef<HTMLButtonElement>(null),
    heading = useRef<HTMLHeadingElement>(null),
    detailHeading = useRef<HTMLHeadingElement>(null),
    alert = useRef<HTMLParagraphElement>(null);
  const error = listError || versionError;
  function report(e: unknown, set: (v: string) => void) {
    if (isSessionFailure(e)) p.onSessionLost();
    set(
      e instanceof Error
        ? e.message
        : "Não foi possível consultar o histórico.",
    );
  }
  useEffect(() => {
    if (!opened || !p.enabled) return;
    let active = true;
    const c = new AbortController();
    setListBusy(true);
    setListError("");
    setList(null);
    void api(
      `/api/games/${p.gameId}/publication?offset=${offset}`,
      publicationStateSchema,
      undefined,
      c.signal,
    )
      .then((r) => {
        if (!active) return;
        if (
          r.gameId !== p.gameId ||
          (r.published && r.published.id !== p.gameId)
        )
          throw Error("O histórico não corresponde a este jogo.");
        setList(r);
      })
      .catch((e) => {
        if (active) report(e, setListError);
      })
      .finally(() => {
        if (active) setListBusy(false);
      });
    return () => {
      active = false;
      c.abort();
    };
  }, [opened, p.enabled, p.gameId, offset, retry]);
  useEffect(() => {
    setVersion(null);
    setVersionBusy(false);
    setVersionError("");
    if (!opened || !p.enabled || selected === null) return;
    let active = true;
    const c = new AbortController();
    setVersionBusy(true);
    setVersionError("");
    void api(
      `/api/games/${p.gameId}/publication/versions/${selected}`,
      publicationVersionSchema,
      undefined,
      c.signal,
    )
      .then((r) => {
        if (!active) return;
        if (r.gameId !== p.gameId || r.version !== selected)
          throw Error("A versão consultada não corresponde a este jogo.");
        setVersion(r);
      })
      .catch((e) => {
        if (active) report(e, setVersionError);
      })
      .finally(() => {
        if (active) setVersionBusy(false);
      });
    return () => {
      active = false;
      c.abort();
    };
  }, [opened, p.enabled, p.gameId, selected, retry]);
  useEffect(() => {
    if (opened) heading.current?.focus();
  }, [opened]);
  useEffect(() => {
    if (version) detailHeading.current?.focus();
  }, [!!version]);
  useEffect(() => {
    if (error) alert.current?.focus();
  }, [error]);
  return (
    <div className="publication-history">
      <button
        ref={trigger}
        disabled={!p.enabled}
        onClick={() => setOpened(true)}
      >
        Ver histórico deste jogo
      </button>
      {opened && (
        <section
          aria-label="Histórico administrativo de publicação"
          aria-busy={listBusy || versionBusy}
        >
          <h4 ref={heading} tabIndex={-1}>
            Histórico de publicação
          </h4>
          <p>
            Consulta somente de leitura. A versão escolhida não substitui a
            fonte em edição nem o resultado atual.
          </p>
          <button
            onClick={() => {
              setOpened(false);
              setSelected(null);
              setVersion(null);
              trigger.current?.focus();
            }}
          >
            Fechar histórico
          </button>
          {error && (
            <p role="alert" ref={alert} tabIndex={-1}>
              {error}
            </p>
          )}
          {error && (
            <button
              disabled={!p.enabled || listBusy || versionBusy}
              onClick={() => setRetry((v) => v + 1)}
            >
              Tentar consultar histórico novamente
            </button>
          )}
          {listBusy && <p role="status">Carregando versões…</p>}
          {list && (
            <>
              <p>Versão pública atual: {list.version || "nenhuma"}.</p>
              <ol className="publication-versions">
                {list.history.map((v) => (
                  <li key={v.version}>
                    <p>
                      <strong>Versão {v.version}</strong> ·{" "}
                      {sourceName(v.sourceKind)} ·{" "}
                      {new Date(v.publishedAt).toLocaleString("pt-BR", {
                        timeZone: "America/Sao_Paulo",
                      })}{" "}
                      (Brasília)
                    </p>
                    <p>{v.reason || "Primeira publicação"}</p>
                    <button
                      disabled={!p.enabled}
                      onClick={() => setSelected(v.version)}
                    >
                      Ver versão {v.version}
                    </button>
                  </li>
                ))}
              </ol>
              {list.history.length === 0 && (
                <p>Este jogo ainda não possui versões publicadas.</p>
              )}
            </>
          )}
          <div className="competition-actions">
            <button
              disabled={!p.enabled || listBusy || offset === 0}
              onClick={() => setOffset((v) => Math.max(0, v - 20))}
            >
              Versões mais recentes
            </button>
            <button
              disabled={!p.enabled || listBusy || !list?.hasMore}
              onClick={() => setOffset((v) => v + 20)}
            >
              Versões anteriores
            </button>
          </div>
          {versionBusy && <p role="status">Carregando versão selecionada…</p>}
          {version && (
            <section aria-label={`Conteúdo da versão ${version.version}`}>
              <h4 ref={detailHeading} tabIndex={-1}>
                Versão publicada {version.version}
              </h4>
              <p>{version.reason || "Primeira publicação"}</p>
              {"authority" in version.document && (
                <details>
                  <summary>Decisões de fonte desta versão</summary>
                  <ul>
                    {Object.entries(version.document.authority).map(
                      ([key, value]) => (
                        <li key={key}>
                          {
                            (
                              {
                                scorePoints: "Placar e pontos",
                                periodScores: "Períodos",
                                playerAdvanced: "Avançados dos atletas",
                                foulsReceived: "Faltas recebidas",
                                teamAdvanced: "Indicadores coletivos",
                                gameAdvanced: "Indicadores gerais",
                              } as Record<string, string>
                            )[key]
                          }
                          : {sourceName(value)}
                        </li>
                      ),
                    )}
                  </ul>
                </details>
              )}
              <PublicGameView result={version.snapshot} />
            </section>
          )}
        </section>
      )}
    </div>
  );
}
