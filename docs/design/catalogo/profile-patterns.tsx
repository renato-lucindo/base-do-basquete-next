import { useId, useRef, useState } from "react";
import { SectionTabs, TabPanel } from "../../../src/ui-system/components";
import { ProfileMatch } from "../../../src/public-ui/profile-match";
import { Legend, ModeButtons } from "../../../src/team-profile/panels";
import "../../../src/public-ui/navigation.css";
import "../../../src/team-profile/screen.css";

/** Approved profile patterns, using the same components as the real consumers. */
export function ProfilePatterns() {
  const [tab, setTab] = useState("resumo");
  const [mode, setMode] = useState<"total" | "per-game">("total");
  const [year, setYear] = useState("2026");
  const [level, setLevel] = useState("");
  const id = useId();
  const panel = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <section
      className="catalog-section"
      id="perfis"
      aria-labelledby="padroes-perfis"
    >
      <h2 id="padroes-perfis">Perfis e contexto de disputa</h2>
      <p>
        Decisões de 24/11/2026. Ano na barra e Participação central são
        específicos do perfil da equipe.
      </p>
      <div className="catalog-profile-example team-profile-page public-site statistics-public">
        <nav
          aria-label="Contexto de exemplo"
          className="public-dispute-breadcrumb"
        >
          <ol>
            {["Copa ES", year, "Masculino"].map((value) => (
              <li key={value}>
                <button
                  type="button"
                  aria-controls={id}
                  aria-expanded={level === value}
                  onClick={(event) => {
                    trigger.current = event.currentTarget;
                    setLevel(value);
                    panel.current?.showPopover();
                  }}
                >
                  {value}
                </button>
              </li>
            ))}
            <li aria-current="page">Sub-15</li>
          </ol>
        </nav>
        <nav
          ref={panel}
          id={id}
          popover="auto"
          aria-label="Seleção de exemplo"
          onToggle={(event) => {
            if (event.newState === "closed") {
              setLevel("");
              trigger.current?.focus();
            }
          }}
        >
          <p>{level}</p>
          <a href="#perfis" onClick={() => panel.current?.hidePopover()}>
            Copa ES · {year} · Masculino · Sub-15
          </a>
        </nav>
        <span className="public-dispute-status" data-status="in_progress">
          Em andamento
        </span>
        <div className="team-profile-tabbar">
          <SectionTabs
            id="catalog-profile-tabs"
            label="Abas do perfil de exemplo"
            items={[
              { key: "resumo", label: "Visão geral" },
              { key: "estatisticas", label: "Estatísticas" },
            ]}
            active={tab}
            onChange={setTab}
          />
          <label>
            <span className="bb-query-label">Ano</span>
            <select
              value={year}
              onChange={(event) => setYear(event.target.value)}
            >
              <option>2026</option>
              <option>2025</option>
            </select>
          </label>
        </div>
        <TabPanel id="catalog-profile-tabs" active={tab}>
          <div className="team-profile-mode-toolbar">
            <label>
              <span className="bb-query-label">Fase</span>
              <select>
                <option>Todas as fases</option>
                <option>Classificatória</option>
              </select>
            </label>
            <ModeButtons value={mode} onChange={setMode} />
          </div>
          <div className="scrollable-table">
            <section
              className="statistics-table-wrap"
              aria-label="Tabela do perfil de exemplo"
              tabIndex={0}
            >
              <table className="statistics-table team-profile-participation-table">
                <thead>
                  <tr>
                    <th>Participação</th>
                    <th className="bb-metric-column">J</th>
                    <th className="bb-metric-column">PTS</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">Copa ES · {year}</th>
                    <td>4</td>
                    <td>{mode === "total" ? "240" : "60"}</td>
                  </tr>
                </tbody>
              </table>
            </section>
          </div>
          <h3>Últimos jogos</h3>
          <table className="profile-games-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Confronto</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>24/11</td>
                <td>
                  <ProfileMatch
                    home={{ name: "Lobos Clube", abbreviation: "LOB" }}
                    away={{ name: "Águias Clube", abbreviation: "AGU" }}
                    score="60 × 50"
                  />
                  <span className="player-game-context">Copa ES · Sub-15</span>
                </td>
              </tr>
            </tbody>
          </table>
          <Legend
            entries={[
              { label: "J", name: "Jogos" },
              { label: "PTS", name: "Pontos marcados" },
              { label: "2P", name: "Cestas de dois" },
              { label: "LL", name: "Lances livres" },
            ]}
          />
        </TabPanel>
      </div>
    </section>
  );
}
