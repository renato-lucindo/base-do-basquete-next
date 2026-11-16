import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { AdminDialog } from "../../../src/competition/admin-dialog";
import {
  DataTable,
  Icon,
  Pager,
  SectionTabs,
  TabPanel,
  type Column,
} from "../../../src/ui-system/components";
import {
  nextSort,
  normalizeSearch,
  sortRows,
  type Sort,
} from "../../../src/ui-system/controls";
import { Badge, Field } from "../../../src/ui";
import "../../../src/ui-system/readability.css";
import "../../../src/styles.css";
import "../../../src/ui-system/theme.css";
import "./catalogo.css";

const palette = [
  ["--bb-blue", "Ação e foco"],
  ["--bb-blue-hover", "Ação em hover"],
  ["--bb-blue-soft", "Seleção suave"],
  ["--bb-text", "Texto principal"],
  ["--bb-muted", "Texto secundário"],
  ["--bb-line", "Divisor"],
  ["--bb-control-line", "Contorno de campo"],
  ["--bb-background", "Fundo"],
  ["--bb-surface", "Superfície"],
  ["--bb-success", "Sucesso"],
  ["--bb-danger", "Erro"],
] as const;

function Foundations() {
  const [values, setValues] = useState<string[]>([]);
  useEffect(() => {
    const tokens = getComputedStyle(document.documentElement);
    setValues(palette.map(([key]) => tokens.getPropertyValue(key).trim()));
  }, []);
  return (
    <section className="catalog-section" aria-labelledby="fundamentos">
      <h2 id="fundamentos">Fundamentos</h2>
      <div className="catalog-foundations">
        <div className="catalog-card">
          <h3>Cores</h3>
          <dl className="catalog-palette">
            {palette.map(([key, name], index) => (
              <div key={key}>
                <span
                  className="catalog-swatch"
                  style={{ background: `var(${key})` }}
                  aria-hidden="true"
                />
                <dt>{name}</dt>
                <dd translate="no">
                  <code>{key}</code> <span>{values[index]}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="catalog-card">
          <h3>Tipografia</h3>
          <div className="bb-ui catalog-type">
            <div>
              <span className="catalog-type-title">Classificação</span>
              <small>Título</small>
            </div>
            <div>
              <span className="catalog-type-section">Últimos jogos</span>
              <small>Seção</small>
            </div>
            <div>
              <span className="catalog-type-body">
                Associação Atlética da Serra
              </span>
              <small>Texto</small>
            </div>
            <div>
              <span className="catalog-type-detail">
                12 vitórias em 15 jogos
              </span>
              <small>Detalhe</small>
            </div>
          </div>
          <p className="catalog-note">
            Inter com fallback de sistema. A escala da aplicação aumenta a
            partir de 640 px.
          </p>
        </div>
      </div>
    </section>
  );
}

const teams = [
  { name: "Associação Atlética da Serra", games: 15, wins: 12 },
  { name: "Clube Náutico da Enseada", games: 15, wins: 10 },
  { name: "Estrela do Vale", games: 14, wins: 9 },
  { name: "Basquete Vila do Sol", games: 13, wins: 6 },
];
type Team = (typeof teams)[number];
const columns: Column<Team>[] = [
  {
    key: "name",
    label: "Equipe",
    sortable: true,
    primary: true,
    render: (row) => row.name,
  },
  {
    key: "games",
    label: "Jogos",
    sortable: true,
    numeric: true,
    render: (row) => row.games,
  },
  {
    key: "wins",
    label: "Vitórias",
    sortable: true,
    numeric: true,
    render: (row) => row.wins,
  },
];
const sections = [
  { key: "classificacao", label: "Classificação" },
  { key: "jogos", label: "Jogos" },
];
const date = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeZone: "America/Sao_Paulo",
});

function PublicExample() {
  const [tab, setTab] = useState("classificacao");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<Sort>({ key: "wins", direction: "desc" });
  const filtered = teams.filter((team) =>
    normalizeSearch(team.name).includes(normalizeSearch(query)),
  );
  const sorted = sortRows(
    filtered,
    sort,
    (team, key) => team[key as keyof Team],
    (team) => team.name,
  );
  const size = 3;
  return (
    <section className="catalog-section" aria-labelledby="publico">
      <h2 id="publico">Interface pública</h2>
      <div className="catalog-card">
        <h3>Liga do Litoral · Sub-17</h3>
        <div className="bb-ui catalog-public">
          <SectionTabs
            id="liga"
            label="Consultar disputa"
            items={sections}
            active={tab}
            onChange={setTab}
          />
          <div hidden={tab !== "classificacao"}>
            <TabPanel id="liga" active="classificacao">
              <div className="catalog-search">
                <label htmlFor="busca-equipes">Buscar equipe</label>
                <input
                  type="search"
                  id="busca-equipes"
                  name="equipe"
                  autoComplete="off"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.currentTarget.value);
                    setPage(1);
                  }}
                />
              </div>
              <DataTable
                label="Classificação da Liga do Litoral"
                columns={columns}
                rows={sorted.slice((page - 1) * size, page * size)}
                rowId={(team) => team.name}
                sort={sort}
                onSort={(key) => {
                  setSort(nextSort(sort, key));
                  setPage(1);
                }}
                empty="Nenhuma equipe encontrada. Tente outro nome."
              />
              <Pager
                page={page}
                total={sorted.length}
                size={size}
                onChange={setPage}
              />
            </TabPanel>
          </div>
          <div hidden={tab !== "jogos"}>
            <TabPanel id="liga" active="jogos">
              <dl className="catalog-match">
                <div>
                  <dt>Data</dt>
                  <dd>
                    <time dateTime="2026-11-15">
                      {date.format(new Date("2026-11-15T18:00:00-03:00"))}
                    </time>
                  </dd>
                </div>
                <div>
                  <dt>Confronto</dt>
                  <dd>Estrela do Vale × Basquete Vila do Sol</dd>
                </div>
                <div>
                  <dt>Placar final</dt>
                  <dd>78–64</dd>
                </div>
              </dl>
            </TabPanel>
          </div>
        </div>
      </div>
    </section>
  );
}

