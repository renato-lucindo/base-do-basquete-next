import { useEffect, useState } from "react";
import { api, isSessionFailure } from "../competition/api";
import { listingSchema, snapshotSchema } from "../competition/contract";
export type PdfContext = {
  id: string;
  label: string;
  gender: "masculino" | "feminino";
};
export function PdfContextPicker({
  value,
  contexts,
  onContexts,
  onChange,
  disabled,
  label,
  onSessionLost,
}: {
  value: string;
  contexts: PdfContext[];
  onContexts: (rows: PdfContext[]) => void;
  onChange: (id: string) => void;
  disabled: boolean;
  label: string;
  onSessionLost: () => void;
}) {
  const [query, setQuery] = useState(""),
    [offset, setOffset] = useState(0),
    [rows, setRows] = useState<{ id: string; name: string }[]>([]),
    [more, setMore] = useState(false),
    [error, setError] = useState(""),
    [searching, setSearching] = useState(false);
  useEffect(() => {
    if (!searching) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void api(
        `/api/competitions?q=${encodeURIComponent(query)}&offset=${offset}`,
        listingSchema,
        undefined,
        controller.signal,
      )
        .then((r) => {
          setRows(r.items);
          setMore(r.hasMore);
          setError("");
        })
        .catch((e) => {
          if (controller.signal.aborted) return;
          if (isSessionFailure(e)) onSessionLost();
          else setError("Não foi possível buscar campeonatos.");
        });
    }, 180);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, offset, searching]);
  async function load(id: string) {
    try {
      const c = await api(`/api/competitions/${id}`, snapshotSchema);
      onContexts(
        c.seasons.flatMap((s) =>
          s.disputes.map((d) => ({
            id: d.id,
            gender: d.gender,
            label: `${c.name} · ${s.year} · ${d.gender === "feminino" ? "Feminino" : "Masculino"} · ${d.category}${d.division ? " · " + d.division : ""}`,
          })),
        ),
      );
      setError("");
    } catch (e) {
      if (isSessionFailure(e)) onSessionLost();
      else setError("Não foi possível abrir os destinos.");
    }
  }
  return (
    <fieldset disabled={disabled}>
      <legend>{label}</legend>
      <label>
        {label}
        <select
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {!contexts.some((c) => c.id === value) && (
            <option value={value}>Destino salvo · {value.slice(-8)}</option>
          )}
          {contexts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <details onToggle={(e) => setSearching(e.currentTarget.open)}>
        <summary>Buscar destino em outro campeonato</summary>
        <label>
          Buscar campeonato para destino
          <input
            value={query}
            maxLength={120}
            onChange={(e) => {
              setQuery(e.target.value);
              setOffset(0);
            }}
          />
        </label>
        <ul>
          {rows.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => void load(r.id)}>
                Carregar destinos de {r.name}
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          disabled={!offset}
          onClick={() => setOffset(Math.max(0, offset - 20))}
        >
          Campeonatos anteriores
        </button>
        <button
          type="button"
          disabled={!more}
          onClick={() => setOffset(offset + 20)}
        >
          Mais campeonatos
        </button>
        {error && <p role="alert">{error}</p>}
      </details>
    </fieldset>
  );
}
