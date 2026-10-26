import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { api, ApiFailure, isSessionFailure } from "../competition/api";
import {
  confirmPlayerProfileSchema,
  playerProfileAckSchema,
  playerProfileWorkspaceSchema,
  playerProfileVersionSchema,
  type ConfirmPlayerProfile,
  type PlayerProfileAck,
  type PlayerProfileWorkspace,
} from "./contract";
import type { z } from "zod";
type Props = {
  personId: string;
  enabled: boolean;
  guard: { current: () => boolean };
  onClose: () => void;
  onSessionLost: () => void;
  onSaved: () => void;
};
const labels = {
  name: "Nome",
  nickname: "Apelido",
  publicBirthYear: "Ano de nascimento",
  heightCm: "Altura (cm)",
  weightKg: "Peso (kg)",
  position: "Posição",
  dominantHand: "Mão dominante",
  originCity: "Cidade de origem",
  originState: "Estado de origem",
  biography: "Biografia",
} as const;
const stamp = (s: string) =>
  new Date(s).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
function ProfileFields({
  person,
}: {
  person: PlayerProfileWorkspace["proposal"]["person"];
}) {
  return (
    <dl className="profile-public-fields">
      {Object.entries(labels).map(([field, label]) => {
        const value = person[field as keyof typeof labels];
        return (
          <div key={field}>
            <dt>{label}</dt>
            <dd>
              {value === null
                ? "Não informado"
                : field === "dominantHand"
                  ? { left: "Esquerda", right: "Direita", both: "Ambidestra" }[
                      value as "left" | "right" | "both"
                    ]
                  : String(value)}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
export function ProfilePublicationPanel(p: Props) {
  const [view, setView] = useState<PlayerProfileWorkspace | null>(null),
    [busy, setBusy] = useState(false),
    [reason, setReason] = useState(""),
    [review, setReview] = useState(false),
    [checked, setChecked] = useState(false),
    [error, setError] = useState(""),
    [status, setStatus] = useState(""),
    [offset, setOffset] = useState(0),
    [versionView, setVersionView] = useState<z.infer<
      typeof playerProfileVersionSchema
    > | null>(null);
  const pending = useRef<{
      command: ConfirmPlayerProfile;
      ack: PlayerProfileAck | null;
    } | null>(null),
    alive = useRef(true),
    root = useRef<HTMLElement>(null),
    focus = useRef<
      "heading" | "status" | "error" | "check" | "snapshot" | null
    >(null);
  const path = `/api/people/${p.personId}/profile`,
    locked = busy || !!pending.current || !p.enabled;
  const mayLeave = () =>
    !busy &&
    (!(reason.trim() || pending.current) ||
      window.confirm(
        "Há uma publicação não salva ou um envio não confirmado. Sair desta edição?",
      ));
  useEffect(() => {
    p.guard.current = mayLeave;
    return () => {
      p.guard.current = () => true;
    };
  });
  useEffect(() => {
    if (!reason.trim() && !pending.current) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [reason, locked]);
  useLayoutEffect(() => {
    if (busy || !p.enabled || !focus.current) return;
    root.current
      ?.querySelector<HTMLElement>(`[data-profile-focus="${focus.current}"]`)
      ?.focus();
    focus.current = null;
  }, [view, busy, error, status, review, p.enabled, versionView]);
  useEffect(() => {
    alive.current = true;
    void refresh(0);
    return () => {
      alive.current = false;
    };
  }, [p.personId]);
  function fail(e: unknown) {
    setError(
      e instanceof Error ? e.message : "Não foi possível conferir o perfil.",
    );
    focus.current = "error";
    if (isSessionFailure(e)) p.onSessionLost();
  }
  async function read(page: number) {
    const w = await api(
      `${path}${page ? `?offset=${page}` : ""}`,
      playerProfileWorkspaceSchema,
    );
    if (w.proposal.personId !== p.personId)
      throw new ApiFailure(
        503,
        "A resposta não corresponde ao perfil solicitado.",
      );
    return w;
  }
  async function refresh(page = 0) {
    if (busy || pending.current) return;
    setBusy(true);
    setError("");
    setChecked(false);
    setReview(false);
    setVersionView(null);
    try {
      const w = await read(page);
      if (alive.current) {
        setView(w);
        setOffset(page);
        focus.current = "heading";
      }
    } catch (e) {
      if (alive.current) fail(e);
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  async function showVersion(version: number) {
    if (locked) return;
    setBusy(true);
    setError("");
    setVersionView(null);
    try {
      const v = await api(
        `${path}/versions/${version}`,
        playerProfileVersionSchema,
      );
      if (v.personId !== p.personId || v.version !== version)
        throw new ApiFailure(
          503,
          "A resposta não corresponde à confirmação solicitada.",
        );
      if (alive.current) {
        setVersionView(v);
        focus.current = "snapshot";
      }
    } catch (e) {
      if (alive.current) fail(e);
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  async function recover(ack: PlayerProfileAck) {
    const w = await read(0);
    if (
      w.state.version < ack.version ||
      (w.state.version === ack.version &&
        w.state.confirmedPersonVersion !== ack.personVersion)
    )
      throw new ApiFailure(
        503,
        "Envio confirmado. Ainda não foi possível conferir a leitura salva.",
      );
    if (alive.current) {
      pending.current = null;
      setView(w);
      setOffset(0);
      setReason("");
      setChecked(false);
      setReview(false);
      setStatus(
        w.state.version > ack.version
          ? "Perfil confirmado. Há uma confirmação posterior disponível."
          : "Perfil confirmado.",
      );
      focus.current = "status";
      p.onSaved();
    }
  }
  async function send() {
    if (busy || !p.enabled) return;
    if (!pending.current) {
      if (!view || !review || !checked) return;
      const c = confirmPlayerProfileSchema.safeParse({
        commandId: crypto.randomUUID(),
        personId: p.personId,
        expectedPersonVersion: view.proposal.personVersion,
        expectedPublicationVersion: view.state.version,
        reason,
        acknowledgeImpact: true,
      });
      if (!c.success) {
        fail(
          new Error(
            "Confira os dados e informe motivo de pelo menos3caracteres para uma revisão.",
          ),
        );
        return;
      }
      pending.current = { command: c.data, ack: null };
    }
    setBusy(true);
    setError("");
    setStatus("");
    try {
      if (!pending.current.ack) {
        const c = pending.current.command,
          ack = await api(path, playerProfileAckSchema, c);
        if (
          ack.commandId !== c.commandId ||
          ack.personId !== c.personId ||
          ack.personVersion !== c.expectedPersonVersion ||
          ack.version !== c.expectedPublicationVersion + 1
        )
          throw new ApiFailure(
            503,
            "Não foi possível conferir a confirmação do envio.",
          );
        pending.current.ack = ack;
      }
      await recover(pending.current.ack);
    } catch (e) {
      if (alive.current) {
        if (
          !pending.current?.ack &&
          e instanceof ApiFailure &&
          [400, 409, 413].includes(e.status)
        ) {
          pending.current = null;
          setReview(false);
          setChecked(false);
        }
        fail(e);
      }
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  return (
    <section className="members-workspace profile-publication" ref={root}>
      <div className="competition-title">
        <h4 tabIndex={-1} data-profile-focus="heading">
          Publicação do perfil
        </h4>
        <button
          type="button"
          className="secondary"
          disabled={busy || !p.enabled}
          onClick={() => {
            if (mayLeave()) p.onClose();
          }}
        >
          Voltar ao elenco
        </button>
      </div>
      {error && (
        <p
          className="access-error"
          role="alert"
          tabIndex={-1}
          data-profile-focus="error"
        >
          {error}
        </p>
      )}
      <p role="status" tabIndex={-1} data-profile-focus="status">
        {busy
          ? "Aguarde…"
          : pending.current?.ack
            ? "Envio confirmado. Falta atualizar a leitura salva."
            : pending.current
              ? "Envio não confirmado. Recupere a confirmação com o mesmo envio."
              : status}
      </p>
      {view && (
        <>
          <p>
            Confira os dados salvos que aparecerão na página do atleta.
            Alterações no cadastro têm confirmação própria para atualizar o
            perfil público.
          </p>
          {view.state.sourceChanged && (
            <p>
              O cadastro foi alterado depois da última confirmação. Confira os
              dados atualizados.
            </p>
          )}
          <section role="region" aria-label="Dados públicos do perfil">
            <h5>Dados que serão publicados</h5>
            <ProfileFields person={view.proposal.person} />
          </section>
          <fieldset className="member-editor" disabled={locked}>
            <label>
              Motivo da publicação
              <textarea
                aria-label="Motivo da publicação"
                maxLength={2000}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setChecked(false);
                }}
              />
            </label>
            <p>
              {view.state.version
                ? "Uma revisão exige um motivo de pelo menos3caracteres."
                : "O motivo é opcional na primeira publicação."}
            </p>
            <button
              type="button"
              disabled={!view}
              onClick={() => {
                setReview(true);
                setChecked(false);
                focus.current = "check";
              }}
            >
              Conferir publicação
            </button>
            {review && (
              <>
                <label className="member-checkbox">
                  <input
                    type="checkbox"
                    data-profile-focus="check"
                    checked={checked}
                    onChange={(e) => setChecked(e.target.checked)}
                  />
                  Conferi os dados públicos apresentados
                </label>
                <button
                  type="button"
                  disabled={!checked}
                  onClick={() => void send()}
                >
                  {view.state.version
                    ? "Confirmar revisão do perfil"
                    : "Publicar perfil"}
                </button>
              </>
            )}
          </fieldset>
          {view.state.version > 0 && (
            <p>
              <a
                href={`/atleta.html#${p.personId}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Ver página pública
              </a>
            </p>
          )}
          <h5>Confirmações anteriores</h5>
          {view.state.history.length ? (
            <ol>
              {view.state.history.map((h) => (
                <li key={h.version}>
                  Confirmação {h.version} · {stamp(h.confirmedAt)} ·{" "}
                  {h.reason || "Primeira publicação"}
                  <button
                    type="button"
                    className="secondary"
                    disabled={locked}
                    onClick={() => void showVersion(h.version)}
                  >
                    Ver confirmação {h.version}
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <p>Nenhuma confirmação ainda.</p>
          )}
          <div className="competition-actions">
            <button
              disabled={locked || offset === 0}
              onClick={() => void refresh(Math.max(0, offset - 20))}
            >
              Confirmações anteriores
            </button>
            <button
              disabled={locked || !view.state.hasMore}
              onClick={() => void refresh(offset + 20)}
            >
              Próximas confirmações
            </button>
          </div>
          {versionView && (
            <section
              role="region"
              aria-label={`Dados da confirmação ${versionView.version}`}
            >
              <h5 tabIndex={-1} data-profile-focus="snapshot">
                Confirmação {versionView.version}
              </h5>
              <p>
                {stamp(versionView.confirmedAt)} ·{" "}
                {versionView.reason || "Primeira publicação"}
              </p>
              <p>
                Dados publicados nesta ocasião. A consulta não substitui a
                proposta atual.
              </p>
              <ProfileFields person={versionView.snapshot.person} />
            </section>
          )}
        </>
      )}
      {pending.current ? (
        <button disabled={busy || !p.enabled} onClick={() => void send()}>
          {pending.current.ack
            ? "Atualizar confirmação"
            : "Repetir o mesmo envio"}
        </button>
      ) : (
        <button
          className="secondary"
          disabled={busy || !p.enabled}
          onClick={() => void refresh(offset)}
        >
          Atualizar dados para conferir
        </button>
      )}
    </section>
  );
}
