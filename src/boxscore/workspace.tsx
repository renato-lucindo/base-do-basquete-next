import { useEffect, useRef, useState } from "react";
import { api, ApiFailure, isSessionFailure } from "../competition/api";
import {
  pdfSourceListingSchema,
  pdfUploadResultSchema,
  type PdfSource,
} from "./source-contract";
import { PdfContextPicker, type PdfContext } from "./context-picker";
import { PdfReviewPanel } from "./review-panel";
import { readPdfView } from "./view";
import "./workspace.css";
type Job = {
  localId: string;
  file: File;
  sourceId: string;
  commandId: string;
  disputeId: string;
  state: "queued" | "sending" | "done" | "error" | "uncertain";
  message: string;
  duplicate?: boolean;
};
export type PdfWorkspaceProps = {
  defaultDisputeId: string;
  initialContexts: PdfContext[];
  enabled: boolean;
  guard: { current: () => boolean };
  onSessionLost: () => void;
  onSaved: () => void;
  onBack: () => void;
};
export function PdfSourcesWorkspace(props: PdfWorkspaceProps) {
  const [restored] = useState(() =>
    readPdfView(history.state, props.defaultDisputeId, props.initialContexts),
  );
  const [contexts, setContexts] = useState(restored.contexts),
    [destination, setDestination] = useState(restored.destination),
    [list, setList] = useState<{ items: PdfSource[]; hasMore: boolean }>({
      items: [],
      hasMore: false,
    }),
    [offset, setOffset] = useState(restored.offset),
    [epoch, setEpoch] = useState(0),
    [jobs, setJobs] = useState<Job[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [selected, setSelected] = useState<string | null>(restored.selected),
    [loading, setLoading] = useState(false);
  const reviewGuard = useRef(() => true),
    busyRef = useRef(false),
    enabled = useRef(props.enabled),
    heading = useRef<HTMLHeadingElement>(null),
    alert = useRef<HTMLParagraphElement>(null);
  enabled.current = props.enabled;
  useEffect(() => {
    if (!props.enabled) return;
    try {
      history.replaceState(
        {
          ...history.state,
          bdbPdfView: {
            baseDisputeId: props.defaultDisputeId,
            destination,
            offset,
            selected,
            contexts,
          },
        },
        "",
        location.href,
      );
    } catch {
      /* Navigation remains usable if the browser declines its history cache. */
    }
  }, [props.enabled, destination, offset, selected, contexts]);
  function addContexts(rows: PdfContext[]) {
    setContexts((old) => [
      ...new Map([...old, ...rows].map((r) => [r.id, r])).values(),
    ]);
  }
  function mayLeave() {
    return (
      !busyRef.current &&
      reviewGuard.current() &&
      (!jobs.some((j) => ["queued", "uncertain"].includes(j.state)) ||
        window.confirm(
          "Há arquivos locais com envio pendente. Sair exige selecioná-los novamente. Continuar?",
        ))
    );
  }
  useEffect(() => {
    props.guard.current = mayLeave;
    return () => {
      props.guard.current = () => true;
    };
  });
  useEffect(() => {
    if (props.enabled && !selected) heading.current?.focus();
  }, [props.enabled, selected]);
  useEffect(() => {
    if (error && props.enabled) alert.current?.focus();
  }, [error, props.enabled]);
  useEffect(() => {
    if (!busy && !jobs.some((j) => ["queued", "uncertain"].includes(j.state)))
      return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy, jobs]);
  useEffect(() => {
    if (!props.enabled) return;
    let active = true;
    const c = new AbortController();
    setLoading(true);
    void api(
      `/api/pdf-sources?disputeId=${destination}&offset=${offset}`,
      pdfSourceListingSchema,
      undefined,
      c.signal,
    )
      .then((r) => {
        if (active) {
          setList(r);
          setError("");
        }
      })
      .catch((e) => {
        if (active) {
          if (isSessionFailure(e)) props.onSessionLost();
          else
            setError(
              "Não foi possível carregar os documentos. Tente novamente.",
            );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      c.abort();
    };
  }, [props.enabled, destination, offset, epoch]);
  function patch(id: string, change: Partial<Job>) {
    setJobs((old) =>
      old.map((j) => (j.localId === id ? { ...j, ...change } : j)),
    );
  }
  async function run(rows: Job[]) {
    if (busyRef.current || !props.enabled) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      for (const j of rows) {
        if (!enabled.current) break;
        patch(j.localId, {
          state: "sending",
          message: "Enviando e interpretando…",
        });
        try {
          const params = new URLSearchParams({
            commandId: j.commandId,
            sourceId: j.sourceId,
            disputeId: j.disputeId,
            filename: j.file.name,
          });
          const r = await api(
            `/api/pdf-sources?${params}`,
            pdfUploadResultSchema,
            j.file,
          );
          patch(j.localId, {
            sourceId: r.id,
            duplicate: r.duplicate,
            state: "done",
            message: r.duplicate
              ? "Documento já existente. Retome a revisão; nenhuma cópia foi publicada."
              : "Arquivo recebido. Revisão pendente.",
          });
          setEpoch((v) => v + 1);
          props.onSaved();
        } catch (e) {
          patch(j.localId, {
            state:
              e instanceof ApiFailure && [400, 413, 415].includes(e.status)
                ? "error"
                : "uncertain",
            message:
              e instanceof Error
                ? e.message
                : "Envio não confirmado. Repita com o mesmo arquivo.",
          });
          if (isSessionFailure(e)) {
            props.onSessionLost();
            break;
          }
        }
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  function select(files: FileList | null, source?: PdfSource) {
    if (!files?.length) return;
    const additions = Array.from(files).map((file) => ({
      localId: crypto.randomUUID(),
      file,
      sourceId: source?.id ?? crypto.randomUUID(),
      commandId: crypto.randomUUID(),
      disputeId: source?.disputeId ?? destination,
      state: "queued" as const,
      message: "Aguardando envio",
    }));
    setJobs((old) => [...old, ...additions]);
    void run(additions);
  }
  return (
    <section className="pdf-workspace">
      <div className="competition-title">
        <h3 ref={heading} tabIndex={-1}>
          Importar PDFs
        </h3>
        <button
          disabled={busy}
          onClick={() => {
            if (mayLeave()) props.onBack();
          }}
        >
          Voltar aos jogos
        </button>
      </div>
      <div hidden={selected !== null}>
        <p>
          FIBA / Genius Sports ou Basketball Site. Até 10 MiB e 1 a 4 páginas
          por PDF. Arquivos são tratados individualmente; salvar uma revisão não
          publica resultado.
        </p>
        <PdfContextPicker
          label="Destino padrão dos PDFs"
          value={destination}
          contexts={contexts}
          onContexts={addContexts}
          onChange={(id) => {
            setDestination(id);
            setOffset(0);
          }}
          disabled={busy || !props.enabled}
          onSessionLost={props.onSessionLost}
        />
        <label>
          Selecionar PDFs
          <input
            aria-label="Selecionar PDFs"
            type="file"
            accept="application/pdf,.pdf"
            multiple
            disabled={busy || !props.enabled}
            onChange={(e) => {
              select(e.target.files);
              e.currentTarget.value = "";
            }}
          />
        </label>
        <p role="status">
          {busy
            ? "Enviando arquivos, um por vez…"
            : loading
              ? "Carregando documentos…"
              : ""}
        </p>
        <ul className="pdf-jobs">
          {jobs.map((j) => (
            <li key={j.localId}>
              <strong>{j.file.name}</strong>
              <p>{j.message}</p>
              {j.state === "done" && j.duplicate && (
                <button
                  disabled={busy || !props.enabled}
                  onClick={() => setSelected(j.sourceId)}
                >
                  Retomar documento existente de {j.file.name}
                </button>
              )}
              {["uncertain", "queued"].includes(j.state) && (
                <button
                  disabled={busy || !props.enabled}
                  onClick={() => void run([j])}
                >
                  Repetir envio de {j.file.name}
                </button>
              )}
            </li>
          ))}
        </ul>
        {error && (
          <p role="alert" ref={alert} tabIndex={-1}>
            {error}
          </p>
        )}
        <div className="competition-actions">
          <button
            disabled={busy || !props.enabled}
            onClick={() => setEpoch((v) => v + 1)}
          >
            Atualizar documentos
          </button>
          <button
            disabled={!offset || busy}
            onClick={() => setOffset(Math.max(0, offset - 20))}
          >
            Documentos anteriores
          </button>
          <button
            disabled={!list.hasMore || busy}
            onClick={() => setOffset(offset + 20)}
          >
            Mais documentos
          </button>
        </div>
        <ul className="competition-list">
          {list.items.map((s) => (
            <li key={s.id}>
              <strong>{s.filename}</strong>
              <p>
                {s.ready
                  ? "Extraído · revisão em rascunho"
                  : "Envio incompleto · selecione o mesmo PDF para concluir"}
              </p>
              {s.ready ? (
                <button disabled={busy} onClick={() => setSelected(s.id)}>
                  Revisar {s.filename}
                </button>
              ) : (
                <label>
                  Concluir envio de {s.filename}
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    disabled={busy || !props.enabled}
                    onChange={(e) => {
                      select(e.target.files, s);
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
              )}
            </li>
          ))}
        </ul>
        {!loading && !list.items.length && (
          <p>Nenhum documento salvo neste destino.</p>
        )}
      </div>
      {selected && (
        <PdfReviewPanel
          key={selected}
          sourceId={selected}
          contexts={contexts}
          onContexts={addContexts}
          enabled={props.enabled}
          guard={reviewGuard}
          onSessionLost={props.onSessionLost}
          onSaved={() => {
            setEpoch((v) => v + 1);
            props.onSaved();
          }}
          onBack={() => setSelected(null)}
        />
      )}
    </section>
  );
}