function AdminExample() {
  const [name, setName] = useState("Ginásio do Litoral");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState("");
  const input = useRef<HTMLInputElement>(null);

  return (
    <section className="catalog-section" aria-labelledby="administracao">
      <h2 id="administracao">Administração</h2>
      <div className="catalog-card catalog-admin">
        <div className="catalog-admin-summary">
          <div>
            <h3>Local de jogo</h3>
            <p>{name}</p>
          </div>
          <Badge tone="success">Ativo</Badge>
        </div>
        <button
          type="button"
          className="primary"
          onClick={() => {
            setError(false);
            setOpen(true);
          }}
        >
          Editar local
        </button>
        <div className="catalog-save" role="status">
          {saved}
        </div>
        <AdminDialog
          title="Editar local de jogo"
          open={open}
          busy={false}
          onClose={() => setOpen(false)}
          initialFocus={input}
          footer={
            <>
              <button type="button" onClick={() => setOpen(false)}>
                Cancelar
              </button>
              <button type="submit" form="editar-local" className="primary">
                Salvar local
              </button>
            </>
          }
        >
          {open && (
            <form
              id="editar-local"
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                const value = input.current?.value.trim();
                if (!value) {
                  setError(true);
                  input.current?.focus();
                  return;
                }
                setName(value);
                setSaved(`Local salvo como ${value}.`);
                setOpen(false);
              }}
            >
              <Field label="Nome do local" id="nome-local">
                <input
                  ref={input}
                  id="nome-local"
                  name="nome"
                  defaultValue={name}
                  autoComplete="off"
                  required
                  maxLength={120}
                  aria-invalid={error || undefined}
                  aria-describedby={error ? "erro-nome-local" : undefined}
                  onChange={(event) => {
                    if (error && event.currentTarget.value.trim())
                      setError(false);
                  }}
                />
                <div aria-live="polite">
                  {error && (
                    <p id="erro-nome-local" className="catalog-error">
                      Informe o nome do local.
                    </p>
                  )}
                </div>
              </Field>
            </form>
          )}
        </AdminDialog>
      </div>
    </section>
  );
}

function Catalog() {
  return (
    <>
      <a className="skip" href="#conteudo">
        Ir para o conteúdo
      </a>
      <header className="catalog-header">
        <div className="catalog-width catalog-header-content">
          <span className="catalog-brand" translate="no">
            <Icon name="trophy" /> Base do Basquete
          </span>
          <nav aria-label="Seções do catálogo">
            <a href="#fundamentos">Fundamentos</a>
            <a href="#publico">Público</a>
            <a href="#administracao">Administração</a>
          </nav>
        </div>
      </header>
      <main id="conteudo" className="catalog-width" tabIndex={-1}>
        <div className="catalog-title">
          <h1>Design system</h1>
          <p>
            Fundamentos e componentes da Base do Basquete. Explore os exemplos
            com dados fictícios.
          </p>
        </div>
        <Foundations />
        <PublicExample />
        <AdminExample />
      </main>
    </>
  );
}

createRoot(document.getElementById("root")!).render(<Catalog />);
