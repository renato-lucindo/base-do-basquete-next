import { useEffect, useRef, useState } from "react";
import { TeamsWorkspace } from "../teams/screen";
import { GamesWorkspace } from "../games/workspace";
import { PdfSourcesWorkspace } from "../boxscore/workspace";
import { RegulationWorkspace } from "../regulation/workspace";
import { CompetitionSetupWorkspace } from "../regulation/setup-workspace";
import { DisputeCatalog } from "./catalog";
import { flexibleCompetitionEnabled } from "./features";
import { api, ApiFailure, isSessionFailure } from "./api";
import { snapshotSchema, type CompetitionSnapshot } from "./contract";
import {
  disputeAdministrationListSchema,
  type DisputeAdministration,
} from "./administration-contract";
import "./screen.css";
import "./compact.css";

type WorkArea = "teams" | "games" | "pdfs" | "regulation";
const areaPaths: Record<WorkArea, string> = {
  teams: "equipes",
  games: "jogos",
  pdfs: "jogos/pdfs",
  regulation: "regulamento",
};

function setRoute(championship: string, dispute: string, area: WorkArea) {
  const next = `${location.pathname}${location.search}#campeonato/${championship}/${dispute}/${areaPaths[area]}`;
  const unchanged =
    next === location.pathname + location.search + location.hash;
  history.replaceState(unchanged ? history.state : null, "", next);
}

