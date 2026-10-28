import { positions, type ImportPlayer, type PlayerField } from "./contract";
import type { TextImportModel } from "./use-text-import";
import type { ImportCandidate } from "./matching-contract";
import { birthYearFromDate } from "./birth-date";
const labels: Record<PlayerField, string> = {
  name: "Nome",
  jersey: "Camisa",
  nickname: "Apelido",
  birthDate: "Nascimento",
  birthYear: "Ano de nascimento",
  positions: "Posições",
  heightCm: "Altura (cm)",
  weightKg: "Peso (kg)",
  dominantHand: "Mão dominante",
  federationRegistration: "Registro federativo",
};
const printable = (value: unknown) =>
  value === null || value === ""
    ? "Não informado"
    : Array.isArray(value)
      ? value.join(" / ") || "Não informado"
      : String(value);
export function ImportTable({
  model,
  canEdit = true,
}: {
  model: TextImportModel;
  canEdit?: boolean;
}) {
  if (!model.state) return null;
  return (
    <div
      className="text-import-scroll"
      role="region"
      aria-label="Tabela de conferência com rolagem horizontal"
      aria-describedby="text-import-scroll-hint"
      tabIndex={0}
    >
      <table>
        <caption>Conferência do elenco</caption>
        <thead>
          <tr>
            {Object.values(labels).map((label) => (
              <th scope="col" key={label}>
                {label}
              </th>
            ))}
            <th scope="col">Selecionar e situação</th>
            <th scope="col">Identidade e alterações</th>
          </tr>
        </thead>
        <tbody>
          {model.state.document.rows.map((row) => {
            const current = model.candidate(row),
              done = model.applied.has(row.id),
              disabled = model.locked || done || !canEdit;
            function value<K extends PlayerField>(
              key: K,
            ): ImportCandidate["data"][K] {
              const imported = {
                ...row.data,
                birthYear:
                  row.data.birthYear ?? birthYearFromDate(row.data.birthDate),
              };
              if (
                row.provided.includes(key) ||
                !current ||
                (key === "birthYear" && row.provided.includes("birthDate"))
              )
                return imported[key];
              const displayed = {
                ...current.data,
                birthYear:
                  current.data.birthYear ??
                  birthYearFromDate(current.data.birthDate),
                jersey: current.roster?.jersey ?? null,
              };
              return displayed[key];
            }
            const problems = model.rowIssues.get(row.id) ?? [];
            const differences = current
              ? row.provided.filter(
                  (key) =>
                    key !== "jersey" &&
                    JSON.stringify(row.data[key]) !==
                      JSON.stringify(current.data[key]),
                )
              : [];
            return (
              <tr key={row.id} className={done ? "text-import-done" : ""}>
                {(
                  [
                    "name",
                    "jersey",
                    "nickname",
                    "birthDate",
                    "birthYear",
                  ] as const
                ).map((key) => (
                  <td key={key}>
                    <input
                      aria-label={`${labels[key]}, linha ${row.line}`}
                      disabled={disabled}
                      type={
                        key === "birthDate"
                          ? "date"
                          : key === "birthYear"
                            ? "number"
                            : "text"
                      }
                      maxLength={key === "jersey" ? 2 : 120}
                      value={value(key) ?? ""}
                      onChange={(event) =>
                        model.field(
                          row.id,
                          key,
                          key === "birthYear"
                            ? event.target.value === ""
                              ? null
                              : Number(event.target.value)
                            : key === "name"
                              ? event.target.value
                              : event.target.value || null,
                        )
                      }
                    />
                  </td>
                ))}
                <td>
                  {[0, 1].map((index) => (
                    <select
                      key={index}
                      aria-label={`Posição ${index + 1}, linha ${row.line}`}
                      disabled={disabled}
                      value={(value("positions") ?? [])[index] ?? ""}
                      onChange={(event) => {
                        const next = [...(value("positions") ?? [])];
                        next[index] = event.target.value;
                        model.field(row.id, "positions", next.filter(Boolean));
                      }}
                    >
                      <option value="">Não informada</option>
                      {[
                        ...new Set([
                          ...positions,
                          ...(value("positions") ?? []),
                        ]),
                      ].map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </select>
                  ))}
                </td>
                {(["heightCm", "weightKg"] as const).map((key) => (
                  <td key={key}>
                    <input
                      type="number"
                      step="any"
                      aria-label={`${labels[key]}, linha ${row.line}`}
                      disabled={disabled}
                      value={value(key) ?? ""}
                      onChange={(event) =>
                        model.field(
                          row.id,
                          key,
                          event.target.value === ""
                            ? null
                            : Number(event.target.value),
                        )
                      }
                    />
                  </td>
                ))}
                <td>
                  <select
                    aria-label={`Mão dominante, linha ${row.line}`}
                    disabled={disabled}
                    value={value("dominantHand") ?? ""}
                    onChange={(event) =>
                      model.field(
                        row.id,
                        "dominantHand",
                        event.target.value as ImportPlayer["dominantHand"],
                      )
                    }
                  >
                    <option value="" disabled>
                      Manter não informada
                    </option>
                    <option value="right">Destro</option>
                    <option value="left">Canhoto</option>
                    <option value="both">Ambidestro</option>
                  </select>
                </td>
                <td>
                  <input
                    aria-label={`Registro federativo, linha ${row.line}`}
                    disabled={disabled}
                    maxLength={120}
                    inputMode="numeric"
                    value={value("federationRegistration") ?? ""}
                    onChange={(event) =>
                      model.field(
                        row.id,
                        "federationRegistration",
                        event.target.value || null,
                      )
                    }
                  />
                </td>
                <td>
                  <label>
                    <input
                      type="checkbox"
                      aria-label={`Selecionar linha ${row.line}`}
                      checked={row.selected}
                      disabled={disabled}
                      onChange={(event) =>
                        model.patchRow(row.id, (r) => ({
                          ...r,
                          selected: event.target.checked,
                        }))
                      }
                    />
                    Linha {row.line}
                  </label>
                  <strong>
                    {done
                      ? "Confirmado"
                      : problems.length
                        ? "Pendente"
                        : "Pronto"}
                  </strong>
                  <details>
                    <summary>Texto original</summary>
                    <pre>{row.source}</pre>
                  </details>
                  {problems.length > 0 && (
                    <ul>
                      {problems.map((problem, index) => (
                        <li key={index}>{problem}</li>
                      ))}
                    </ul>
                  )}
                  {row.issues.map((issue, index) => (
                    <div key={index}>
                      <code>{issue.token}</code>
                      {issue.field === null && (
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() =>
                            model.patchRow(row.id, (r) => ({
                              ...r,
                              issues: r.issues.filter((_, i) => i !== index),
                            }))
                          }
                        >
                          Ignorar este fragmento
                        </button>
                      )}
                    </div>
                  ))}
                </td>
                <td>
                  <p>
                    {row.decision?.kind === "existing"
                      ? `Cadastro escolhido: ${current?.data.name ?? "Carregando…"}`
                      : row.decision?.kind === "new"
                        ? "Criar nova pessoa"
                        : "Escolha a identidade"}
                  </p>
                  {!done &&
                    model.matches[row.id]?.candidates.map((c) => (
                      <div
                        key={c.id}
                        data-testid={`candidate-${c.id}`}
                        className="text-import-candidate"
                      >
                        <strong>{c.data.name}</strong>
                        <p>
                          {c.data.birthDate ??
                            c.data.birthYear ??
                            "Nascimento não informado"}{" "}
                          · Registro{" "}
                          {c.data.federationRegistration ?? "não informado"}
                        </p>
                        <p>
                          {c.contexts
                            .map((context) => context.teamName)
                            .join(", ") || "Sem vínculo encontrado"}
                        </p>
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => model.choose(row.id, c)}
                        >
                          Usar este cadastro
                        </button>
                      </div>
                    ))}
                  {!done && model.matches[row.id]?.hasMore && (
                    <p>
                      Há outras correspondências. Complete os dados e busque
                      novamente.
                    </p>
                  )}
                  {!done && (
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => model.create(row.id, true)}
                    >
                      É outra pessoa: criar novo cadastro
                    </button>
                  )}
                  {row.decision?.kind === "existing" && (
                    <>
                      <p>
                        Campos omitidos preservam o cadastro. A camisa pertence
                        a esta inscrição.
                      </p>
                      {differences.length > 0 && (
                        <ul>
                          {differences.map((key) => (
                            <li key={key}>
                              {labels[key]}: {printable(current!.data[key])} →{" "}
                              {printable(row.data[key])}
                            </li>
                          ))}
                        </ul>
                      )}
                      <label>
                        <input
                          type="checkbox"
                          disabled={disabled}
                          checked={row.decision.approveChanges}
                          onChange={(event) =>
                            model.patchRow(row.id, (r) => ({
                              ...r,
                              decision:
                                r.decision?.kind === "existing"
                                  ? {
                                      ...r.decision,
                                      approveChanges: event.target.checked,
                                    }
                                  : r.decision,
                            }))
                          }
                        />
                        Aprovo atualizar os dados fornecidos no cadastro global
                      </label>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
