import { useEffect, useRef, useState } from "react";
import {
  aggregate,
  change,
  undo,
  redo,
  periodLabel,
  periodColor,
  validateSheet,
  type Sheet,
  type Side,
} from "../domain/scoresheet";
import { Badge, Field, Heading, disputeLabel, type ScreenProps } from "../ui";
import { preparePublication } from "./publication";
import { orderedActions, editAction, deleteAction } from "./actions";

export function ScoresheetWorkspace({
  data,
  update,
  commit,
  notify,
  go,
  dispute,
}: ScreenProps) {
  const sheet = data.sheet.present;
  const totals = aggregate(sheet);
  const previous = data.publications
    .filter((p) => p.id === data.game.id && p.source === "sheet")
    .at(-1);
  const [home, setHome] = useState(data.game.home);
  const [away, setAway] = useState(data.game.away);
  const [period, setPeriod] = useState(1);
  const [side, setSide] = useState<Side>("home");
  const [target, setTarget] = useState(
    sheet.roster.find((r) => r.side === "home")?.jersey ?? "",
  );
  const [code, setCode] = useState("");
  const [order, setOrder] = useState<"entry" | "period">("entry");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const editing = sheet.events.find((event) => event.id === editingId);
  const deleting = sheet.events.find((event) => event.id === deletingId);
  const visibleActions = orderedActions(sheet, order);
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");
  const [review, setReview] = useState(false);
  const [person, setPerson] = useState({
    side: "home" as Side,
    name: "",
    jersey: "",
  });
  const codeRef = useRef<HTMLInputElement>(null);
  const targetRef = useRef<HTMLInputElement>(null);
  const periodRef = useRef<HTMLSelectElement>(null);
  const deleteConfirmRef = useRef<HTMLHeadingElement>(null);
  const focusTarget = () => {
    targetRef.current?.focus();
    targetRef.current?.select();
  };
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (
        !event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.isComposing
      )
        return;
      const key = event.key.toLowerCase();
      if (!["a", "b", "q", "1", "2", "3", "4"].includes(key)) return;
      event.preventDefault();
      if (event.repeat) return;
      if (key === "q") {
        periodRef.current?.focus();
        return;
      }
      if (key === "a" || key === "b") setSide(key === "a" ? "home" : "away");
      else setPeriod(Number(key));
      targetRef.current?.focus();
      targetRef.current?.select();
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  useEffect(() => {
    deleteConfirmRef.current?.focus();
  }, [deletingId]);
  const mutate = (next: Sheet) => {
    try {
      update({ ...data, sheet: change(data.sheet, next) });
      setError("");
      setReview(false);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  };
  const checkedTarget = () => {
    const value = target.trim().toUpperCase();
    if (
      !["B", "C"].includes(value) &&
      !sheet.roster.some((slot) => slot.side === side && slot.jersey === value)
    ) {
      setError(
        "Camisa não relacionada à equipe selecionada. Confira a camisa ou use B/C.",
      );
      focusTarget();
      return null;
    }
    setTarget(value);
    return value;
  };
  const advanceToCode = () => {
    if (checkedTarget() === null) return;
    setError("");
    codeRef.current?.focus();
    codeRef.current?.select();
  };
  const addEntry = () => {
    const entryTarget = checkedTarget();
    if (entryTarget === null) return;
    if (editingId) {
      try {
        if (
          mutate(
            editAction(sheet, editingId, {
              side,
              period,
              target: entryTarget,
              code,
            }),
          )
        ) {
          setEditingId(null);
          setCode("");
          focusTarget();
        } else {
          codeRef.current?.focus();
          codeRef.current?.select();
        }
      } catch (e) {
        setError((e as Error).message);
        codeRef.current?.focus();
        codeRef.current?.select();
      }
      return;
    }
    const next = structuredClone(sheet);
    const slot = next.roster.find(
      (r) => r.side === side && r.jersey === entryTarget,
    );
    if (slot) slot.played = true;
    next.events.push({
      id: crypto.randomUUID(),
      side,
      period,
      target: entryTarget,
      code: code.trim().toUpperCase(),
    });
    if (mutate(next)) {
      setCode("");
      focusTarget();
    } else {
      codeRef.current?.focus();
      codeRef.current?.select();
    }
  };
  const createGame = () => {
    if (!home.trim() || !away.trim() || home.trim() === away.trim()) {
      setError("Informe duas equipes diferentes.");
      return;
    }
    const registrations = structuredClone(data.registrations);
    let registrationId = 20;
    const roster: Sheet["roster"] = [];
    for (const [side, name] of [
      ["home", home],
      ["away", away],
    ] as const) {
      let reg = registrations.find(
        (r) => r.dispute === dispute && r.name === name.trim(),
      );
      if (!reg) {
        reg = {
          id: crypto.randomUUID(),
          dispute,
          globalTeam: name.trim(),
          name: name.trim(),
          players: [],
        };
        registrations.push(reg);
      }
      const numericId = registrationId++;
      reg.players.forEach((p) =>
        roster.push({
          rosterEntryId: p.id,
          registrationId: numericId,
          side,
          jersey: p.jersey,
          played: false,
        }),
      );
    }
    const next: Sheet = {
      rulesVersion: "FIBA_2024",
      periods: 4,
      roster,
      coachPlayer: { home: null, away: null },
      events: [],
    };
    update({
      ...data,
      registrations,
      fallback: undefined,
      gameDrafts: [
        ...(data.gameDrafts ?? []).filter((d) => d.game.id !== data.game.id),
        { game: data.game, sheet: data.sheet, fallback: data.fallback },
      ],
      game: {
        id: crypto.randomUUID(),
        home: home.trim(),
        away: away.trim(),
        dispute,
      },
      sheet: { present: next, past: [], future: [] },
    });
    setPeriod(1);
    setError("");
    setReview(false);
    notify(
      "Confronto preparado. O trabalho anterior está disponível em Jogos. Confira os relacionados e salve o rascunho.",
    );
  };
  const addRelated = () => {
    if (!person.name.trim() || !/^(00|0|[1-9][0-9]?)$/.test(person.jersey)) {
      setError("Informe o nome e uma camisa válida para o novo relacionado.");
      return;
    }
    const teamRoster = sheet.roster.filter((r) => r.side === person.side);
    if (
      teamRoster.length >= 12 ||
      teamRoster.some((r) => r.jersey === person.jersey)
    ) {
      setError("Limite de 12 relacionados ou camisa repetida nesta equipe.");
      return;
    }
    const name = person.side === "home" ? data.game.home : data.game.away;
    const id =
      Math.max(
        10,
        ...data.registrations.flatMap((r) => r.players.map((p) => p.id)),
        ...sheet.roster.map((r) => r.rosterEntryId),
      ) + 1;
    const next = {
      ...sheet,
      roster: [
        ...sheet.roster,
        {
          rosterEntryId: id,
          registrationId:
            teamRoster[0]?.registrationId ?? (person.side === "home" ? 1 : 2),
          side: person.side,
          jersey: person.jersey,
          played: false,
        },
      ],
    };
    update({
      ...data,
      registrations: data.registrations.map((r) =>
        r.dispute === data.game.dispute && r.name === name
          ? {
              ...r,
              players: [
                ...r.players,
                { id, name: person.name.trim(), jersey: person.jersey },
              ],
            }
          : r,
      ),
      sheet: {
        present: next,
        past: [...data.sheet.past.slice(-49), sheet],
        future: [],
      },
    });
    setPerson({ ...person, name: "", jersey: "" });
    setError("");
  };
  const preview = () => {
    try {
      if (previous && reason.trim().length < 10)
        throw new Error(
          "Informe um motivo de revisão com pelo menos 10 caracteres.",
        );
      preparePublication(data, reason);
      setReview(true);
      setError("");
    } catch (e) {
      setError((e as Error).message);
      setReview(false);
    }
  };
  const publish = async () => {
    try {
      const next = preparePublication(data, reason);
      if (
        await commit(
          next,
          previous ? "Resultado corrigido" : "Súmula confirmada",
        )
      ) {
        setReview(false);
        notify(
          previous
            ? "Resultado republicado na simulação. A versão anterior foi mantida."
            : "Jogo confirmado e publicado na simulação.",
        );
      }
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const playerName = (id: number) =>
    data.registrations.flatMap((r) => r.players).find((p) => p.id === id)
      ?.name ??
    `Atleta #${sheet.roster.find((r) => r.rosterEntryId === id)?.jersey}`;
  return (
    <section>
      <button className="back-link" onClick={() => go("/jogos")}>
        ← Voltar aos jogos
      </button>
      <Heading
        eyebrow={disputeLabel(data, data.game.dispute)}
        title="Súmula por teclado"
      >
        <Badge tone={previous ? "success" : "neutral"}>
          {previous ? `Publicado · versão ${previous.version}` : "Rascunho"}
        </Badge>
      </Heading>
      <p className="lead">
        Confira os relacionados, transcreva as ações e publique o resultado
        neste percurso.
      </p>
      <details className="game-setup" open={data.game.dispute !== dispute}>
        <summary>Selecionar ou criar confronto nesta área</summary>
        <div className="inline-panel">
          <div className="form-grid">
            <Field id="game-home" label="Equipe A">
              <input
                id="game-home"
                list="game-teams"
                value={home}
                onChange={(e) => setHome(e.target.value)}
              />
            </Field>
            <Field id="game-away" label="Equipe B">
              <input
                id="game-away"
                list="game-teams"
                value={away}
                onChange={(e) => setAway(e.target.value)}
              />
            </Field>
          </div>
          <datalist id="game-teams">
            {data.registrations
              .filter((r) => r.dispute === dispute)
              .map((r) => (
                <option key={r.id}>{r.name}</option>
              ))}
          </datalist>
          <p>
            Destino do novo confronto: {disputeLabel(data, dispute)}. Equipes
            ausentes podem ser criadas aqui.
          </p>
          <button onClick={createGame}>Preparar este confronto</button>
        </div>
      </details>
      <section className="source-choice">
        <details>
          <summary>Fonte do resultado e revisão de divergência</summary>
          <p>
            Fonte atual: súmula manual. O exemplo abaixo permite avaliar uma
            divergência com um PDF, sem substituir fontes silenciosamente.
          </p>
          <button
            onClick={() => {
              update({
                ...data,
                fallback: { required: true, decided: false, reason: "" },
              });
              setReview(false);
            }}
          >
            Demonstrar divergência com PDF de exemplo
          </button>
        </details>
        {data.fallback?.required && (
          <div className="confirmation">
            <h2>Divergência entre PDF e súmula</h2>
            <p>
              O PDF de exemplo é a fonte primária. Para usar a transcrição
              manual, registre uma decisão explícita com justificativa. O
              conteúdo das fontes continua preservado nesta avaliação.
            </p>
            <Field id="fallback-reason" label="Justificativa do fallback *">
              <textarea
                id="fallback-reason"
                rows={2}
                maxLength={500}
                value={data.fallback.reason}
                onChange={(e) => {
                  update({
                    ...data,
                    fallback: {
                      required: true,
                      decided: false,
                      reason: e.target.value,
                    },
                  });
                  setReview(false);
                }}
              />
            </Field>
            <div className="actions">
              <button
                className="primary"
                onClick={() => {
                  if ((data.fallback?.reason.trim().length ?? 0) < 10) {
                    setError("Justifique o fallback com 10 a 500 caracteres.");
                    return;
                  }
                  update({
                    ...data,
                    fallback: { ...data.fallback!, decided: true },
                  });
                  setError("");
                }}
              >
                Usar súmula como fallback
              </button>
              <button
                onClick={() => {
                  update({ ...data, fallback: undefined });
                  setReview(false);
                }}
              >
                Cancelar esta demonstração
              </button>
            </div>
            {data.fallback.decided && (
              <p className="success-text">
                Decisão registrada. A justificativa acompanhará a confirmação.
              </p>
            )}
          </div>
        )}
      </section>
      <div className="scoreboard" aria-label="Placar da súmula">
        <div>
          <span>Equipe A</span>
          <strong>{data.game.home}</strong>
        </div>
        <div className="score" aria-live="polite">
          {totals.teams.home.points}
          <span>×</span>
          {totals.teams.away.points}
        </div>
        <div>
          <span>Equipe B</span>
          <strong>{data.game.away}</strong>
        </div>
        <div className="period-scores">
          {Array.from({ length: sheet.periods }, (_, i) => (
            <span key={i}>
              <b>{periodLabel(i + 1)}</b>
              {totals.teams.home.periods[i]} : {totals.teams.away.periods[i]}
            </span>
          ))}
        </div>
      </div>
      <details className="related" open>
        <summary>
          <strong>Relacionados, camisas e participação</strong>
          <span className="muted">{sheet.roster.length} atletas</span>
        </summary>
        <p>
          Estar relacionado não significa ter jogado. Marque também quem entrou
          em quadra sem registrar ações.
        </p>
        <div className="roster-columns">
          {(["home", "away"] as const).map((side) => (
            <section key={side}>
              <h3>{side === "home" ? data.game.home : data.game.away}</h3>
              <div
                className="table-scroll"
                role="region"
                aria-label={`Relacionados ${side === "home" ? "A" : "B"}`}
                tabIndex={0}
              >
                <table>
                  <thead>
                    <tr>
                      <th>Camisa</th>
                      <th>Atleta</th>
                      <th>Jogou</th>
                      <th>PTS</th>
                      <th>FC</th>
                      <th>Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sheet.roster
                      .filter((r) => r.side === side)
                      .map((r) => {
                        const total = totals.players.find(
                          (p) => p.rosterEntryId === r.rosterEntryId,
                        )!;
                        return (
                          <tr key={r.rosterEntryId}>
                            <td>
                              <input
                                className="jersey"
                                aria-label={`Camisa de ${playerName(r.rosterEntryId)}`}
                                disabled={!!previous}
                                value={r.jersey}
                                onChange={(e) => {
                                  const next = {
                                    ...sheet,
                                    roster: sheet.roster.map((x) =>
                                      x.rosterEntryId === r.rosterEntryId
                                        ? { ...x, jersey: e.target.value }
                                        : x,
                                    ),
                                  };
                                  update({
                                    ...data,
                                    sheet: { ...data.sheet, present: next },
                                  });
                                  setReview(false);
                                }}
                              />
                            </td>
                            <th scope="row">{playerName(r.rosterEntryId)}</th>
                            <td>
                              <input
                                type="checkbox"
                                aria-label={`${playerName(r.rosterEntryId)} jogou`}
                                checked={r.played}
                                onChange={(e) =>
                                  mutate({
                                    ...sheet,
                                    roster: sheet.roster.map((x) =>
                                      x.rosterEntryId === r.rosterEntryId
                                        ? { ...x, played: e.target.checked }
                                        : x,
                                    ),
                                  })
                                }
                              />
                            </td>
                            <td className="number">{total.points}</td>
                            <td className="number">{total.fouls}</td>
                            <td>
                              {total.status === "eligible"
                                ? "Apto"
                                : total.status === "excluded"
                                  ? "Excluído"
                                  : total.status}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
              <Field id={`coach-${side}`} label="Atleta-treinador">
                <select
                  id={`coach-${side}`}
                  disabled={!!previous}
                  value={sheet.coachPlayer[side] ?? ""}
                  onChange={(e) =>
                    mutate({
                      ...sheet,
                      coachPlayer: {
                        ...sheet.coachPlayer,
                        [side]: e.target.value ? Number(e.target.value) : null,
                      },
                    })
                  }
                >
                  <option value="">Nenhum relacionado</option>
                  {sheet.roster
                    .filter((r) => r.side === side)
                    .map((r) => (
                      <option key={r.rosterEntryId} value={r.rosterEntryId}>
                        #{r.jersey} · {playerName(r.rosterEntryId)}
                      </option>
                    ))}
                </select>
              </Field>
            </section>
          ))}
        </div>
        {!previous && (
          <details>
            <summary>Adicionar atleta relacionado sem sair da súmula</summary>
            <div className="inline-panel">
              <div className="form-grid">
                <Field id="related-side" label="Equipe do atleta">
                  <select
                    id="related-side"
                    value={person.side}
                    onChange={(e) =>
                      setPerson({ ...person, side: e.target.value as Side })
                    }
                  >
                    <option value="home">{data.game.home}</option>
                    <option value="away">{data.game.away}</option>
                  </select>
                </Field>
                <Field id="related-name" label="Nome do atleta">
                  <input
                    id="related-name"
                    value={person.name}
                    onChange={(e) =>
                      setPerson({ ...person, name: e.target.value })
                    }
                  />
                </Field>
                <Field id="related-jersey" label="Camisa">
                  <input
                    id="related-jersey"
                    value={person.jersey}
                    onChange={(e) =>
                      setPerson({ ...person, jersey: e.target.value })
                    }
                  />
                </Field>
              </div>
              <button onClick={addRelated}>Adicionar relacionado</button>
            </div>
          </details>
        )}
        {previous && (
          <p className="note">
            Relacionados e camisas confirmados são preservados. A participação
            pode ser corrigida.
          </p>
        )}
      </details>
      <section className="entry-workspace">
        <div className="section-title">
          <h2>Lançar ações</h2>
          <div className="actions">
            <button
              disabled={!data.sheet.past.length}
              onClick={() => {
                update({ ...data, sheet: undo(data.sheet) });
                setEditingId(null);
                setDeletingId(null);
                setCode("");
                setReview(false);
              }}
            >
              ↶ Desfazer
            </button>
            <button
              disabled={!data.sheet.future.length}
              onClick={() => {
                update({ ...data, sheet: redo(data.sheet) });
                setEditingId(null);
                setDeletingId(null);
                setCode("");
                setReview(false);
              }}
            >
              ↷ Refazer
            </button>
          </div>
        </div>
        {editing && (
          <p className="note" role="status">
            Editando ação{" "}
            {sheet.events.findIndex((event) => event.id === editing.id) + 1} ·{" "}
            {periodLabel(editing.period)} · {editing.target} · {editing.code}.
            Altere os campos e salve.
          </p>
        )}
        <form
          className={`entry-form period-${periodColor(period)}`}
          onSubmit={(e) => {
            e.preventDefault();
            addEntry();
          }}
        >
          <Field id="entry-period" label="Período">
            <select
              id="entry-period"
              ref={periodRef}
              aria-keyshortcuts="Alt+1 Alt+2 Alt+3 Alt+4 Alt+Q"
              value={period}
              onChange={(e) => setPeriod(Number(e.target.value))}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  if (!event.repeat) focusTarget();
                }
              }}
            >
              {Array.from({ length: sheet.periods }, (_, i) => (
                <option key={i} value={i + 1}>
                  {periodLabel(i + 1)}
                </option>
              ))}
            </select>
          </Field>
          <Field id="entry-side" label="Equipe">
            <select
              id="entry-side"
              aria-keyshortcuts="Alt+A Alt+B"
              value={side}
              onChange={(e) => {
                const next = e.target.value as Side;
                setSide(next);
                setTarget(
                  sheet.roster.find((r) => r.side === next)?.jersey ?? "",
                );
              }}
            >
              <option value="home">A · {data.game.home}</option>
              <option value="away">B · {data.game.away}</option>
            </select>
          </Field>
          <Field id="entry-target" label="Camisa / alvo">
            <input
              id="entry-target"
              ref={targetRef}
              list="entry-targets"
              enterKeyHint="next"
              autoComplete="off"
              aria-describedby="entry-keyboard"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  if (!event.repeat) advanceToCode();
                }
              }}
              placeholder="7, 00, B ou C"
            />
          </Field>
          <datalist id="entry-targets">
            {sheet.roster
              .filter((r) => r.side === side)
              .map((r) => (
                <option key={r.rosterEntryId}>{r.jersey}</option>
              ))}
            <option>B</option>
            <option>C</option>
          </datalist>
          <Field id="entry-code" label="Código">
            <input
              id="entry-code"
              ref={codeRef}
              enterKeyHint="done"
              value={code}
              maxLength={3}
              aria-invalid={!!error}
              aria-describedby={error ? "sheet-error" : "entry-help"}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  if (!event.repeat) addEntry();
                }
              }}
              autoComplete="off"
              placeholder="2, 3, P2…"
            />
          </Field>
          <button type="submit" className="primary">
            {editingId ? "Salvar alteração" : "Lançar ação ↵"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setCode("");
                setError("");
                codeRef.current?.focus();
              }}
            >
              Cancelar edição
            </button>
          )}
        </form>
        <p id="entry-keyboard" className="muted">
          Camisa → Enter → ação → Enter. Após lançar, a camisa fica selecionada
          para digitar a próxima ou repetir com Enter. Alt+A / Alt+B: equipe ·
          Alt+1 a Alt+4: quarto · Alt+Q: selecionar período, incluindo
          prorrogações.
        </p>
        <p id="entry-help" className="muted">
          Pontos: 1, 2, 3 · Faltas: P, P1–P3, Pc, T1, Tc, U, U1–U3, Uc, D,
          D1–D3, Dc · Banco: B1, B2, Bc · Técnico: C1, Cc, D. Sem cronômetro ou
          tentativas erradas.
        </p>
        <div className="actions">
          <button
            disabled={sheet.periods >= 12}
            onClick={() => {
              if (mutate({ ...sheet, periods: sheet.periods + 1 }))
                setPeriod(sheet.periods + 1);
            }}
          >
            + Prorrogação ({Math.max(0, sheet.periods - 4)}/8)
          </button>
          <small>O fechamento exige empate antes de cada prorrogação.</small>
        </div>
        {error && (
          <p id="sheet-error" role="alert" className="notice error">
            {error}
          </p>
        )}
        <div className="action-order">
          <Field id="actions-order" label="Ordem das ações">
            <select
              id="actions-order"
              value={order}
              onChange={(event) =>
                setOrder(event.target.value as "entry" | "period")
              }
            >
              <option value="entry">Ordem de lançamento</option>
              <option value="period">
                Por quarto: Q1 → Q2 → Q3 → Q4 → prorrogações
              </option>
            </select>
          </Field>
          <p className="muted">
            Q1 e Q3: vermelho suave · Q2 e Q4: azul suave. O número identifica a
            ordem original de lançamento.
          </p>
        </div>
        {deleting && (
          <section
            className="confirmation"
            aria-label="Excluir ação selecionada"
          >
            <h3 ref={deleteConfirmRef} tabIndex={-1}>
              Excluir ação{" "}
              {sheet.events.findIndex((event) => event.id === deleting.id) + 1}?
            </h3>
            <p>
              {periodLabel(deleting.period)} ·{" "}
              {deleting.side === "home" ? data.game.home : data.game.away} ·{" "}
              {deleting.target} · {deleting.code}. O placar e as faltas serão
              recalculados. A participação será mantida e você poderá desfazer.
            </p>
            <div className="actions">
              <button
                onClick={() => {
                  try {
                    if (mutate(deleteAction(sheet, deleting.id))) {
                      if (editingId === deleting.id) {
                        setEditingId(null);
                        setCode("");
                      }
                      setDeletingId(null);
                      codeRef.current?.focus();
                    }
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                Confirmar exclusão
              </button>
              <button
                onClick={() => {
                  setDeletingId(null);
                  codeRef.current?.focus();
                }}
              >
                Cancelar exclusão
              </button>
            </div>
          </section>
        )}
        <div
          className="table-scroll"
          role="region"
          aria-label="Ações da súmula"
          tabIndex={0}
        >
          <table>
            <caption>{sheet.events.length} ações registradas</caption>
            <thead>
              <tr>
                <th>#</th>
                <th>Período</th>
                <th>Equipe</th>
                <th>Camisa / alvo</th>
                <th>Ação</th>
                <th>Alterar</th>
              </tr>
            </thead>
            <tbody>
              {sheet.events.length ? (
                visibleActions.map(({ event: e, sequence }) => (
                  <tr key={e.id} className={`period-${periodColor(e.period)}`}>
                    <td>{sequence}</td>
                    <td>{periodLabel(e.period)}</td>
                    <td>
                      {e.side === "home" ? data.game.home : data.game.away}
                    </td>
                    <td>{e.target}</td>
                    <td>
                      <strong>{e.code}</strong>
                    </td>
                    <td>
                      <div className="actions">
                        <button
                          aria-label={`Editar ação ${sequence}`}
                          onClick={() => {
                            setEditingId(e.id);
                            setDeletingId(null);
                            setPeriod(e.period);
                            setSide(e.side);
                            setTarget(e.target);
                            setCode(e.code);
                            setError("");
                            setReview(false);
                            codeRef.current?.focus();
                          }}
                        >
                          Editar
                        </button>
                        <button
                          aria-label={`Excluir ação ${sequence}`}
                          onClick={() => {
                            setDeletingId(e.id);
                            setError("");
                          }}
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="muted">
                    Nenhuma ação. Digite um código e pressione Enter para
                    começar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      {previous && (
        <section className="form-section">
          <h2>Correção de resultado</h2>
          <Field id="revision-reason" label="Motivo da revisão *">
            <textarea
              id="revision-reason"
              rows={2}
              minLength={10}
              maxLength={500}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setReview(false);
              }}
              placeholder="Explique o que foi corrigido (10–500 caracteres)."
            />
          </Field>
          <p>
            Versão anterior preservada: {previous.home} {previous.score[0]} ×{" "}
            {previous.score[1]} {previous.away}.
          </p>
        </section>
      )}
      <div className="publish-bar">
        <div>
          <strong>
            {previous ? "Revisar e republicar" : "Conferir e publicar"}
          </strong>
          <p>Minutos e tentativas não são inferidos da súmula.</p>
          {editingId && (
            <p role="status">
              Salve ou cancele a edição da ação antes de salvar o rascunho ou
              revisar o resultado.
            </p>
          )}
        </div>
        <div className="actions">
          <button
            disabled={!!editingId}
            onClick={() => {
              try {
                validateSheet(sheet);
                void commit(data, "Súmula em rascunho");
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Salvar rascunho da súmula
          </button>
          <button className="primary" disabled={!!editingId} onClick={preview}>
            Revisar resultado
          </button>
        </div>
      </div>
      {review && (
        <section className="confirmation" aria-label="Prévia da publicação">
          <h2>
            {previous ? "Prévia de impacto da correção" : "Conferência final"}
          </h2>
          <p>
            <strong>
              Placar:{" "}
              {previous ? `${previous.score[0]} × ${previous.score[1]} → ` : ""}
              {totals.teams.home.points} × {totals.teams.away.points}
            </strong>
          </p>
          <ul>
            <li>
              Estatísticas de pontos, faltas e participação deste jogo serão
              atualizadas.
            </li>
            <li>Classificação e chave: não configuradas neste exemplo.</li>
            <li>
              Versão {previous ? previous.version + 1 : 1} na consulta
              demonstrativa; os demais rascunhos continuam sem publicação.
            </li>
          </ul>
          <div className="actions">
            <button className="primary" onClick={() => void publish()}>
              {previous ? "Salvar e republicar" : "Confirmar e publicar"}
            </button>
            <button onClick={() => setReview(false)}>Voltar à súmula</button>
          </div>
        </section>
      )}
      {previous && (
        <div className="publication-history">
          <h2>Versões confirmadas</h2>
          <ul>
            {data.publications
              .filter((p) => p.id === data.game.id)
              .map((p) => (
                <li key={p.version}>
                  Versão {p.version} · {p.score[0]} × {p.score[1]}
                  {p.reason ? ` · ${p.reason}` : ""}
                </li>
              ))}
          </ul>
          <button onClick={() => go("/publico")}>
            Ver resultado público ↗
          </button>
        </div>
      )}
    </section>
  );
}
