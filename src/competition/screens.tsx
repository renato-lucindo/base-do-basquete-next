import { useState } from "react";
import {
  Badge,
  Empty,
  Field,
  Heading,
  disputeLabel,
  formatTime,
  type ScreenProps,
} from "../ui";
import { parseTeams, validateRows, type TextRow } from "./text";
import type { Competition, Registration } from "../prototype/model";
import { useViewState } from "../prototype/view-state";

export function Competitions({ data, go, openCompetition }: ScreenProps) {
  const [search, setSearch] = useViewState("competition-search", "");
  const catalog = data.catalog.filter((c) =>
    `${c.name} ${c.year} ${c.disputes.map((d) => `${d.sex} ${d.category} ${d.division}`).join(" ")}`
      .toLocaleLowerCase("pt-BR")
      .includes(search.toLocaleLowerCase("pt-BR")),
  );
  return (
    <section>
      <Heading eyebrow="Administração" title="Campeonatos">
        <button className="primary" onClick={() => go("/nova")}>
          + Novo campeonato
        </button>
      </Heading>
      <p className="lead">
        Organize a base, registre jogos e retome de onde parou.
      </p>
      <section className="recent">
        <div className="section-title">
          <h2>Recentes</h2>
          <small>Últimos trabalhos salvos</small>
        </div>
        {data.recent.length ? (
          <ul className="recent-list">
            {data.recent.map((r) => (
              <li key={r.label}>
                <button onClick={() => go(r.route)}>
                  {r.label}
                  <span aria-hidden="true">↗</span>
                </button>
                <small>{formatTime(r.at)}</small>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">
            Nenhum trabalho salvo ainda. Abrir uma página não altera esta lista.
          </p>
        )}
      </section>
      <div className="section-title">
        <h2>Campeonatos e edições</h2>
        <Badge>
          {catalog.length} edição{catalog.length !== 1 ? "s" : ""}
        </Badge>
      </div>
      <div className="toolbar">
        <Field
          id="search-competitions"
          label="Buscar campeonato, ano ou categoria"
        >
          <input
            id="search-competitions"
            type="search"
            value={search}
            placeholder="Ex.: Metropolitana, 2026, Adulto…"
            onChange={(e) => setSearch(e.target.value)}
          />
        </Field>
      </div>
      {catalog.length ? (
        <div
          className="table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Campeonatos"
        >
          <table>
            <caption className="sr-only">
              Campeonatos e edições fictícios
            </caption>
            <thead>
              <tr>
                <th scope="col">Campeonato</th>
                <th scope="col">Temporada</th>
                <th scope="col">Disputas</th>
                <th scope="col">Situação</th>
                <th scope="col">
                  <span className="sr-only">Ação</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {catalog.map((c) => (
                <tr key={c.id}>
                  <th scope="row">
                    <button
                      className="table-link"
                      onClick={() => openCompetition(c.id)}
                    >
                      {c.name}
                    </button>
                  </th>
                  <td>{c.year}</td>
                  <td>
                    {c.disputes.map((d) => (
                      <div key={d.id}>
                        {d.sex} · {d.category}
                        {d.division ? ` · ${d.division}` : ""}
                      </div>
                    ))}
                  </td>
                  <td>
                    <Badge>Em organização</Badge>
                  </td>
                  <td>
                    <button onClick={() => openCompetition(c.id)}>
                      Abrir <span aria-hidden="true">→</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="Nenhum campeonato encontrado">
          Tente outro nome, ano ou categoria.
        </Empty>
      )}
      <div className="note">
        <strong>Explore os três percursos</strong>
        <p>
          Monte uma edição e seus elencos. Depois, em Jogos, revise um lote de
          PDFs ou preencha uma súmula. Use a Copa Metropolitana para
          experimentar os exemplos.
        </p>
      </div>
    </section>
  );
}

export function CompetitionEditor({
  data,
  update,
  commit,
  notify,
  go,
  isNew,
}: ScreenProps & { isNew: boolean }) {
  const [emptyDraft] = useState<Competition>(() => ({
    id: crypto.randomUUID(),
    name: "",
    year: "2026",
    city: "",
    disputes: [
      {
        id: crypto.randomUUID(),
        sex: "Feminino",
        category: "Adulto",
        division: "",
      },
    ],
  }));
  const draft = isNew
    ? (data.competitionDraft ?? emptyDraft)
    : data.competition;
  const [errors, setErrors] = useState(false);
  const edit = (next: Competition) =>
    update(
      isNew
        ? { ...data, competitionDraft: next }
        : { ...data, competition: next },
    );
  const save = async () => {
    if (
      !draft.name.trim() ||
      !/^\d{4}$/.test(draft.year) ||
      draft.disputes.some((d) => !d.category.trim()) ||
      new Set(
        draft.disputes.map(
          (d) =>
            `${d.sex}|${d.category.trim().toLowerCase()}|${d.division.trim().toLowerCase()}`,
        ),
      ).size !== draft.disputes.length
    ) {
      setErrors(true);
      notify("Revise os campos indicados e evite disputas repetidas.", true);
      return;
    }
    const next = {
      ...data,
      competition: draft,
      competitionDraft: undefined,
      catalog: [...data.catalog.filter((c) => c.id !== draft.id), draft],
    };
    if (await commit(next, `${draft.name} · ${draft.year}`)) go("/equipes");
  };
  return (
    <section>
      <Heading
        eyebrow={isNew ? "Nova edição" : "Contexto da competição"}
        title={isNew ? "Novo campeonato" : "Informações do campeonato"}
      />
      <p className="lead">
        Identificação, temporada e disputas em uma página. Complete os campos
        opcionais depois.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        noValidate
      >
        <section className="form-section">
          <h2>Identificação</h2>
          <div className="form-grid">
            <Field id="competition-name" label="Nome do campeonato *">
              <input
                id="competition-name"
                value={draft.name}
                placeholder="Ex.: Copa Metropolitana"
                required
                aria-invalid={errors && !draft.name.trim()}
                aria-describedby={
                  errors && !draft.name.trim() ? "name-error" : undefined
                }
                onChange={(e) => edit({ ...draft, name: e.target.value })}
              />
              {errors && !draft.name.trim() && (
                <small id="name-error" className="error-text">
                  Informe o nome.
                </small>
              )}
            </Field>
            <Field id="competition-year" label="Temporada / ano *">
              <input
                id="competition-year"
                inputMode="numeric"
                value={draft.year}
                maxLength={4}
                aria-invalid={errors && !/^\d{4}$/.test(draft.year)}
                onChange={(e) => edit({ ...draft, year: e.target.value })}
              />
            </Field>
            <Field id="competition-city" label="Cidade / sede (opcional)">
              <input
                id="competition-city"
                value={draft.city}
                onChange={(e) => edit({ ...draft, city: e.target.value })}
              />
            </Field>
          </div>
        </section>
        <section className="form-section">
          <div className="section-title">
            <h2>Disputas</h2>
            <span className="muted">
              Cada recorte mantém seus jogos e elencos
            </span>
          </div>
          {draft.disputes.map((d, i) => (
            <div className="dispute-row" key={d.id}>
              <span className="row-number">
                {String(i + 1).padStart(2, "0")}
              </span>
              <Field label="Naipe *" id={`sex-${d.id}`}>
                <select
                  id={`sex-${d.id}`}
                  value={d.sex}
                  onChange={(e) =>
                    edit({
                      ...draft,
                      disputes: draft.disputes.map((x) =>
                        x.id === d.id
                          ? {
                              ...x,
                              sex: e.target.value as "Feminino" | "Masculino",
                            }
                          : x,
                      ),
                    })
                  }
                >
                  <option>Feminino</option>
                  <option>Masculino</option>
                </select>
              </Field>
              <Field label="Categoria *" id={`category-${d.id}`}>
                <input
                  id={`category-${d.id}`}
                  value={d.category}
                  aria-invalid={errors && !d.category.trim()}
                  onChange={(e) =>
                    edit({
                      ...draft,
                      disputes: draft.disputes.map((x) =>
                        x.id === d.id ? { ...x, category: e.target.value } : x,
                      ),
                    })
                  }
                />
              </Field>
              <Field label="Divisão (opcional)" id={`division-${d.id}`}>
                <input
                  id={`division-${d.id}`}
                  value={d.division}
                  placeholder="Ex.: Série A"
                  onChange={(e) =>
                    edit({
                      ...draft,
                      disputes: draft.disputes.map((x) =>
                        x.id === d.id ? { ...x, division: e.target.value } : x,
                      ),
                    })
                  }
                />
              </Field>
              {draft.disputes.length > 1 && (
                <button
                  type="button"
                  aria-label={`Remover disputa ${i + 1}`}
                  onClick={() =>
                    edit({
                      ...draft,
                      disputes: draft.disputes.filter((x) => x.id !== d.id),
                    })
                  }
                >
                  Remover
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            className="text-button"
            onClick={() =>
              edit({
                ...draft,
                disputes: [
                  ...draft.disputes,
                  {
                    id: crypto.randomUUID(),
                    sex: "Feminino",
                    category: "",
                    division: "",
                  },
                ],
              })
            }
          >
            + Adicionar categoria ou divisão
          </button>
        </section>
        <div className="form-section">
          <h2>Próximos passos</h2>
          <p>
            Equipes, jogos e regulamento ficam em abas independentes. Você pode
            cadastrar um jogo diretamente, sem gerar uma tabela ou chave.
          </p>
        </div>
        <div className="actions footer-actions">
          <button type="submit" className="primary">
            Salvar e abrir equipes
          </button>
          <button type="button" onClick={() => go("/campeonatos")}>
            Cancelar
          </button>
          <span className="muted">* Campos obrigatórios</span>
        </div>
      </form>
    </section>
  );
}

export function TeamEditor({
  data,
  update,
  commit,
  notify,
  dispute,
}: ScreenProps) {
  const [importOpen, setImportOpen] = useState(
    data.preview.length > 0 || !!data.text,
  );
  const [search, setSearch] = useViewState(`team-search-${dispute}`, "");
  const [newTeam, setNewTeam] = useState("");
  const [adding, setAdding] = useState(false);
  const [player, setPlayer] = useState({
    registration: "",
    name: "",
    jersey: "",
    identity: false,
  });
  const rows = validateRows(data.preview).map((r) =>
    !r.error &&
    r.name &&
    data.registrations.some(
      (reg) =>
        reg.dispute === dispute &&
        reg.name === r.team.trim() &&
        reg.players.some((p) => p.jersey === r.jersey),
    )
      ? { ...r, error: "Camisa já usada no elenco. Altere a camisa." }
      : r,
  );
  const registrations = data.registrations.filter(
    (r) =>
      r.dispute === dispute &&
      r.name.toLowerCase().includes(search.toLowerCase()),
  );
  const editRow = (id: string, patch: Partial<TextRow>) =>
    update({
      ...data,
      preview: data.preview.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    });
  const confirm = async () => {
    const valid = rows.filter((r) => !r.error);
    if (!valid.length) {
      notify("Não há itens prontos. Revise as pendências abaixo.", true);
      return;
    }
    const registrations = structuredClone(data.registrations);
    let nextId =
      Math.max(
        10,
        ...registrations.flatMap((r) => r.players.map((p) => p.id)),
      ) + 1;
    const retained: TextRow[] = [];
    for (const row of rows) {
      if (row.error) {
        retained.push(row);
        continue;
      }
      let registration = registrations.find(
        (r) => r.dispute === dispute && r.name === row.team.trim(),
      );
      if (!registration) {
        registration = {
          id: crypto.randomUUID(),
          dispute,
          globalTeam: row.team.trim(),
          name: row.team.trim(),
          players: [],
        };
        registrations.push(registration);
      }
      if (row.name) {
        if (registration.players.some((p) => p.jersey === row.jersey)) {
          retained.push({
            ...row,
            error: "Camisa já usada no elenco. Altere a camisa.",
          });
          continue;
        }
        registration.players.push({
          id: nextId++,
          name: row.name.trim(),
          jersey: row.jersey,
        });
      }
    }
    const next = { ...data, registrations, preview: retained };
    update(next);
    if (await commit(next, "Equipes e elencos"))
      notify(
        `${rows.length - retained.length} itens confirmados. ${retained.length ? `${retained.length} pendências mantidas para revisão.` : "Elencos salvos neste navegador."}`,
      );
  };
  const addTeam = async () => {
    if (!newTeam.trim()) {
      notify("Informe o nome público da inscrição.", true);
      return;
    }
    if (
      data.registrations.some(
        (r) => r.dispute === dispute && r.name === newTeam.trim(),
      )
    ) {
      notify(
        "Este nome público já está inscrito nesta disputa. Use um nome distinto, como Lobos B.",
        true,
      );
      return;
    }
    const next = {
      ...data,
      registrations: [
        ...data.registrations,
        {
          id: crypto.randomUUID(),
          dispute,
          globalTeam: newTeam.replace(/ B$/, ""),
          name: newTeam.trim(),
          players: [],
        },
      ],
    };
    update(next);
    if (await commit(next, "Equipes e elencos")) {
      setAdding(false);
      setNewTeam("");
    }
  };
  const addPlayer = async (registration: Registration) => {
    if (!player.name.trim() || !/^(00|0|[1-9][0-9]?)$/.test(player.jersey)) {
      notify("Informe nome e camisa válida (0, 00 ou 1–99).", true);
      return;
    }
    if (registration.players.some((p) => p.jersey === player.jersey)) {
      notify("Camisa repetida neste elenco.", true);
      return;
    }
    if (
      data.registrations.some((r) =>
        r.players.some(
          (p) => p.name.toLowerCase() === player.name.trim().toLowerCase(),
        ),
      ) &&
      !player.identity
    ) {
      notify(
        "Nome já encontrado. Confirme explicitamente se é outra pessoa.",
        true,
      );
      return;
    }
    const next = {
      ...data,
      registrations: data.registrations.map((r) =>
        r.id === registration.id
          ? {
              ...r,
              players: [
                ...r.players,
                {
                  id:
                    Math.max(
                      10,
                      ...data.registrations.flatMap((r) =>
                        r.players.map((p) => p.id),
                      ),
                    ) + 1,
                  name: player.name.trim(),
                  jersey: player.jersey,
                },
              ],
            }
          : r,
      ),
    };
    update(next);
    if (await commit(next, "Equipes e elencos"))
      setPlayer({ registration: "", name: "", jersey: "", identity: false });
  };
  return (
    <section>
      <Heading eyebrow={disputeLabel(data, dispute)} title="Equipes e elencos">
        <div className="actions">
          <button onClick={() => setImportOpen(!importOpen)}>
            Importar por texto
          </button>
          <button className="primary" onClick={() => setAdding(!adding)}>
            + Adicionar inscrição
          </button>
        </div>
      </Heading>
      <p className="lead">
        Inscreva equipes e cuide dos atletas sem sair desta lista.
      </p>
      {adding && (
        <section className="inline-panel">
          <h2>Nova inscrição</h2>
          <p>
            Uma equipe pode ter duas inscrições, como Lobos e Lobos B, com
            elencos próprios.
          </p>
          <Field label="Nome público da inscrição" id="new-team">
            <input
              id="new-team"
              value={newTeam}
              onChange={(e) => setNewTeam(e.target.value)}
            />
          </Field>
          <div className="actions">
            <button className="primary" onClick={() => void addTeam()}>
              Salvar inscrição
            </button>
            <button onClick={() => setAdding(false)}>Cancelar</button>
          </div>
        </section>
      )}
      {importOpen && (
        <section className="inline-panel">
          <div className="section-title">
            <h2>Importar equipes e atletas</h2>
            <button onClick={() => setImportOpen(false)}>
              Fechar importação
            </button>
          </div>
          <p>
            Uma equipe por linha ou blocos iniciados por{" "}
            <code>Equipe: Nome</code>, seguidos por <code>camisa - atleta</code>
            . Não inferimos camisas ausentes.
          </p>
          <Field id="team-text" label="Cole sua lista">
            <textarea
              id="team-text"
              rows={6}
              value={data.text}
              onChange={(e) => update({ ...data, text: e.target.value })}
              placeholder={
                "Equipe: Lobos\n7 - Ana da Silva\n00 - Beatriz Costa"
              }
            />
          </Field>
          <div className="actions">
            <button
              className="primary"
              onClick={() =>
                update({ ...data, preview: parseTeams(data.text) })
              }
            >
              Gerar prévia
            </button>
            <button
              onClick={() =>
                update({
                  ...data,
                  text: "Equipe: Estrelas\n7 - Joana Santos\n7 - Maria Lima\n100 - Luiza Costa\n8 - Ana da Silva",
                  preview: [],
                })
              }
            >
              Usar exemplo com pendências
            </button>
          </div>
          {rows.length > 0 && (
            <>
              <div className="section-title">
                <h3>Revise antes de confirmar</h3>
                <Badge tone="warning">
                  {rows.filter((r) => r.error).length} pendências
                </Badge>
              </div>
              <p className="note">
                Novos atletas recebem sexo privado a partir do naipe{" "}
                <strong>{disputeLabel(data, dispute)}</strong>. Cadastros
                existentes exigem revisão de identidade; nenhuma pessoa é
                fundida pelo nome.
              </p>
              <div
                className="table-scroll"
                role="region"
                aria-label="Prévia de texto"
                tabIndex={0}
              >
                <table className="preview-table">
                  <caption className="sr-only">
                    Itens editáveis da importação
                  </caption>
                  <thead>
                    <tr>
                      <th>Linha</th>
                      <th>Equipe</th>
                      <th>Camisa</th>
                      <th>Atleta</th>
                      <th>Revisão</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id}>
                        <td>{r.line}</td>
                        <td>
                          <input
                            aria-label={`Equipe linha ${r.line}`}
                            value={r.team}
                            onChange={(e) =>
                              editRow(r.id, { team: e.target.value })
                            }
                          />
                        </td>
                        <td>
                          <input
                            className="jersey"
                            aria-label={`Camisa linha ${r.line}`}
                            value={r.jersey}
                            onChange={(e) =>
                              editRow(r.id, { jersey: e.target.value })
                            }
                          />
                        </td>
                        <td>
                          <input
                            aria-label={`Atleta linha ${r.line}`}
                            value={r.name}
                            onChange={(e) =>
                              editRow(r.id, { name: e.target.value })
                            }
                          />
                        </td>
                        <td>
                          {r.name.toLowerCase() === "ana da silva" && (
                            <select
                              aria-label={`Identidade linha ${r.line}`}
                              value={r.identity}
                              onChange={(e) =>
                                editRow(r.id, {
                                  identity: e.target
                                    .value as TextRow["identity"],
                                })
                              }
                            >
                              <option value="">Escolha a identidade</option>
                              <option value="new">
                                Outra pessoa com o mesmo nome
                              </option>
                            </select>
                          )}
                          {r.error ? (
                            <small className="error-text" role="status">
                              {r.error}
                            </small>
                          ) : (
                            <Badge tone="success">Pronto</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="actions">
                <button className="primary" onClick={() => void confirm()}>
                  Confirmar itens válidos ({rows.filter((r) => !r.error).length}
                  )
                </button>
                <span>Linhas pendentes continuam abertas.</span>
              </div>
            </>
          )}
        </section>
      )}
      <div className="toolbar">
        <Field id="search-team" label="Buscar equipe inscrita">
          <input
            id="search-team"
            type="search"
            placeholder="Nome público da equipe"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Field>
        <span className="muted">
          {registrations.length} inscrições nesta disputa
        </span>
      </div>
      {registrations.length === 0 ? (
        <Empty title="Nenhuma equipe inscrita">
          Adicione uma inscrição ou importe uma lista por texto.
        </Empty>
      ) : (
        registrations.map((r) => (
          <details className="roster" key={r.id}>
            <summary>
              <span className="team-monogram" aria-hidden="true">
                {r.name.slice(0, 2).toUpperCase()}
              </span>
              <strong>{r.name}</strong>
              <span className="muted">{r.players.length} atletas</span>
              <span className="expand-hint">
                Editar elenco <span aria-hidden="true">⌄</span>
              </span>
            </summary>
            <div className="roster-content">
              <Field
                label="Nome público da inscrição"
                id={`registration-${r.id}`}
              >
                <input
                  id={`registration-${r.id}`}
                  value={r.name}
                  onChange={(e) =>
                    update({
                      ...data,
                      registrations: data.registrations.map((x) =>
                        x.id === r.id ? { ...x, name: e.target.value } : x,
                      ),
                    })
                  }
                />
              </Field>
              <div
                className="table-scroll"
                role="region"
                aria-label={`Elenco de ${r.name}`}
                tabIndex={0}
              >
                <table>
                  <caption className="sr-only">Elenco de {r.name}</caption>
                  <thead>
                    <tr>
                      <th>Camisa</th>
                      <th>Atleta</th>
                      <th>Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.players.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <input
                            className="jersey"
                            aria-label={`Camisa de ${p.name}`}
                            value={p.jersey}
                            onChange={(e) =>
                              update({
                                ...data,
                                registrations: data.registrations.map((x) =>
                                  x.id === r.id
                                    ? {
                                        ...x,
                                        players: x.players.map((a) =>
                                          a.id === p.id
                                            ? { ...a, jersey: e.target.value }
                                            : a,
                                        ),
                                      }
                                    : x,
                                ),
                              })
                            }
                          />
                        </td>
                        <th scope="row">{p.name}</th>
                        <td>
                          <Badge>Vínculo ativo</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                className="text-button"
                onClick={() => setPlayer({ ...player, registration: r.id })}
              >
                + Adicionar atleta neste elenco
              </button>
              {player.registration === r.id && (
                <div className="inline-panel">
                  <div className="form-grid">
                    <Field
                      label="Nome do novo atleta *"
                      id={`player-name-${r.id}`}
                    >
                      <input
                        id={`player-name-${r.id}`}
                        value={player.name}
                        onChange={(e) =>
                          setPlayer({ ...player, name: e.target.value })
                        }
                      />
                    </Field>
                    <Field label="Camisa *" id={`player-jersey-${r.id}`}>
                      <input
                        id={`player-jersey-${r.id}`}
                        value={player.jersey}
                        onChange={(e) =>
                          setPlayer({ ...player, jersey: e.target.value })
                        }
                      />
                    </Field>
                  </div>
                  <p>
                    Sexo privado do novo atleta:{" "}
                    {
                      data.competition.disputes.find((d) => d.id === dispute)
                        ?.sex
                    }
                    . Não aparece na consulta pública.
                  </p>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={player.identity}
                      onChange={(e) =>
                        setPlayer({ ...player, identity: e.target.checked })
                      }
                    />
                    Confirmo que é outra pessoa se houver nome idêntico.
                  </label>
                  <div className="actions">
                    <button
                      className="primary"
                      onClick={() => void addPlayer(r)}
                    >
                      Criar atleta e vincular
                    </button>
                    <button
                      onClick={() => setPlayer({ ...player, registration: "" })}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
              <button
                className="primary"
                onClick={() => {
                  const names = data.registrations
                    .filter((x) => x.dispute === dispute)
                    .map((x) => x.name.trim().toLowerCase());
                  const valid =
                    r.name.trim() &&
                    new Set(names).size === names.length &&
                    r.players.every((p) =>
                      /^(00|0|[1-9][0-9]?)$/.test(p.jersey),
                    ) &&
                    new Set(r.players.map((p) => p.jersey)).size ===
                      r.players.length;
                  if (!valid) {
                    notify(
                      "Revise nome público e camisas: não podem estar vazios, inválidos ou repetidos.",
                      true,
                    );
                    return;
                  }
                  void commit(data, "Equipes e elencos");
                }}
              >
                Salvar elenco
              </button>
            </div>
          </details>
        ))
      )}
    </section>
  );
}

export function Games({ data, go, dispute, openGame }: ScreenProps) {
  const games = data.publications.filter(
    (p) =>
      p.dispute === dispute &&
      p.version ===
        Math.max(
          ...data.publications
            .filter((x) => x.id === p.id)
            .map((x) => x.version),
        ),
  );
  return (
    <section>
      <Heading eyebrow={disputeLabel(data, dispute)} title="Jogos">
        <div className="actions">
          <button onClick={() => go("/importar")}>Importar PDFs</button>
          <button className="primary" onClick={() => go("/sumula")}>
            + Criar jogo / preencher súmula
          </button>
        </div>
      </Heading>
      <p className="lead">
        Registre um confronto diretamente ou revise um lote de documentos.
      </p>
      <div className="section-title">
        <h2>Trabalhos em andamento</h2>
      </div>
      <ul className="task-list">
        {[{ game: data.game, sheet: data.sheet }, ...(data.gameDrafts ?? [])]
          .filter((d) => d.game.dispute === dispute)
          .map((d) => (
            <li key={d.game.id}>
              <div>
                <strong>
                  {d.game.home} × {d.game.away}
                </strong>
                <small>
                  Súmula manual · {d.sheet.present.events.length} ações no
                  rascunho
                </small>
              </div>
              <button onClick={() => openGame(d.game.id)}>
                Retomar súmula →
              </button>
            </li>
          ))}
        {data.batch.length > 0 && (
          <li>
            <div>
              <strong>Lote de PDFs</strong>
              <small>
                {data.batch.filter((i) => i.status !== "published").length}{" "}
                itens aguardando conclusão
              </small>
            </div>
            <button onClick={() => go("/importar")}>
              Retomar importação →
            </button>
          </li>
        )}
      </ul>
      <div className="section-title">
        <h2>Resultados confirmados</h2>
      </div>
      {games.length ? (
        <div
          className="table-scroll"
          role="region"
          aria-label="Resultados"
          tabIndex={0}
        >
          <table>
            <thead>
              <tr>
                <th>Jogo</th>
                <th>Placar</th>
                <th>Fonte</th>
                <th>Versão</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {games.map((p) => (
                <tr key={p.id}>
                  <th scope="row">
                    {p.home} × {p.away}
                  </th>
                  <td>
                    {p.score[0]} × {p.score[1]}
                  </td>
                  <td>{p.source === "sheet" ? "Súmula" : "Boxscore"}</td>
                  <td>{p.version}</td>
                  <td>
                    <button onClick={() => go("/publico")}>
                      Ver resultado
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="Nenhum resultado publicado">
          Os rascunhos continuam privados nesta simulação até Confirmar e
          publicar.
        </Empty>
      )}
    </section>
  );
}

export function Rules() {
  return (
    <section>
      <Heading title="Regulamento" />
      <p className="lead">
        A organização completa será implementada após a avaliação dos três
        percursos.
      </p>
      <div className="note">
        <h2>O jogo pode vir primeiro</h2>
        <p>
          Não é necessário gerar fases, grupos ou chaves para cadastrar uma
          partida. A súmula deste protótipo segue o motor FIBA_2024 incluído no
          pacote.
        </p>
      </div>
      <p>
        Pontos corridos, eliminatórias, grupos, séries e prévias de alteração
        pertencem ao marco de organização e histórico.
      </p>
    </section>
  );
}
