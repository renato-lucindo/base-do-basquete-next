import { useEffect, useState } from "react";
import { api, isSessionFailure } from "../competition/api";
import {
  registrationListingSchema,
  teamListingSchema,
  type RegistrationSnapshot,
  type TeamSnapshot,
} from "../teams/contract";
import type { TextReview } from "./contract";
export function TargetPicker({
  value,
  onChange,
  disputeId,
  disabled,
  enabled,
  onSessionLost,
}: {
  value: TextReview["target"];
  onChange: (v: TextReview["target"]) => void;
  disputeId: string;
  disabled: boolean;
  enabled: boolean;
  onSessionLost: () => void;
}) {
  const [query, setQuery] = useState(""),
    [offset, setOffset] = useState(0),
    [items, setItems] = useState<(RegistrationSnapshot | TeamSnapshot)[]>([]),
    [more, setMore] = useState(false),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!enabled || value.kind === "newTeam") return;
    let active = true;
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(() => {
      void (
        value.kind === "registration"
          ? api(
              `/api/registrations?disputeId=${disputeId}&q=${encodeURIComponent(query)}&offset=${offset}`,
              registrationListingSchema,
              undefined,
              controller.signal,
            )
          : api(
              `/api/teams?q=${encodeURIComponent(query)}&offset=${offset}`,
              teamListingSchema,
              undefined,
              controller.signal,
            )
      )
        .then((result) => {
          if (active) {
            setItems(result.items);
            setMore(result.hasMore);
            setError("");
          }
        })
        .catch((failure) => {
          if (active) {
            if (isSessionFailure(failure)) onSessionLost();
            else setError("Não foi possível buscar os destinos.");
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 150);
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [enabled, value.kind, disputeId, query, offset, onSessionLost]);
  return (
    <fieldset disabled={disabled} className="text-import-target">
      <legend>Destino do elenco</legend>
      <label>
        Como vincular esta equipe?
        <select
          aria-label="Como vincular esta equipe?"
          value={value.kind}
          onChange={(event) => {
            setItems([]);
            setQuery("");
            setOffset(0);
            const registrationId = crypto.randomUUID();
            onChange(
              event.target.value === "newTeam"
                ? {
                    kind: "newTeam",
                    teamId: crypto.randomUUID(),
                    registrationId,
                    teamName: "",
                    registrationName: "",
                  }
                : event.target.value === "existingTeam"
                  ? {
                      kind: "existingTeam",
                      teamId: crypto.randomUUID(),
                      teamVersion: 1,
                      registrationId,
                      registrationName: "",
                    }
                  : { kind: "registration", registrationId, version: 1 },
            );
          }}
        >
          <option value="newTeam">Criar equipe e inscrição</option>
          <option value="existingTeam">
            Nova inscrição de equipe existente
          </option>
          <option value="registration">Usar inscrição existente</option>
        </select>
      </label>
      {value.kind !== "newTeam" && (
        <>
          <label>
            Buscar destino
            <input
              value={query}
              maxLength={120}
              onChange={(event) => {
                setQuery(event.target.value);
                setOffset(0);
              }}
            />
          </label>
          {loading && <p role="status">Buscando destinos…</p>}
          {error && <p role="alert">{error}</p>}
          <ul>
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  aria-pressed={
                    value.kind === "registration"
                      ? item.id === value.registrationId
                      : item.id === value.teamId
                  }
                  onClick={() => {
                    if (value.kind === "registration" && "teamId" in item)
                      onChange({
                        kind: "registration",
                        registrationId: item.id,
                        version: item.version,
                      });
                    else if (
                      value.kind === "existingTeam" &&
                      !("teamId" in item)
                    )
                      onChange({
                        ...value,
                        teamId: item.id,
                        teamVersion: item.version,
                        registrationName: value.registrationName || item.name,
                      });
                  }}
                >
                  {item.name} · {item.id.slice(-8)}
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
              Destinos anteriores
            </button>
            <button
              type="button"
              disabled={!more}
              onClick={() => setOffset(offset + 20)}
            >
              Mais destinos
            </button>
          </div>
        </>
      )}
      {value.kind === "newTeam" && (
        <label>
          Nome da equipe global
          <input
            value={value.teamName}
            maxLength={120}
            onChange={(event) =>
              onChange({ ...value, teamName: event.target.value })
            }
          />
        </label>
      )}
      {value.kind !== "registration" && (
        <label>
          Nome público da inscrição
          <input
            value={value.registrationName}
            maxLength={120}
            onChange={(event) =>
              onChange({ ...value, registrationName: event.target.value })
            }
          />
        </label>
      )}
      <p>
        O destino será criado somente ao confirmar atletas prontos. O cabeçalho
        do texto não escolhe uma equipe existente automaticamente.
      </p>
    </fieldset>
  );
}
