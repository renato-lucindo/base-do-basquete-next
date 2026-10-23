import { useEffect, useRef, useState } from "react";
import { api, isSessionFailure } from "../competition/api";
import type { RegistrationSnapshot } from "../teams/contract";
import {
  rosterListingSchema,
  type RosterSnapshot,
} from "../people/roster-contract";
import {
  textReviewListingSchema,
  TEXT_LIMIT,
  type TextReview,
} from "./contract";
import { useTextImport } from "./use-text-import";
import { ImportTable } from "./table";
import { TargetPicker } from "./target-picker";
import "./workspace.css";
type Props = {
  disputeId: string;
  gender: "masculino" | "feminino";
  enabled: boolean;
  canEdit?: boolean;
  registration?: RegistrationSnapshot;
  guard: { current: () => boolean };
  onSessionLost: () => void;
  onSaved: () => void;
  onClose: () => void;
};
export function TextImportWorkspace(props: Props) {
  const model = useTextImport({
    ...props,
    registrationId: props.registration?.id,
  });
  const [target, setTarget] = useState<TextReview["target"]>(() =>
    props.registration
      ? {
          kind: "registration",
          registrationId: props.registration.id,
          version: props.registration.version,
        }
      : {
          kind: "newTeam",
          teamId: crypto.randomUUID(),
          registrationId: crypto.randomUUID(),
          teamName: "",
          registrationName: "",
        },
  );
  const [saved, setSaved] = useState<
      ReturnType<typeof textReviewListingSchema.parse>
    >({ items: [], hasMore: false }),
    [offset, setOffset] = useState(0),
    [roster, setRoster] = useState<RosterSnapshot[]>([]),
    [rosterComplete, setRosterComplete] = useState(false),
    [error, setError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null),
    alert = useRef<HTMLParagraphElement>(null);
  const effectiveTarget = model.state?.document.target ?? target;
  const registrationId =
    effectiveTarget.kind === "registration"
      ? effectiveTarget.registrationId
      : null;
  useEffect(() => {
    props.guard.current = model.mayLeave;
    return () => {
      props.guard.current = () => true;
    };
  });
  useEffect(() => {
    if (props.enabled) heading.current?.focus();
  }, [props.enabled, model.state?.document.id]);
  useEffect(() => {
    if (props.enabled && (error || model.error)) alert.current?.focus();
  }, [props.enabled, error, model.error]);
  useEffect(() => {
    if (!props.enabled || model.state) return;
    let active = true;
    const controller = new AbortController();
    void api(
      `/api/text-import?disputeId=${props.disputeId}&offset=${offset}`,
      textReviewListingSchema,
      undefined,
      controller.signal,
    )
      .then((value) => {
        if (active) setSaved(value);
      })
      .catch((failure) => {
        if (active) {
          if (isSessionFailure(failure)) props.onSessionLost();
          else setError("Não foi possível carregar as conferências salvas.");
        }
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [props.enabled, props.disputeId, offset, !!model.state]);
  useEffect(() => {
    setRoster([]);
    setRosterComplete(false);
    if (!props.enabled || !registrationId) return;
    let active = true;
    const controller = new AbortController();
    void (async () => {
      const all: RosterSnapshot[] = [];
      for (let start = 0; start < 2000; start += 20) {
        const page = await api(
          `/api/roster?registrationId=${registrationId}&activeOnly=1&offset=${start}`,
          rosterListingSchema,
          undefined,
          controller.signal,
        );
        all.push(...page.items);
        if (!page.hasMore) {
          if (active) {
            setRoster(all);
            setRosterComplete(true);
          }
          return;
        }
      }
      if (active) {
        setRoster(all);
        setError(
          "A comparação do elenco está incompleta. Consulte o elenco completo antes de avaliar ausências.",
        );
      }
    })().catch((failure) => {
      if (active) {
        if (isSessionFailure(failure)) props.onSessionLost();
        else setError("Não foi possível comparar o elenco atual.");
      }
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, [props.enabled, registrationId, model.state?.results.length]);
  const used = new Set(
    model.state?.document.rows.flatMap((r) =>
      r.decision ? [r.decision.personId] : [],
    ) ?? [],
  );
  const complete = model.state?.results.length ?? 0,
    disabled = model.locked || props.canEdit === false;
  const readyTarget =
    effectiveTarget.kind === "registration" ||
    (effectiveTarget.registrationName.trim() &&
      (effectiveTarget.kind !== "newTeam" || effectiveTarget.teamName.trim()));
  return (
    <section className="text-import-workspace">
      <div className="competition-title">
        <h4 ref={heading} tabIndex={-1}>
          Importar elenco
          {props.registration
            ? ` de ${props.registration.name}`
            : " de uma equipe"}
        </h4>
        <button
          type="button"
          className="secondary"
          disabled={model.busy}
          onClick={() => {
            if (model.mayLeave()) props.onClose();
          }}
        >
          Voltar ao elenco
        </button>
      </div>
      <p>
        Cole uma equipe por vez. Confira as identidades e corrija os campos
        antes de confirmar. Nome é obrigatório; camisa e demais dados são
        opcionais.
      </p>
      {(error || model.error) && (
        <p ref={alert} tabIndex={-1} role="alert" className="access-error">
          {error || model.error}
        </p>
      )}
      {!props.registration && (
        <TargetPicker
          value={effectiveTarget}
          onChange={(value) =>
            model.state ? model.changeTarget(value) : setTarget(value)
          }
          disputeId={props.disputeId}
          disabled={disabled || complete > 0}
          enabled={props.enabled}
          onSessionLost={props.onSessionLost}
        />
      )}
      {!model.state ? (
        <>
          <label>
            Texto do elenco
            <textarea
              maxLength={TEXT_LIMIT}
              rows={9}
              value={model.text}
              disabled={disabled}
              placeholder={
                'Equipe: Lobos\n12 - Ricardo Souza - 193 - 1999\nPato Ganso - "PH" - Canhoto'
              }
              onChange={(event) => model.setText(event.target.value)}
            />
          </label>
          <p>
            Separe os campos por hífen, ponto e vírgula ou barra vertical.
            Aceita altura em metros ou centímetros, nascimento completo ou ano,
            até duas posições e registro federativo de seis dígitos.
          </p>
          <p>
            Sem unidade: números de 10 a 150 sugerem peso em kg; acima de 150,
            altura em cm. Para evitar ambiguidade, use kg, cm ou m. Em datas com
            ano de dois dígitos, 00–29 significa 2000–2029 e 30–99 significa
            1930–1999.
          </p>
          <button
            type="button"
            disabled={disabled || !model.text.trim()}
            onClick={() => void model.interpret(effectiveTarget)}
          >
            Interpretar texto
          </button>
          <details>
            <summary>Retomar uma conferência salva</summary>
            <ul>
              {saved.items
                .filter(
                  (item) =>
                    !props.registration ||
                    item.registrationId === props.registration.id,
                )
                .map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      disabled={model.busy}
                      onClick={() => void model.load(item.id)}
                    >
                      Retomar conferência ·{" "}
                      {item.teamName ?? "Destino em preparação"} ·{" "}
                      {item.confirmedRows}/{item.totalRows} ·{" "}
                      {new Date(item.savedAt).toLocaleString("pt-BR")}
                    </button>
                  </li>
                ))}
            </ul>
            <div className="competition-actions">
              <button
                type="button"
                disabled={!offset}
                onClick={() => setOffset(Math.max(0, offset - 20))}
              >
                Conferências anteriores
              </button>
              <button
                type="button"
                disabled={!saved.hasMore}
                onClick={() => setOffset(offset + 20)}
              >
                Mais conferências
              </button>
            </div>
          </details>
        </>
      ) : (
        <>
          <p role="status">
            {complete} {complete === 1 ? "confirmado" : "confirmados"} ·{" "}
            {model.readyCount} prontos selecionados ·{" "}
            {model.busy
              ? "Aguarde…"
              : model.pending
                ? "Envio não confirmado"
                : model.conflict
                  ? "Conflito de versão"
                  : model.dirty
                    ? "Conferência não salva"
                    : "Conferência salva"}
          </p>
          {model.state.document.issues.length > 0 && (
            <div role="alert">
              {model.state.document.issues.map((issue, index) => (
                <p key={index}>{issue}</p>
              ))}
              <p>Inicie outra conferência com o texto corrigido.</p>
            </div>
          )}
          <p>
            Os dados de nascimento e registro federativo desta conferência são
            privados. O ano público não é preenchido automaticamente.
          </p>
          <p id="text-import-scroll-hint">
            Role a tabela horizontalmente para conferir os demais campos. Use
            Tab e Shift+Tab para percorrer a linha pelo teclado.
          </p>
          <ImportTable model={model} canEdit={props.canEdit} />
          <div className="competition-actions">
            <button
              type="button"
              disabled={disabled || !model.dirty}
              onClick={() => void model.save()}
            >
              Salvar conferência
            </button>
            <button
              type="button"
              className="secondary"
              disabled={disabled}
              onClick={() => void model.search()}
            >
              Buscar correspondências
            </button>
            <button
              type="button"
              disabled={
                disabled ||
                !model.readyCount ||
                !readyTarget ||
                !!model.state.document.issues.length
              }
              onClick={() => void model.confirm()}
            >
              Confirmar selecionados
            </button>
            {model.pending && (
              <button
                type="button"
                disabled={model.busy}
                onClick={() => void model.retry()}
              >
                Repetir o mesmo envio
              </button>
            )}
            {model.conflict && (
              <button
                type="button"
                disabled={model.busy}
                onClick={() => void model.load(model.state!.document.id)}
              >
                Recarregar conferência
              </button>
            )}
            <button
              type="button"
              className="secondary"
              disabled={model.busy}
              onClick={model.reset}
            >
              Importar outro texto
            </button>
          </div>
          {model.pending && (
            <p>
              O resultado do envio ainda é desconhecido. Repita o mesmo envio
              para recuperar o resultado sem duplicar cadastros.
            </p>
          )}
          {registrationId && (
            <details open>
              <summary>Comparação com o elenco atual</summary>
              <p>
                Somente identidades escolhidas permitem comparar com segurança.
                Nenhuma ausência encerra um vínculo automaticamente.
              </p>
              <p>
                {roster.filter((m) => used.has(m.personId)).length} mantidos ·{" "}
                {
                  model.state.document.rows.filter(
                    (r) => r.decision?.kind === "new",
                  ).length
                }{" "}
                novos propostos
              </p>
              {rosterComplete && (
                <>
                  <p>Não selecionados nesta conferência:</p>
                  <ul>
                    {roster
                      .filter((m) => !used.has(m.personId))
                      .map((m) => (
                        <li key={m.id}>{m.person.name}</li>
                      ))}
                  </ul>
                </>
              )}
            </details>
          )}
        </>
      )}
    </section>
  );
}
