import { useEffect, useRef, useState } from "react";
import { api, ApiFailure, isSessionFailure } from "../competition/api";
import { saveResultSchema } from "../competition/contract";
import { parseRoster } from "./parse";
import { birthYearFromDate } from "./birth-date";
import { automaticImportMatch } from "./automatic-match";
import { reviewIssues } from "./review";
import {
  textReviewSnapshotSchema,
  prepareTextResultSchema,
  confirmTextResultSchema,
  type TextReview,
  type TextRow,
  type TextRowResult,
  type SaveTextReview,
  type PrepareTextTarget,
  type ConfirmTextRow,
  type PlayerField,
  type ImportPlayer,
} from "./contract";
import {
  matchingResultSchema,
  matchingProbeSchema,
  importCandidateSchema,
  type ImportCandidate,
  type MatchingResult,
} from "./matching-contract";
type State = {
  document: TextReview;
  version: number;
  results: TextRowResult[];
};
type Pending =
  | { kind: "save"; command: SaveTextReview }
  | { kind: "prepare"; command: PrepareTextTarget }
  | { kind: "confirm"; command: ConfirmTextRow };
type Props = {
  enabled: boolean;
  disputeId: string;
  gender: "masculino" | "feminino";
  registrationId?: string;
  onSessionLost: () => void;
  onSaved: () => void;
};
export function useTextImport(props: Props) {
  const [state, setState] = useState<State | null>(null),
    stateRef = useRef<State | null>(null);
  const [text, setText] = useState(""),
    [baseline, setBaseline] = useState("");
  const [busy, setBusyState] = useState(false),
    busyRef = useRef(false);
  const [pending, setPendingState] = useState<Pending | null>(null),
    pendingRef = useRef<Pending | null>(null);
  const [conflict, setConflict] = useState(false),
    [error, setError] = useState("");
  const [matches, setMatches] = useState<
    Record<string, MatchingResult["items"][number]>
  >({});
  const matchesRef = useRef(matches);
  const [candidates, setCandidatesState] = useState<
      Record<string, ImportCandidate>
    >({}),
    candidatesRef = useRef<Record<string, ImportCandidate>>({});
  const [rowErrors, setRowErrorsState] = useState<
      Record<string, { code: string; message: string }>
    >({}),
    rowErrorsRef = useRef<Record<string, { code: string; message: string }>>(
      {},
    );
  const put = (s: State | null) => {
    stateRef.current = s;
    setState(s);
  };
  const setBusy = (v: boolean) => {
    busyRef.current = v;
    setBusyState(v);
  };
  const setPending = (v: Pending | null) => {
    pendingRef.current = v;
    setPendingState(v);
  };
  const setCandidates = (v: Record<string, ImportCandidate>) => {
    candidatesRef.current = v;
    setCandidatesState(v);
  };
  const setRowErrors = (v: typeof rowErrors) => {
    rowErrorsRef.current = v;
    setRowErrorsState(v);
  };
  const dirty = state
    ? JSON.stringify(state.document) !== baseline
    : !!text.trim();
  const locked = busy || pending !== null || conflict;
  function mayLeave() {
    return (
      !busyRef.current &&
      (!(dirty || pendingRef.current) ||
        window.confirm(
          "Há alterações não salvas ou um envio não confirmado. Deseja sair desta conferência?",
        ))
    );
  }
  useEffect(() => {
    if (!dirty && !pending) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, pending]);
  function report(failure: unknown) {
    setError(
      failure instanceof Error
        ? failure.message
        : "Não foi possível concluir. Tente novamente.",
    );
    if (isSessionFailure(failure)) props.onSessionLost();
  }
  function candidate(row: TextRow) {
    return row.decision?.kind === "existing"
      ? candidatesRef.current[row.decision.personId]
      : undefined;
  }
  function issues(s: State): Map<string, string[]> {
    const map = reviewIssues(s.document.rows, s.results),
      done = new Set(s.results.map((r) => r.rowId));
    const add = (id: string, message: string) =>
      map.set(id, [...(map.get(id) ?? []), message]);
    for (const row of s.document.rows) {
      if (done.has(row.id)) continue;
      if (rowErrorsRef.current[row.id])
        add(row.id, rowErrorsRef.current[row.id].message);
      const c = candidate(row);
      if (row.decision?.kind === "existing") {
        if (!c) add(row.id, "Carregue e confira o cadastro escolhido.");
        else {
          if (c.version !== row.decision.version)
            add(
              row.id,
              "Cadastro alterado: confira e escolha novamente a identidade.",
            );
          if (
            c.activeRegistrationId !== null &&
            c.activeRegistrationId !== s.document.target.registrationId
          )
            add(row.id, "Atleta já está em outra inscrição desta disputa.");
          if (
            c.sex !== null &&
            c.sex !== (props.gender === "feminino" ? "female" : "male")
          )
            add(
              row.id,
              "O sexo do cadastro não corresponde ao naipe salvo da disputa.",
            );
          if (
            (c.roster?.version ?? 0) !== row.rosterVersion ||
            (c.roster && c.roster.id !== row.rosterId)
          )
            add(
              row.id,
              "O vínculo foi alterado. Confira e escolha novamente a identidade.",
            );
          if (
            row.decision.approveChanges &&
            row.provided.includes("birthYear") &&
            row.data.birthYear !== null &&
            !row.provided.includes("birthDate") &&
            c.data.birthDate &&
            Number(c.data.birthDate.slice(0, 4)) !== row.data.birthYear
          )
            add(
              row.id,
              "Ano importado diverge da data completa atual. Corrija ou limpe explicitamente a data antes de aprovar.",
            );
        }
      }
      const m = matchesRef.current[row.id];
      if (
        row.decision?.kind === "new" &&
        row.data.federationRegistration &&
        m?.status === "registration" &&
        m.candidates.some(
          (c) =>
            c.data.federationRegistration === row.data.federationRegistration,
        )
      )
        add(
          row.id,
          "Registro federativo pertence a um cadastro existente. Escolha-o ou corrija o registro.",
        );
    }
    return map;
  }
  async function refreshMatches(doc: TextReview): Promise<TextReview> {
    const applied = new Set(
      stateRef.current?.results.map((r) => r.rowId) ?? [],
    );
    const eligible = doc.rows
      .filter((r) => !applied.has(r.id))
      .flatMap((row) => {
        const { name, nickname, birthDate, birthYear, federationRegistration } =
          row.data;
        const p = matchingProbeSchema.safeParse({
          rowId: row.id,
          name,
          nickname,
          birthDate,
          birthYear,
          federationRegistration,
        });
        return p.success ? [p.data] : [];
      });
    const found: typeof matches = {};
    const cache: typeof candidates = {};
    for (let offset = 0; offset < eligible.length; offset += 10) {
      const result = await api("/api/text-import/match", matchingResultSchema, {
        disputeId: props.disputeId,
        registrationId:
          doc.target.kind === "registration" ? doc.target.registrationId : null,
        players: eligible.slice(offset, offset + 10),
      });
      for (const item of result.items) {
        found[item.rowId] = item;
        for (const c of item.candidates) cache[c.id] = c;
      }
    }
    for (const row of doc.rows)
      if (row.decision?.kind === "existing" && !cache[row.decision.personId]) {
        const id = row.decision.personId,
          params = new URLSearchParams({ disputeId: props.disputeId });
        if (doc.target.kind === "registration")
          params.set("registrationId", doc.target.registrationId);
        cache[id] = await api(
          `/api/text-import/people/${id}?${params}`,
          importCandidateSchema,
        );
      }
    matchesRef.current = found;
    setMatches(found);
    setCandidates(cache);
    return {
      ...doc,
      rows: doc.rows.map((row) => {
        if (
          applied.has(row.id) ||
          row.decision?.kind === "existing" ||
          (row.decision?.kind === "new" && row.decision.confirmHomonym)
        )
          return row;
        const match = found[row.id];
        if (!match) return { ...row, decision: null };
        const automatic = automaticImportMatch(row, match, {
          gender: props.gender,
          registrationId:
            doc.target.kind === "registration"
              ? doc.target.registrationId
              : null,
        });
        if (automatic)
          return {
            ...row,
            decision: {
              kind: "existing" as const,
              personId: automatic.id,
              version: automatic.version,
              approveChanges: false,
            },
            rosterId: automatic.roster?.id ?? row.rosterId,
            rosterVersion: automatic.roster?.version ?? 0,
          };
        if (match.status !== "new") return { ...row, decision: null };
        return {
          ...row,
          decision: row.decision ?? {
            kind: "new" as const,
            personId: crypto.randomUUID(),
            confirmHomonym: false,
          },
        };
      }),
    };
  }
  async function execute(p: Pending) {
    setPending(p);
    try {
      const current = stateRef.current;
      if (!current) throw Error("Abra a conferência antes de continuar.");
      if (p.kind === "save") {
        const r = await api("/api/text-import", saveResultSchema, p.command);
        if (
          r.id !== p.command.review.id ||
          r.version !== p.command.expectedVersion + 1
        )
          throw Error("Não foi possível confirmar a conferência salva.");
        put({
          document: p.command.review,
          version: r.version,
          results: current.results,
        });
        setBaseline(JSON.stringify(p.command.review));
      } else if (p.kind === "prepare") {
        const r = await api(
          "/api/text-import/prepare",
          prepareTextResultSchema,
          p.command,
        );
        if (r.id !== current.document.id)
          throw Error("O destino retornado não corresponde à conferência.");
        const doc = {
          ...current.document,
          target: {
            kind: "registration" as const,
            registrationId: r.registrationId,
            version: r.registrationVersion,
          },
        };
        put({ ...current, document: doc, version: r.version });
        setBaseline(JSON.stringify(doc));
      } else {
        const r = await api(
          "/api/text-import/confirm",
          confirmTextResultSchema,
          p.command,
        );
        if (r.id !== current.document.id || r.result.rowId !== p.command.rowId)
          throw Error("A resposta não corresponde à linha enviada.");
        put({
          ...current,
          version: r.version,
          results: [...current.results, r.result],
        });
        setBaseline(JSON.stringify(current.document));
      }
      setPending(null);
      setError("");
    } catch (failure) {
      if (failure instanceof ApiFailure && [400, 409].includes(failure.status))
        setPending(null);
      throw failure;
    }
  }
  async function saveCurrent() {
    const s = stateRef.current;
    if (s)
      await execute({
        kind: "save",
        command: {
          commandId: crypto.randomUUID(),
          expectedVersion: s.version,
          review: structuredClone(s.document),
        },
      });
  }
  async function interpret(target: TextReview["target"]) {
    if (busyRef.current || pendingRef.current || conflict) return;
    setBusy(true);
    setError("");
    setRowErrors({});
    try {
      const parsed = parseRoster(text),
        newTarget = structuredClone(target);
      if (newTarget.kind === "newTeam" && parsed.teamName) {
        if (!newTarget.teamName.trim()) newTarget.teamName = parsed.teamName;
        if (!newTarget.registrationName.trim())
          newTarget.registrationName = parsed.teamName;
      }
      const doc: TextReview = {
        ...parsed,
        id: crypto.randomUUID(),
        disputeId: props.disputeId,
        text,
        target: newTarget,
      };
      put({ document: doc, version: 0, results: [] });
      setBaseline("");
      const matched = await refreshMatches(doc);
      put({ document: matched, version: 0, results: [] });
      await saveCurrent();
      props.onSaved();
    } catch (failure) {
      report(failure);
    } finally {
      setBusy(false);
    }
  }
  function patchRow(id: string, change: (row: TextRow) => TextRow) {
    if (locked) return;
    const s = stateRef.current;
    if (!s || s.results.some((r) => r.rowId === id)) return;
    put({
      ...s,
      document: {
        ...s.document,
        rows: s.document.rows.map((r) =>
          r.id === id ? change(structuredClone(r)) : r,
        ),
      },
    });
    const errors = { ...rowErrorsRef.current };
    delete errors[id];
    setRowErrors(errors);
    setError("");
  }
  function field<K extends PlayerField>(
    id: string,
    key: K,
    value: ImportPlayer[K],
  ) {
    patchRow(id, (row) => {
      const year =
        key === "birthDate" && typeof value === "string"
          ? birthYearFromDate(value)
          : null;
      const updated: PlayerField[] = year === null ? [key] : [key, "birthYear"];
      return {
        ...row,
        data: {
          ...row.data,
          [key]: value,
          ...(year === null ? {} : { birthYear: year }),
        },
        provided: [...new Set([...row.provided, ...updated])],
        issues: row.issues.filter(
          (i) => i.field === null || !updated.includes(i.field),
        ),
      };
    });
  }
  function choose(id: string, c: ImportCandidate) {
    setCandidates({ ...candidatesRef.current, [c.id]: c });
    patchRow(id, (row) => ({
      ...row,
      decision: {
        kind: "existing",
        personId: c.id,
        version: c.version,
        approveChanges: false,
      },
      rosterId: c.roster?.id ?? crypto.randomUUID(),
      rosterVersion: c.roster?.version ?? 0,
    }));
  }
  function create(id: string, other = false) {
    patchRow(id, (row) => ({
      ...row,
      decision: {
        kind: "new",
        personId: crypto.randomUUID(),
        confirmHomonym: other,
      },
      rosterId: crypto.randomUUID(),
      rosterVersion: 0,
    }));
  }
  function changeTarget(target: TextReview["target"]) {
    if (locked) return;
    const s = stateRef.current;
    if (!s || s.results.length) return;
    const changed =
      target.registrationId !== s.document.target.registrationId ||
      target.kind !== s.document.target.kind;
    put({
      ...s,
      document: {
        ...s.document,
        target,
        rows: changed
          ? s.document.rows.map((r) => ({
              ...r,
              decision: null,
              rosterId: crypto.randomUUID(),
              rosterVersion: 0,
            }))
          : s.document.rows,
      },
    });
    if (changed) {
      setMatches({});
      matchesRef.current = {};
      setCandidates({});
      setRowErrors({});
    }
  }
  async function save() {
    if (busyRef.current || pendingRef.current || conflict) return;
    setBusy(true);
    try {
      await saveCurrent();
      props.onSaved();
    } catch (failure) {
      if (failure instanceof ApiFailure && failure.status === 409)
        setConflict(true);
      report(failure);
    } finally {
      setBusy(false);
    }
  }
  async function search() {
    if (busyRef.current || pendingRef.current || conflict || !stateRef.current)
      return;
    setBusy(true);
    try {
      const s = stateRef.current;
      const doc = await refreshMatches(s.document);
      put({ ...s, document: doc });
      setError("");
    } catch (failure) {
      report(failure);
    } finally {
      setBusy(false);
    }
  }
  async function confirm() {
    if (busyRef.current || pendingRef.current || conflict || !stateRef.current)
      return;
    setBusy(true);
    setError("");
    const before = stateRef.current.results.length;
    try {
      let s = stateRef.current;
      const doc = await refreshMatches(s.document);
      put({ ...s, document: doc });
      s = stateRef.current!;
      const invalid = issues(s),
        applied = new Set(s.results.map((r) => r.rowId)),
        ready = s.document.rows.filter(
          (r) => r.selected && !applied.has(r.id) && !invalid.has(r.id),
        );
      if (!ready.length || s.document.issues.length) {
        setError("Resolva as pendências ou selecione atletas prontos.");
        return;
      }
      if (JSON.stringify(s.document) !== baseline || s.version === 0)
        await saveCurrent();
      s = stateRef.current!;
      await execute({
        kind: "prepare",
        command: {
          commandId: crypto.randomUUID(),
          reviewId: s.document.id,
          expectedVersion: s.version,
        },
      });
      for (const row of ready) {
        s = stateRef.current!;
        try {
          await execute({
            kind: "confirm",
            command: {
              commandId: crypto.randomUUID(),
              reviewId: s.document.id,
              rowId: row.id,
              expectedVersion: s.version,
            },
          });
        } catch (failure) {
          if (
            failure instanceof ApiFailure &&
            (failure.status === 400 ||
              failure.code === "identity_confirmation_required")
          ) {
            setRowErrors({
              ...rowErrorsRef.current,
              [row.id]: { code: failure.code, message: failure.message },
            });
            continue;
          }
          if (failure instanceof ApiFailure && failure.status === 409)
            setConflict(true);
          report(failure);
          break;
        }
      }
      if (Object.keys(rowErrorsRef.current).length && !pendingRef.current)
        setError(
          "Há itens pendentes. Confira as linhas sinalizadas e preserve os sucessos.",
        );
    } catch (failure) {
      if (failure instanceof ApiFailure && failure.status === 409)
        setConflict(true);
      report(failure);
    } finally {
      setBusy(false);
      if ((stateRef.current?.results.length ?? 0) > before) props.onSaved();
    }
  }
  async function retry() {
    const p = pendingRef.current;
    if (!p || busyRef.current) return;
    setBusy(true);
    try {
      await execute(p);
      props.onSaved();
    } catch (failure) {
      if (failure instanceof ApiFailure && failure.status === 409)
        setConflict(true);
      report(failure);
    } finally {
      setBusy(false);
    }
  }
  async function load(id: string, ask = true) {
    if (busyRef.current || (ask && !mayLeave())) return;
    setBusy(true);
    setError("");
    try {
      const snap = await api(
        `/api/text-import/${id}`,
        textReviewSnapshotSchema,
      );
      if (
        snap.disputeId !== props.disputeId ||
        (props.registrationId &&
          snap.target.registrationId !== props.registrationId)
      )
        throw Error("Esta conferência pertence a outro destino.");
      const { version, savedAt, results, ...document } = snap;
      void savedAt;
      put({ document, version, results });
      setText(document.text);
      setBaseline(JSON.stringify(document));
      setPending(null);
      setConflict(false);
      setRowErrors({});
      const matched = await refreshMatches(document);
      put({ document: matched, version, results });
    } catch (failure) {
      report(failure);
    } finally {
      setBusy(false);
    }
  }
  function reset() {
    if (!mayLeave()) return;
    put(null);
    setText("");
    setBaseline("");
    setPending(null);
    setConflict(false);
    setError("");
    setMatches({});
    matchesRef.current = {};
    setCandidates({});
    setRowErrors({});
  }
  const rowIssues = state ? issues(state) : new Map<string, string[]>();
  const applied = new Set(state?.results.map((r) => r.rowId) ?? []);
  const readyCount =
    state?.document.rows.filter(
      (r) => r.selected && !applied.has(r.id) && !rowIssues.has(r.id),
    ).length ?? 0;
  return {
    state,
    text,
    setText,
    busy,
    pending,
    conflict,
    error,
    dirty,
    locked,
    matches,
    candidates,
    rowErrors,
    rowIssues,
    readyCount,
    applied,
    mayLeave,
    interpret,
    field,
    patchRow,
    choose,
    create,
    changeTarget,
    save,
    search,
    confirm,
    retry,
    load,
    reset,
    candidate,
  };
}
export type TextImportModel = ReturnType<typeof useTextImport>;
