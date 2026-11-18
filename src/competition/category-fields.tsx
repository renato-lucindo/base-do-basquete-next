import {
  baseAges,
  categoryLabel,
  categorySelection,
  masterAges,
  type CategoryKind,
} from "./category";

export function CategoryFields({
  label,
  suffix,
  onChange,
  disabled = false,
}: {
  label: string;
  suffix: string;
  disabled?: boolean;
  onChange: (label: string) => void;
}) {
  const { kind, age } =
    label === "Sub-"
      ? ({ kind: "base", age: "" } as const)
      : label === "+"
        ? ({ kind: "master", age: "" } as const)
        : categorySelection(label);
  const needsAge = kind === "base" || kind === "master";
  const ageLabel = kind === "base" ? "Idade máxima" : "Idade mínima";

  return (
    <>
      <label>
        Categoria
        <select
          name="category"
          disabled={disabled}
          aria-label={`Categoria da disputa ${suffix}`}
          value={kind}
          onChange={(event) =>
            onChange(categoryLabel(event.target.value as CategoryKind, ""))
          }
        >
          {kind === "legacy" && (
            <option value="legacy" disabled>
              {label} (legado)
            </option>
          )}
          <option value="adult">Adulto</option>
          <option value="base">Base</option>
          <option value="master">Master</option>
        </select>
      </label>
      {needsAge && (
        <label>
          {ageLabel}
          <select
            name="categoryAge"
            disabled={disabled}
            aria-label={`${ageLabel} da categoria ${suffix}`}
            required
            value={age}
            onChange={(event) =>
              onChange(categoryLabel(kind, event.target.value))
            }
          >
            <option value="">Selecione</option>
            {(kind === "base" ? baseAges : masterAges).map((value) => (
              <option key={value} value={value}>
                {categoryLabel(kind, String(value))}
              </option>
            ))}
          </select>
        </label>
      )}
    </>
  );
}
