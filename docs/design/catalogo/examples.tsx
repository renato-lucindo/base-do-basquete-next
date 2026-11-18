import { useState } from "react";
import { AdminToast, type ToastTone } from "../../../src/ui-system/admin-toast";
import { ResourceState } from "../../../src/statistics/reference/resource-state";
import { Badge, Field } from "../../../src/ui";
import {
  GlobalSearch,
  type SearchGroup,
  type SearchProvider,
} from "../../../src/ui-system/global-search";
import { normalizeSearch } from "../../../src/ui-system/controls";

const suggestions: SearchGroup[] = [
  {
    type: "teams",
    label: "Equipes",
    items: [
      {
        id: "serra",
        type: "teams",
        label: "Associação Atlética da Serra",
        description: "Sub-17",
      },
      {
        id: "enseada",
        type: "teams",
        label: "Clube Náutico da Enseada",
        description: "Sub-17",
      },
    ],
  },
  {
    type: "competitions",
    label: "Campeonatos",
    items: [
      {
        id: "litoral",
        type: "competitions",
        label: "Liga do Litoral",
        description: "Categoria Sub-17",
      },
    ],
  },
];

const searchCatalog: SearchProvider = async (query, type) =>
  suggestions
    .filter((group) => type === "all" || group.type === type)
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        normalizeSearch(item.label).includes(query),
      ),
    }))
    .filter((group) => group.items.length > 0);

export function PublicSearchExample() {
  const [selected, setSelected] = useState("");
  return (
    <div className="catalog-card">
      <h3>Busca global</h3>
      <div className="bb-ui catalog-public">
        <GlobalSearch
          provider={searchCatalog}
          onSelect={(item) => setSelected(item.label)}
        />
        <div className="catalog-save" role="status">
          {selected && `Selecionado: ${selected}`}
        </div>
      </div>
    </div>
  );
}

export function AdminControls() {
  const [message, setMessage] = useState("");
  return (
    <div className="catalog-card">
      <h3>Campos e ações</h3>
      <form
        className="catalog-form"
        autoComplete="off"
        onReset={() => setMessage("")}
        onSubmit={(event) => {
          event.preventDefault();
          setMessage("Jogo de exemplo salvo.");
        }}
      >
        <div className="catalog-field-grid">
          <Field id="numero-jogo" label="Nº do jogo">
            <input
              id="numero-jogo"
              type="number"
              name="numero"
              min="1"
              defaultValue="12"
              required
            />
          </Field>
          <Field id="data-jogo" label="Data">
            <input
              id="data-jogo"
              type="date"
              name="data"
              defaultValue="2026-11-15"
              required
            />
          </Field>
          <Field id="naipe-jogo" label="Naipe">
            <select id="naipe-jogo" name="naipe">
              <option>Masculino</option>
              <option>Feminino</option>
            </select>
          </Field>
        </div>
        <fieldset className="catalog-choice-group">
          <legend>Situação</legend>
          <div className="catalog-inline">
            <label>
              <input
                type="radio"
                name="situacao"
                value="agendado"
                defaultChecked
              />{" "}
              Agendado
            </label>
            <label>
              <input type="radio" name="situacao" value="encerrado" /> Encerrado
            </label>
          </div>
        </fieldset>
        <Field id="observacoes-jogo" label="Observações (opcional)">
          <textarea id="observacoes-jogo" name="observacoes" rows={2} />
        </Field>
        <div className="catalog-inline">
          <button type="submit" className="primary">
            Salvar jogo
          </button>
          <button type="reset">Restaurar exemplo</button>
        </div>
        <div className="catalog-save" role="status">
          {message}
        </div>
      </form>
    </div>
  );
}

const states = [
  { key: "loading", label: "Carregando" },
  { key: "empty", label: "Vazio" },
  { key: "error", label: "Erro" },
] as const;

export function FeedbackExamples() {
  const [state, setState] = useState<(typeof states)[number]["key"]>("empty");
  const [reloaded, setReloaded] = useState(false);
  const [toast, setToast] = useState<{ key: number; tone: ToastTone }>();
  const toastMessages = {
    success: "Local de jogo salvo",
    error: "Não foi possível salvar o local de jogo",
    warning: "Inscrição salva. Atleta acima da idade do Sub-17.",
  };

  return (
    <section className="catalog-section" aria-labelledby="estados">
      <h2 id="estados">Estados e feedback</h2>
      <div className="catalog-foundations">
        <div className="catalog-card">
          <h3>Resultados</h3>
          <div className="bb-ui catalog-public">
            <div
              className="bb-segment"
              role="group"
              aria-label="Estado da consulta"
            >
              {states.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={state === key}
                  onClick={() => {
                    setState(key);
                    setReloaded(false);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="catalog-statistics public-site statistics-public catalog-resource">
            {state === "loading" && (
              <ResourceState
                kind="loading"
                title="Carregando jogos…"
                detail="Consultando a agenda da disputa."
              />
            )}
            {state === "empty" && (
              <ResourceState
                kind="empty"
                title="Nenhum jogo encontrado"
                detail="Selecione outra data."
              />
            )}
            {state === "error" && !reloaded && (
              <ResourceState
                kind="error"
                title="Não foi possível carregar os jogos"
                detail="Tente consultar a agenda novamente."
                action={
                  <button type="button" onClick={() => setReloaded(true)}>
                    Tentar novamente
                  </button>
                }
              />
            )}
            {state === "error" && reloaded && (
              <p className="notice success" role="status">
                Agenda atualizada.
              </p>
            )}
          </div>
        </div>
        <div className="catalog-card">
          <h3>Situações e notificação</h3>
          <ul
            className="catalog-inline catalog-badges"
            aria-label="Situações administrativas"
          >
            <li>
              <Badge>Rascunho</Badge>
            </li>
            <li>
              <Badge tone="success">Publicado</Badge>
            </li>
            <li>
              <Badge tone="warning">Pendente</Badge>
            </li>
            <li>
              <Badge tone="danger">Rejeitado</Badge>
            </li>
          </ul>
          <div className="catalog-inline">
            {(
              [
                ["success", "sucesso"],
                ["error", "erro"],
                ["warning", "aviso"],
              ] as const
            ).map(([tone, label]) => (
              <button
                key={tone}
                type="button"
                onClick={() =>
                  setToast((previous) => ({
                    key: (previous?.key ?? 0) + 1,
                    tone,
                  }))
                }
              >
                Mostrar {label}
              </button>
            ))}
          </div>
          {toast && (
            <AdminToast
              key={toast.key}
              tone={toast.tone}
              message={toastMessages[toast.tone]}
            />
          )}
        </div>
      </div>
    </section>
  );
}