export function CompetitionWorkspace({
  enabled,
  guard,
  onSessionLost,
  onCompactChange,
}: {
  enabled: boolean;
  guard: { current: () => boolean };
  onSessionLost: () => void;
  onCompactChange?: (value: boolean) => void;
}) {
  const [competition, setCompetition] = useState<CompetitionSnapshot | null>(
    null,
  );
  const [administration, setAdministration] = useState<DisputeAdministration[]>(
    [],
  );
  const [selected, setSelected] = useState("");
  const [area, setArea] = useState<WorkArea>("games");
  const [opening, setOpening] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState("");
  const teamsGuard = useRef<() => boolean>(() => true);
  const gamesGuard = useRef<() => boolean>(() => true);
  const pdfGuard = useRef<() => boolean>(() => true);
  const regulationGuard = useRef<() => boolean>(() => true);
  const catalogGuard = useRef<() => boolean>(() => true);
  const heading = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const restored = useRef(false);
  const competitionId = competition?.id;
  const compact = enabled && (!competition || area !== "pdfs");
  const contexts =
    competition?.seasons.flatMap((season) =>
      season.disputes.map((dispute) => ({
        ...dispute,
        label: `${season.year} · ${dispute.gender === "feminino" ? "Feminino" : "Masculino"} · ${dispute.category}${dispute.division ? " · " + dispute.division : ""}`,
      })),
    ) ?? [];
  const context = contexts.find((dispute) => dispute.id === selected);

  function mayLeave() {
    return (
      catalogGuard.current() &&
      teamsGuard.current() &&
      gamesGuard.current() &&
      pdfGuard.current() &&
      regulationGuard.current()
    );
  }
  useEffect(() => {
    guard.current = mayLeave;
    return () => {
      guard.current = () => true;
    };
  }, [guard]);
  useEffect(() => {
    if (enabled && competitionId) heading.current?.focus();
  }, [enabled, competitionId]);
  useEffect(() => {
    if (enabled && error) errorRef.current?.focus();
  }, [enabled, error]);
  useEffect(() => {
    onCompactChange?.(compact);
  }, [compact, onCompactChange]);

  useEffect(() => {
    if (!enabled || !competitionId) return;
    const controller = new AbortController();
    const { signal } = controller;
    void api(
      "/api/competition-administration/" + competitionId,
      disputeAdministrationListSchema,
      undefined,
      signal,
    )
      .then((value) => {
        if (!signal.aborted) setAdministration(value);
      })
      .catch((failure) => {
        if (!signal.aborted && isSessionFailure(failure)) onSessionLost();
      });
    return () => controller.abort();
  }, [enabled, competitionId, area, onSessionLost]);

  useEffect(() => {
    if (!enabled || restored.current) return;
    restored.current = true;
    const match =
      /^#campeonato\/([0-9a-f-]{36})(?:\/([0-9a-f-]{36}))?(?:\/(equipes|regulamento|jogos(?:\/pdfs)?))?$/i.exec(
        location.hash,
      );
    if (match) {
      const savedArea = (Object.keys(areaPaths) as WorkArea[]).find(
        (key) => areaPaths[key] === match[3],
      );
      void openCompetition(match[1], match[2], savedArea);
    }
  }, [enabled]);

  async function openCompetition(
    id: string,
    dispute?: string,
    targetArea: WorkArea = "games",
  ) {
    if (opening || !mayLeave()) return;
    setOpening(true);
    setError("");
    try {
      const value = await api("/api/competitions/" + id, snapshotSchema);
      const disputes = value.seasons.flatMap((season) => season.disputes);
      const target = dispute
        ? disputes.find((item) => item.id === dispute)
        : disputes[0];
      if (!target) {
        setError(
          "A disputa selecionada não está mais disponível. Atualize a lista.",
        );
        return;
      }
      const targetId = target.id;
      setAdministration([]);
      setCompetition(value);
      setSelected(targetId);
      setArea(targetArea);
      setRoute(value.id, targetId, targetArea);
    } catch (failure) {
      if (isSessionFailure(failure)) onSessionLost();
      else
        setError(
          failure instanceof ApiFailure
            ? failure.message
            : "Não foi possível abrir o campeonato.",
        );
    } finally {
      setOpening(false);
    }
  }

  function back() {
    if (!mayLeave()) return;
    setCompetition(null);
    setError("");
    history.replaceState(null, "", location.pathname + location.search);
    onSaved();
  }
  function onSaved() {
    setRefresh((value) => value + 1);
  }
  function changeArea(target: WorkArea) {
    if (!competition || target === area) return;
    setArea(target);
    setRoute(competition.id, selected, target);
  }

  return (
    <section
      className={`competition-workspace${compact ? " compact-pilot" : ""}`}
      aria-busy={opening}
    >
      {opening && <p role="status">Abrindo disputa…</p>}
      {error && (
        <p ref={errorRef} tabIndex={-1} role="alert" className="access-error">
          {error}
        </p>
      )}
      <div hidden={!!competition}>
        <DisputeCatalog
          enabled={enabled && !competition}
          refresh={refresh}
          opening={opening}
          open={(id, dispute) => void openCompetition(id, dispute)}
          guard={catalogGuard}
          onSessionLost={onSessionLost}
        />
      </div>
      {competition && context && (
        <>
          <div className="competition-context-header">
            <nav className="competition-tabs" aria-label="Áreas do campeonato">
              <button
                type="button"
                className="secondary"
                aria-current={area === "teams" ? "page" : undefined}
                onClick={() => changeArea("teams")}
              >
                Equipes e elencos
              </button>
              <button
                type="button"
                className="secondary"
                aria-current={area === "games" ? "page" : undefined}
                onClick={() => changeArea("games")}
              >
                Jogos
              </button>
              <button
                type="button"
                className="secondary"
                aria-current={area === "regulation" ? "page" : undefined}
                onClick={() => changeArea("regulation")}
              >
                {flexibleCompetitionEnabled()
                  ? "Formato e classificação"
                  : "Regulamento"}
              </button>
              <a
                className="competition-public-link"
                href={`/estatisticas.html#${context.id}?scope=all`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Estatísticas publicadas
              </a>
              <a
                className="competition-public-link"
                href={`/equipes.html#${context.id}?scope=all`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Equipes publicadas
              </a>
            </nav>
            <div className="competition-context-selection">
              <h2 ref={heading} tabIndex={-1}>
                {competition.name}
              </h2>
              <label className="competition-destination">
                Disputa atual
                <select
                  aria-label="Disputa atual"
                  value={selected}
                  onChange={(event) => {
                    if (!mayLeave()) return;
                    setSelected(event.target.value);
                    setRoute(competition.id, event.target.value, area);
                  }}
                >
                  {contexts.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="secondary competition-back"
                onClick={back}
              >
                Voltar aos campeonatos
              </button>
            </div>
          </div>
          <div hidden={area !== "regulation"}>
            {flexibleCompetitionEnabled() ? (
              <CompetitionSetupWorkspace
                key={context.id}
                disputeId={context.id}
                enabled={enabled && area === "regulation"}
                guard={regulationGuard}
                onSessionLost={onSessionLost}
                onSaved={onSaved}
              />
            ) : (
              <RegulationWorkspace
                key={context.id}
                disputeId={context.id}
                enabled={enabled && area === "regulation"}
                guard={regulationGuard}
                onSessionLost={onSessionLost}
                onSaved={onSaved}
              />
            )}
          </div>
          <div hidden={area !== "teams"}>
            <TeamsWorkspace
              key={context.id}
              disputeId={context.id}
              globalsReadOnly={
                administration.find((value) => value.disputeId === context.id)
                  ?.isTest
              }
              gender={context.gender}
              enabled={enabled && area === "teams"}
              guard={teamsGuard}
              onSessionLost={onSessionLost}
              onSaved={onSaved}
            />
          </div>
          <div hidden={area !== "pdfs"}>
            <PdfSourcesWorkspace
              key={context.id}
              defaultDisputeId={context.id}
              initialContexts={contexts.map((item) => ({
                id: item.id,
                gender: item.gender,
                label: competition.name + " · " + item.label,
              }))}
              enabled={enabled && area === "pdfs"}
              guard={pdfGuard}
              onSessionLost={onSessionLost}
              onSaved={onSaved}
              onBack={() => changeArea("games")}
            />
          </div>
          <div hidden={area !== "games"}>
            <GamesWorkspace
              key={context.id}
              disputeId={context.id}
              contextLabel={competition.name + " · " + context.label}
              gender={context.gender}
              enabled={enabled && area === "games"}
              guard={gamesGuard}
              onSessionLost={onSessionLost}
              onSaved={onSaved}
              onImportPdfs={() => changeArea("pdfs")}
            />
          </div>
        </>
      )}
    </section>
  );
}
