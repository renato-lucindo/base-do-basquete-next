import { useRef, useState } from "react";
import {
  exampleBatch,
  type BatchItem,
  type Prototype,
} from "../prototype/model";
import {
  Badge,
  Empty,
  Field,
  Heading,
  disputeLabel,
  type ScreenProps,
} from "../ui";
import { useViewState } from "../prototype/view-state";

const stateLabel: Record<BatchItem["status"], string> = {
  pending: "Pendente",
  ready: "Pronto para publicar",
  error: "Falha no arquivo",
  duplicate: "Duplicado",
  published: "Publicado",
};

export function PdfWorkspace({
  data,
  update,
  commit,
  notify,
  go,
  dispute,
  publish,
}: ScreenProps & { publish: (next: Prototype) => Promise<void> }) {
  const [active, setActive] = useViewState<string | null>("active-pdf", null);
  const [destination, setDestination] = useState(dispute);
  const [busy, setBusy] = useState(false);
  const [identity, setIdentity] = useState("");
  const [review, setReview] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const current = data.batch.find((i) => i.id === active);
  const ready = data.batch.filter((i) => i.status === "ready" && i.selected);
  const patch = (id: string, patch: Partial<BatchItem>) =>
    update({
      ...data,
      batch: data.batch.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    });
  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    const additions: BatchItem[] = [];
    for (const file of Array.from(files)) {
      const signature = new TextDecoder().decode(
        await file.slice(0, 5).arrayBuffer(),
      );
      const error =
        file.size > 10 * 1024 * 1024
          ? "Arquivo acima de 10 MiB."
          : !file.name.toLowerCase().endsWith(".pdf") ||
              file.type !== "application/pdf" ||
              signature !== "%PDF-"
            ? "Selecione um PDF válido."
            : "Extração não conectada neste protótipo. Use o lote de exemplo para avaliar a revisão.";
      additions.push({
        id: crypto.randomUUID(),
        file: file.name,
        destination,
        home: "",
        away: "",
        format: "A verificar",
        status: "error",
        error,
        selected: false,
        resolved: false,
        failPublish: false,
        score: [0, 0],
        date: "",
      });
    }
    update({ ...data, batch: [...data.batch, ...additions] });
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
  };
  const resolve = () => {
    if (!current) return;
    if (
      !current.home.trim() ||
      !current.away.trim() ||
      current.home.trim() === current.away.trim()
    ) {
      notify("Informe duas equipes distintas no próprio jogo.", true);
      return;
    }
    if (!identity) {
      notify("Resolva a identidade de J. Silva antes de continuar.", true);
      return;
    }
    patch(current.id, {
      status: "ready",
      resolved: true,
      error: "",
      selected: true,
    });
    setIdentity("");
    notify(
      "Equipes e identidade revisadas neste destino. Salve o rascunho para retomar depois.",
    );
  };
  return (
    <section>
      <button className="back-link" onClick={() => go("/jogos")}>
        ← Voltar aos jogos
      </button>
      <Heading
        eyebrow={`${data.competition.name} · ${data.competition.year}`}
        title="Importar PDFs"
      >
        <Badge>Revisão em lote</Badge>
      </Heading>
      <p className="lead">
        Revise cada jogo no seu contexto. Publique os prontos e mantenha as
        pendências abertas.
      </p>
      <p className="note">
        <strong>Simulação de revisão.</strong> O lote de exemplo contém dados
        fictícios. A extração real de PDFs será conectada após esta avaliação;
        arquivos selecionados não recebem resultados inventados.
      </p>
      <section className="upload-area">
        <div>
          <h2>Adicionar documentos</h2>
          <p>
            FIBA / Genius Sports ou Basketball Site · PDF de até 10 MiB · 1 a 4
            páginas na integração
          </p>
        </div>
        <Field id="default-destination" label="Destino padrão">
          <select
            id="default-destination"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          >
            {data.competition.disputes.map((d) => (
              <option key={d.id} value={d.id}>
                {disputeLabel(data, d.id)}
              </option>
            ))}
          </select>
        </Field>
        <div className="actions">
          <label className="button" htmlFor="pdf-files">
            Selecionar PDFs
          </label>
          <input
            className="sr-only"
            ref={fileRef}
            id="pdf-files"
            type="file"
            accept="application/pdf,.pdf"
            multiple
            onChange={(e) => void addFiles(e.target.files)}
          />
          <button
            className="primary"
            onClick={() => {
              if (
                data.batch.length &&
                !window.confirm(
                  "Substituir o lote de trabalho pelo exemplo? Resultados já publicados serão mantidos.",
                )
              )
                return;
              const items = exampleBatch();
              update({ ...data, batch: items });
              setActive(items[0].id);
              setReview(false);
            }}
          >
            Carregar lote de exemplo
          </button>
        </div>
      </section>
      {busy && <p role="status">Conferindo os arquivos selecionados…</p>}
      {data.batch.length === 0 ? (
        <Empty title="Nenhum arquivo no lote">
          Carregue o lote fictício para experimentar destinos diferentes, erro
          de arquivo, duplicidade e sucesso parcial.
        </Empty>
      ) : (
        <>
          <div className="section-title">
            <h2>
              Arquivos do lote{" "}
              <span className="muted">({data.batch.length})</span>
            </h2>
            <button onClick={() => void commit(data, "Importação de PDFs")}>
              Salvar revisão e decisões
            </button>
          </div>
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Arquivos do lote"
          >
            <table className="batch-table">
              <caption className="sr-only">
                Estado e destino por arquivo
              </caption>
              <thead>
                <tr>
                  <th scope="col">
                    <span className="sr-only">Selecionar</span>
                  </th>
                  <th scope="col">Arquivo / formato</th>
                  <th scope="col">Destino</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Ação</th>
                </tr>
              </thead>
              <tbody>
                {data.batch.map((item) => (
                  <tr
                    key={item.id}
                    className={active === item.id ? "selected-row" : ""}
                  >
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Selecionar ${item.file}`}
                        disabled={item.status !== "ready"}
                        checked={item.selected}
                        onChange={(e) =>
                          patch(item.id, { selected: e.target.checked })
                        }
                      />
                    </td>
                    <th scope="row">
                      <span>{item.file}</span>
                      <small className="muted">{item.format}</small>
                    </th>
                    <td>
                      <select
                        aria-label={`Destino de ${item.file}`}
                        value={item.destination}
                        disabled={item.status === "published"}
                        onChange={(e) => {
                          patch(item.id, {
                            destination: e.target.value,
                            status:
                              item.status === "ready" ? "pending" : item.status,
                            resolved: false,
                            selected: false,
                            error:
                              "Destino alterado: revise as associações. Conteúdo extraído preservado.",
                          });
                          setActive(item.id);
                          setIdentity("");
                          setReview(false);
                        }}
                      >
                        {data.competition.disputes.map((d) => (
                          <option key={d.id} value={d.id}>
                            {disputeLabel(data, d.id)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <Badge
                        tone={
                          item.status === "published"
                            ? "success"
                            : item.status === "ready"
                              ? "neutral"
                              : item.status === "error"
                                ? "danger"
                                : "warning"
                        }
                      >
                        {stateLabel[item.status]}
                      </Badge>
                      {item.error && (
                        <small className="error-text">{item.error}</small>
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => {
                          setActive(item.id);
                          setIdentity("");
                          setReview(false);
                        }}
                      >
                        {item.status === "published" ? "Ver jogo" : "Revisar"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {current && (
            <section
              className="inline-panel review-workspace"
              aria-label="Revisão do jogo"
            >
              <div className="section-title">
                <h2>{current.file}</h2>
                <Badge>{disputeLabel(data, current.destination)}</Badge>
              </div>
              {current.status === "error" ? (
                <>
                  <p className="error-text">{current.error}</p>
                  <div className="actions">
                    <button
                      onClick={() => {
                        patch(current.id, {
                          file: "Arquivo substituído (exemplo).pdf",
                          format: "FIBA / Genius Sports",
                          home: "Litoral",
                          away: "Aurora",
                          score: [48, 45],
                          date: "2026-05-10T18:00",
                          status: "pending",
                          error: "Revise o jogo e as identidades.",
                          resolved: false,
                        });
                      }}
                    >
                      Substituir por exemplo válido
                    </button>
                    <button
                      onClick={() =>
                        notify(
                          "Nova tentativa concluída: o arquivo continua incompatível. Substitua-o para continuar.",
                          true,
                        )
                      }
                    >
                      Tentar extração novamente
                    </button>
                  </div>
                </>
              ) : current.status === "duplicate" ? (
                <>
                  <p>
                    Esta cópia representa o mesmo arquivo do primeiro jogo.
                    Nenhuma nova publicação será criada.
                  </p>
                  <button
                    onClick={() => {
                      update({
                        ...data,
                        batch: data.batch.filter((i) => i.id !== current.id),
                      });
                      setActive(null);
                    }}
                  >
                    Remover duplicata do lote
                  </button>
                </>
              ) : (
                <>
                  <div className="form-grid">
                    <Field id="pdf-home" label="Equipe A / inscrição">
                      <input
                        id="pdf-home"
                        list="known-teams"
                        value={current.home}
                        disabled={current.status === "published"}
                        onChange={(e) =>
                          patch(current.id, {
                            home: e.target.value,
                            resolved: false,
                            status: "pending",
                            selected: false,
                          })
                        }
                      />
                    </Field>
                    <Field id="pdf-away" label="Equipe B / inscrição">
                      <input
                        id="pdf-away"
                        list="known-teams"
                        value={current.away}
                        disabled={current.status === "published"}
                        onChange={(e) =>
                          patch(current.id, {
                            away: e.target.value,
                            resolved: false,
                            status: "pending",
                            selected: false,
                          })
                        }
                      />
                    </Field>
                    <Field id="pdf-date" label="Data e hora · Brasília">
                      <input
                        id="pdf-date"
                        type="datetime-local"
                        value={current.date}
                        disabled={current.status === "published"}
                        onChange={(e) =>
                          patch(current.id, { date: e.target.value })
                        }
                      />
                    </Field>
                  </div>
                  <datalist id="known-teams">
                    {data.registrations
                      .filter((r) => r.dispute === current.destination)
                      .map((r) => (
                        <option key={r.id}>{r.name}</option>
                      ))}
                  </datalist>
                  <div className="score-preview">
                    <strong>
                      {current.home} {current.score[0]} × {current.score[1]}{" "}
                      {current.away}
                    </strong>
                    <span>Placar extraído ilustrativo</span>
                  </div>
                  {current.format === "Basketball Site" && (
                    <p>
                      Parciais reais, +/− e faltas recebidas:{" "}
                      <strong>— indisponíveis</strong>. Não são preenchidos com
                      zero.
                    </p>
                  )}
                  {!current.resolved && current.status !== "published" && (
                    <div className="identity-review">
                      <h3>Resolver cadastros neste destino</h3>
                      <p>
                        Equipe ou inscrição ausente será criada ao confirmar o
                        jogo. Os nomes acima são editáveis sem visitar outro
                        cadastro.
                      </p>
                      <p>
                        <strong>J. Silva · camisa 7</strong> — mais de uma
                        pessoa possível. A similaridade não confirma o vínculo.
                      </p>
                      <Field
                        id="identity-choice"
                        label="Identidade de J. Silva"
                      >
                        <select
                          id="identity-choice"
                          value={identity}
                          onChange={(e) => setIdentity(e.target.value)}
                        >
                          <option value="">Selecione uma decisão</option>
                          <option value="ana">
                            Júlia Silva · mesma inscrição · 2026
                          </option>
                          <option value="other">
                            Joana Silva · participação anterior · 2025
                          </option>
                          <option value="new">
                            Criar outra pessoa com este nome
                          </option>
                        </select>
                      </Field>
                      <p>
                        Novos atletas: sexo privado preenchido pelo naipe{" "}
                        {
                          data.competition.disputes.find(
                            (d) => d.id === current.destination,
                          )?.sex
                        }
                        . Cadastros existentes não terão sexo alterado.
                      </p>
                      <button className="primary" onClick={resolve}>
                        Confirmar associações deste jogo
                      </button>
                    </div>
                  )}
                  {current.status === "published" ? (
                    <div className="actions">
                      <Badge tone="success">Jogo confirmado na simulação</Badge>
                      <button onClick={() => go("/publico")}>
                        Abrir resultado público ↗
                      </button>
                    </div>
                  ) : (
                    current.resolved && (
                      <>
                        <p className="success-text">
                          Associações revisadas. Este jogo pode ser selecionado
                          para confirmação.
                        </p>
                        <label className="check">
                          <input
                            type="checkbox"
                            checked={current.failPublish}
                            onChange={(e) =>
                              patch(current.id, {
                                failPublish: e.target.checked,
                              })
                            }
                          />
                          Demonstrar falha de publicação deste jogo na primeira
                          tentativa
                        </label>
                      </>
                    )
                  )}
                </>
              )}
            </section>
          )}
          <div className="publish-bar">
            <div>
              <strong>{ready.length} jogos selecionados e prontos</strong>
              <p>Erros e pendências continuam no lote.</p>
            </div>
            <button
              className="primary"
              disabled={!ready.length}
              onClick={() => setReview(true)}
            >
              Revisar confirmação
            </button>
          </div>
          {review && (
            <section
              className="confirmation"
              aria-label="Confirmar publicação do lote"
            >
              <h2>Confirmar e publicar os jogos selecionados?</h2>
              <p>
                Serão expostos na consulta demonstrativa somente estes jogos e
                seus cadastros necessários:
              </p>
              <ul>
                {ready.map((i) => (
                  <li key={i.id}>
                    {i.home} × {i.away} · {disputeLabel(data, i.destination)}
                  </li>
                ))}
              </ul>
              <p>
                Uma falha mantém os demais sucessos e permite tentar o item
                novamente.
              </p>
              <div className="actions">
                <button
                  className="primary"
                  disabled={!ready.length}
                  onClick={() => {
                    setReview(false);
                    void publish(data);
                  }}
                >
                  Confirmar e publicar
                </button>
                <button onClick={() => setReview(false)}>
                  Voltar à revisão
                </button>
              </div>
            </section>
          )}
        </>
      )}
    </section>
  );
}
