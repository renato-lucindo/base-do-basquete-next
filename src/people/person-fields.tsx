import type { ReactNode } from "react";
import type { Person } from "./contract";
export function PersonFields({
  person,
  change,
  originalAthlete,
  originalCoach,
  contextual,
  gender,
  requiredRole,
  contextFields,
}: {
  person: Person;
  change: (person: Person) => void;
  originalAthlete: boolean;
  originalCoach: boolean;
  contextual: boolean;
  gender: "masculino" | "feminino";
  requiredRole: "athlete" | "coach" | null;
  contextFields?: ReactNode;
}) {
  const patch = (value: Partial<Person>) => change({ ...person, ...value });
  return (
    <div className="person-fields-grid">
      <label className="person-name-field">
        Nome da pessoa
        <input
          name="personName"
          autoComplete="off"
          required
          maxLength={120}
          value={person.name}
          onChange={(e) => patch({ name: e.target.value })}
        />
      </label>
      <label className="person-nickname-field">
        Apelido
        <input
          name="nickname"
          autoComplete="off"
          maxLength={120}
          value={person.nickname ?? ""}
          onChange={(e) => patch({ nickname: e.target.value || null })}
        />
      </label>
      {contextFields}
      <div className="member-role-options">
        <label>
          <input
            type="checkbox"
            name="athleteRole"
            checked={!!person.athlete}
            disabled={originalAthlete || requiredRole === "athlete"}
            onChange={(e) =>
              patch({
                athlete: e.target.checked
                  ? {
                      sex: gender === "feminino" ? "female" : "male",
                      birthDate: null,
                      federationRegistration: null,
                    }
                  : null,
              })
            }
          />
          Atleta
        </label>
        <label>
          <input
            type="checkbox"
            name="coachRole"
            checked={person.coach}
            disabled={originalCoach || requiredRole === "coach"}
            onChange={(e) => patch({ coach: e.target.checked })}
          />
          Técnico
        </label>
      </div>
      <p className="person-fields-hint person-role-hint">
        Uma pessoa pode atuar como atleta e técnico com o mesmo cadastro.
      </p>
      {person.athlete && (
        <fieldset className="member-private">
          <legend>Dados privados do atleta</legend>
          {contextual && (
            <p>
              {originalAthlete
                ? "O sexo do cadastro existente é preservado neste fluxo."
                : `Novo atleta: sexo ${gender === "feminino" ? "feminino" : "masculino"}, conforme o naipe salvo da disputa.`}
            </p>
          )}
          <label>
            Sexo privado
            <select
              name="privateSex"
              aria-label="Sexo privado"
              value={person.athlete.sex}
              disabled={contextual}
              onChange={(e) => {
                if (person.athlete)
                  patch({
                    athlete: {
                      ...person.athlete,
                      sex: e.target.value as "male" | "female",
                    },
                  });
              }}
            >
              <option value="female">Feminino</option>
              <option value="male">Masculino</option>
            </select>
          </label>
          <div className="person-private-optional">
            <label>
              Data completa de nascimento
              <input
                type="date"
                name="birthDate"
                autoComplete="off"
                value={person.athlete.birthDate ?? ""}
                onChange={(e) => {
                  if (person.athlete)
                    patch({
                      athlete: {
                        ...person.athlete,
                        birthDate: e.target.value || null,
                      },
                    });
                }}
              />
            </label>
            <label>
              Registro federativo
              <input
                name="federationRegistration"
                autoComplete="off"
                maxLength={6}
                pattern="[0-9]{6}"
                inputMode="numeric"
                value={person.athlete.federationRegistration ?? ""}
                onChange={(e) => {
                  if (person.athlete)
                    patch({
                      athlete: {
                        ...person.athlete,
                        federationRegistration: e.target.value || null,
                      },
                    });
                }}
              />
            </label>
          </div>
        </fieldset>
      )}
      <div className="person-public-fields">
        {(
          [
            ["position", "Posição", 80],
            ["originCity", "Cidade de origem", 120],
            ["originState", "Estado de origem", 80],
          ] as const
        ).map(([key, label, max]) => (
          <label key={key}>
            {label}
            <input
              name={key}
              autoComplete="off"
              maxLength={max}
              value={person[key] ?? ""}
              onChange={(e) => patch({ [key]: e.target.value || null })}
            />
          </label>
        ))}
        {(
          [
            ["publicBirthYear", "Ano público de nascimento", 9999, 1],
            ["heightCm", "Altura (cm)", 1000, 0.1],
            ["weightKg", "Peso (kg)", 1000, 0.1],
          ] as const
        ).map(([key, label, max, min]) => (
          <label
            key={key}
            className={`person-number-field${key === "publicBirthYear" ? " person-year-field" : ""}`}
          >
            {label}
            <input
              name={key}
              autoComplete="off"
              type="number"
              min={min}
              max={max}
              step={key === "publicBirthYear" ? 1 : "any"}
              value={person[key] ?? ""}
              onChange={(e) =>
                patch({ [key]: e.target.value ? Number(e.target.value) : null })
              }
            />
          </label>
        ))}
        <label className="person-hand-field">
          Mão dominante
          <select
            name="dominantHand"
            aria-label="Mão dominante"
            value={person.dominantHand ?? ""}
            onChange={(e) =>
              patch({
                dominantHand: e.target.value
                  ? (e.target.value as "left" | "right" | "both")
                  : null,
              })
            }
          >
            <option value="">Não informada</option>
            <option value="right">Direita</option>
            <option value="left">Esquerda</option>
            <option value="both">Ambas</option>
          </select>
        </label>
        <label className="person-biography-field">
          Biografia
          <textarea
            name="biography"
            rows={2}
            maxLength={4000}
            value={person.biography ?? ""}
            onChange={(e) => patch({ biography: e.target.value || null })}
          />
        </label>
      </div>
      <p className="person-fields-hint">
        Ano público e data completa privada são informações separadas. Campos
        opcionais podem ficar vazios.
      </p>
    </div>
  );
}
