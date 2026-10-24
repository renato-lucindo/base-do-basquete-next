import { useEffect, useRef, useState } from "react";
import { api, ApiFailure, isSessionFailure } from "../competition/api";
import type { PdfSource } from "../boxscore/source-contract";
import { gameSnapshotSchema, type GameSnapshot } from "../games/contract";
import { preparationSchema } from "./preparation-contract";
import { publicationPdfResultSchema } from "./data-contract";
import type { PublishPdf } from "./pdf-contract";
type State =
  "ready" | "sending" | "published" | "uncertain" | "review" | "waiting";
type Item = {
  source: PdfSource;
  command: PublishPdf | null;
  game: GameSnapshot | null;
  state: State;
  message: string;
  version?: number;
};
type Props = {
  sources: PdfSource[];
  enabled: boolean;
  guard: { current: () => boolean };
  onLock: (v: boolean) => void;
  onSessionLost: () => void;
  onReview: (id: string) => void;
  onPublished: () => void;
};
export function PdfPublicationBatch(p: Props) {
  const [selection, setSelection] = useState<string[]>([]),
    [items, setItems] = useState<Item[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const busyRef = useRef(false),
    enabled = useRef(p.enabled),
    summary = useRef<HTMLParagraphElement>(null),
    epoch = useRef(0);
  enabled.current = p.enabled;
  const unknown = items.some(
    (i) =>
      i.state === "uncertain" || (i.state === "waiting" && i.command !== null),
  );
  function mayLeave() {
    return (
      !busyRef.current &&
      (!unknown ||
        window.confirm(
          "Há publicações sem confirmação. Os comandos salvos podem ser conferidos depois. Deseja sair?",
        ))
    );
  }
  useEffect(() => {
    p.guard.current = mayLeave;
  });
  useEffect(() => {
    p.onLock(busy);
  }, [busy, p.onLock]);
  useEffect(
    () => () => {
      epoch.current++;
      p.guard.current = () => true;
      p.onLock(false);
    },
    [p.guard, p.onLock],
  );
  useEffect(() => {
    if (!unknown && !busy) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unknown, busy]);
  function update(id: string, patch: Partial<Item>) {
    setItems((old) =>
      old.map((i) => (i.source.id === id ? { ...i, ...patch } : i)),
    );
  }
  async function check() {
    if (!enabled.current || busyRef.current || !mayLeave()) return;
    const n = ++epoch.current;
    busyRef.current = true;
    setBusy(true);
    setError("");
    setItems([]);
    const found: Item[] = [];
    try {
      for (const source of p.sources.filter((s) => selection.includes(s.id))) {
        if (!enabled.current) break;
        try {
          const saved = await api(
            `/api/pdf-sources/${source.id}/preparation`,
            preparationSchema.nullable(),
          );
          if (!saved)
            throw Error(
              "Abra a revisão e salve uma preparação completa antes de publicar.",
            );
          if (
            saved.sourceId !== source.id ||
            saved.publication.source.sourceId !== source.id
          )
            throw Error("A preparação não corresponde a este documento.");
          const game = await api(
            `/api/games/${saved.publication.gameId}`,
            gameSnapshotSchema,
          );
          if (game.id !== saved.publication.gameId)
            throw Error("O jogo não corresponde à preparação salva.");
          found.push({
            source,
            command: structuredClone(saved.publication),
            game,
            state: "ready",
            message:
              game.version === saved.publication.gameVersion
                ? "Preparação salva. O servidor conferirá as versões e o fechamento ao publicar."
                : "O jogo recebeu alterações. O envio original será conferido; para corrigir, prepare uma nova revisão.",
          });
        } catch (e) {
          found.push({
            source,
            command: null,
            game: null,
            state: isSessionFailure(e) ? "waiting" : "review",
            message:
              e instanceof Error
                ? e.message
                : "Não foi possível conferir este documento.",
          });
          if (isSessionFailure(e)) {
            p.onSessionLost();
            break;
          }
        }
        if (n !== epoch.current) return;
        setItems([...found]);
      }
      const counts = new Map<string, number>();
      for (const i of found)
        if (i.command)
          counts.set(i.command.gameId, (counts.get(i.command.gameId) ?? 0) + 1);
      setItems(
        found.map((i) =>
          i.command && (counts.get(i.command.gameId) ?? 0) > 1
            ? {
                ...i,
                state: "review",
                message:
                  "Há mais de uma preparação para este jogo. Selecione apenas uma fonte.",
              }
            : i,
        ),
      );
    } finally {
      if (n === epoch.current) {
        busyRef.current = false;
        setBusy(false);
        summary.current?.focus();
      }
    }
  }
  async function publish(rows: Item[]) {
    if (!enabled.current || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    const n = ++epoch.current;
    try {
      for (const row of rows) {
        if (!enabled.current) break;
        const c = row.command;
        if (!c || row.state === "published" || row.state === "review") continue;
        update(row.source.id, {
          state: "sending",
          message: "Publicando este jogo…",
        });
        try {
          const ack = await api(
            `/api/games/${c.gameId}/publication/pdf`,
            publicationPdfResultSchema,
            c,
          );
          if (
            ack.requestId !== c.requestId ||
            ack.gameId !== c.gameId ||
            ack.version !== c.basePublicationVersion + 1 ||
            ack.gameVersion !== c.gameVersion + 1 ||
            ack.reviewVersion !== c.source.reviewVersion ||
            ack.sourceVersion !== 2
          )
            throw new ApiFailure(
              503,
              "Não foi possível confirmar a resposta deste jogo. Repita o mesmo envio.",
            );
          if (n !== epoch.current) return;
          update(row.source.id, {
            state: "published",
            message: `Publicado · versão ${ack.version}`,
            version: ack.version,
          });
          p.onPublished();
        } catch (e) {
          if (n !== epoch.current) return;
          const session = isSessionFailure(e),
            needsReview =
              e instanceof ApiFailure && [400, 409].includes(e.status);
          update(row.source.id, {
            state: session ? "waiting" : needsReview ? "review" : "uncertain",
            message:
              e instanceof Error
                ? e.message
                : "Resposta não confirmada deste jogo.",
          });
          if (session) {
            p.onSessionLost();
            break;
          }
        }
      }
    } finally {
      if (n === epoch.current) {
        busyRef.current = false;
        setBusy(false);
        summary.current?.focus();
      }
    }
  }
  const published = items.filter((i) => i.state === "published").length,
    review = items.filter((i) => i.state === "review").length,
    uncertain = items.filter((i) => i.state === "uncertain").length,
    remaining = items.filter(
      (i) => ["ready", "waiting"].includes(i.state) && i.command,
    ).length;
  const selected = p.sources.filter((s) => selection.includes(s.id));
  return (
    <section
      className="pdf-publication"
      aria-label="Publicação de PDFs selecionados"
      aria-busy={busy}
    >
      <h3>Publicar documentos selecionados</h3>
      <p>
        Selecione PDFs desta página que tenham uma preparação salva. Cada jogo
        será publicado separadamente; falhas não desfazem os demais.
      </p>
      {error && <p role="alert">{error}</p>}
      <fieldset disabled={!p.enabled || busy || unknown}>
        <legend>Selecionar documentos para conferir</legend>
        {p.sources.map((s) => (
          <label key={s.id}>
            <input
              type="checkbox"
              disabled={!s.ready}
              aria-label={`Selecionar ${s.filename} para publicação`}
              checked={selection.includes(s.id)}
              onChange={(e) => {
                setSelection((old) =>
                  e.target.checked
                    ? [...old, s.id]
                    : old.filter((id) => id !== s.id),
                );
                setItems([]);
              }}
            />{" "}
            {s.filename}
            {s.ready ? "" : " · envio incompleto"}
          </label>
        ))}
      </fieldset>
      <div className="competition-actions">
        <button
          disabled={!p.enabled || busy || !selected.length || unknown}
          onClick={() => void check()}
        >
          Conferir selecionados
        </button>
        {items.length > 0 && (
          <button
            disabled={!p.enabled || busy || !remaining}
            onClick={() =>
              void publish(
                items.filter((i) => ["ready", "waiting"].includes(i.state)),
              )
            }
          >
            {items.some((i) => i.state !== "ready")
              ? "Continuar publicação"
              : "Confirmar e publicar selecionados"}
          </button>
        )}
      </div>
      <p role="status" ref={summary} tabIndex={-1}>
        {busy
          ? "Processando um documento por vez…"
          : items.length
            ? `${published} ${published === 1 ? "publicado" : "publicados"}; ${review} precisa de revisão; ${uncertain} envio(s) sem confirmação; ${remaining} aguardando publicação.`
            : `${selected.length} documento(s) selecionado(s).`}
      </p>
      <ol className="pdf-jobs">
        {items.map((i) => (
          <li key={i.source.id}>
            <strong>{i.source.filename}</strong>
            {i.game && (
              <p>
                {i.game.home.name} × {i.game.away.name} ·{" "}
                {i.game.date ?? "Data a definir"} · jogo {i.game.id.slice(-8)}
              </p>
            )}
            <p
              role={
                i.state === "review" || i.state === "uncertain"
                  ? "alert"
                  : undefined
              }
            >
              {i.message}
            </p>
            {i.state === "published" && i.command && (
              <a
                href={`/resultado.html#${i.command.gameId}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Ver resultado de {i.source.filename}
              </a>
            )}
            {i.state === "uncertain" && (
              <button
                disabled={busy || !p.enabled}
                onClick={() => void publish([i])}
              >
                Repetir publicação de {i.source.filename}
              </button>
            )}
            {i.state === "review" && (
              <button
                disabled={busy || !p.enabled}
                onClick={() => {
                  if (mayLeave()) p.onReview(i.source.id);
                }}
              >
                Revisar preparação de {i.source.filename}
              </button>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
