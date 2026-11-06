import type { deriveSheetTeamStatistics } from "./sheet-team-statistics";
import type { PublicResult } from "./pdf-contract";
import { useId } from "react";
export function publishedGD(snapshot: PublicResult) {
  return Object.fromEntries(
    (["home", "away"] as const).map((side) => {
      const t = snapshot.facts.teams[side];
      return [
        side,
        "teamStatistics" in t ? t.teamStatistics?.disqualifications : undefined,
      ];
    }),
  );
}
export type CollectiveFacts = ReturnType<typeof deriveSheetTeamStatistics>;
export type GDReview = Record<
  "home" | "away",
  { total: string; confirmed: boolean }
>;
export function initialGDReview(
  facts: CollectiveFacts,
  previous?: Partial<Record<"home" | "away", number | null>>,
): GDReview {
  return Object.fromEntries(
    (["home", "away"] as const).map((side) => [
      side,
      {
        total: String(previous?.[side] ?? facts[side].minimumDisqualifications),
        confirmed: false,
      },
    ]),
  ) as GDReview;
}
export function gdReviewReady(review: GDReview, facts: CollectiveFacts) {
  return (["home", "away"] as const).every((side) => {
    const value = Number(review[side].total);
    return (
      review[side].confirmed &&
      review[side].total.trim() !== "" &&
      Number.isInteger(value) &&
      value >= facts[side].minimumDisqualifications &&
      value <= 2147483647
    );
  });
}
export function CollectiveReview({
  facts,
  review,
  onChange,
  names,
  disabled = false,
}: {
  facts: CollectiveFacts;
  review: GDReview;
  onChange: (v: GDReview) => void;
  names: Record<"home" | "away", string>;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <fieldset disabled={disabled} className="collective-review">
      <legend>Estatísticas coletivas a publicar</legend>
      <p>
        FR corresponde às faltas cometidas pela adversária nesta partida.
        Confira o total de GD de toda a equipe, incluindo jogadores, técnico,
        assistente e banco, sem contar a mesma pessoa duas vezes.
      </p>
      <div className="collective-review-teams">
        {(["home", "away"] as const).map((side) => {
          const total = Number(review[side].total),
            invalid =
              review[side].total.trim() === "" ||
              !Number.isInteger(total) ||
              total < facts[side].minimumDisqualifications ||
              total > 2147483647,
            errorId = `${id}-${side}-error`;
          return (
            <div key={side}>
              <h5>{names[side]}</h5>
              <p>
                <output aria-label={`FR — faltas recebidas · ${names[side]}`}>
                  FR: {facts[side].foulsReceived}
                </output>
                {" · "}
                <output aria-label={`T — faltas técnicas · ${names[side]}`}>
                  T: {facts[side].technicalFouls}
                </output>
              </p>
              <p>
                GD identificadas: {facts[side].minimumDisqualifications}. B2 não
                conta outra técnica nem informa o total de pessoas
                desqualificadas.
              </p>
              <label className="collective-gd-total">
                GD — total da equipe · {names[side]}
                <input
                  type="number"
                  name={`team-gd-${side}`}
                  inputMode="numeric"
                  min={facts[side].minimumDisqualifications}
                  max={2147483647}
                  step={1}
                  required
                  aria-invalid={invalid || undefined}
                  aria-describedby={invalid ? errorId : undefined}
                  autoComplete="off"
                  value={review[side].total}
                  onChange={(e) =>
                    onChange({
                      ...review,
                      [side]: { total: e.target.value, confirmed: false },
                    })
                  }
                />
              </label>
              {invalid && (
                <p id={errorId} aria-live="polite">
                  Informe um total inteiro de GD entre{" "}
                  {facts[side].minimumDisqualifications} e 2147483647.
                </p>
              )}
              <label className="collective-gd-confirmation">
                <input
                  type="checkbox"
                  name={`team-gd-confirmed-${side}`}
                  checked={review[side].confirmed}
                  onChange={(e) =>
                    onChange({
                      ...review,
                      [side]: { ...review[side], confirmed: e.target.checked },
                    })
                  }
                />{" "}
                Conferi o total de GD de {names[side]}, incluindo zero quando
                não houve desqualificações.
              </label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
