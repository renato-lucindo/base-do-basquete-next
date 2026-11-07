import type { RoundRobinRules } from "./contract";
import type { RegulationDefinition } from "./persistence-contract";

/** New values every time: editing one dispute must never mutate another's defaults. */
export function createFibaRules(turns: 1 | 2 = 1): RoundRobinRules {
  return {
    format: "round_robin",
    calculationPolicy: "fiba-2026",
    turns,
    points: { win: 2, loss: 1 },
    tieBreakers: [
      "head_to_head_points",
      "head_to_head_difference",
      "head_to_head_for",
      "point_difference",
      "points_for",
    ],
  };
}

export function createDefaultDefinition(): RegulationDefinition {
  return {
    registrationIds: [],
    occurrenceRules: {
      wo: {
        winnerLeaguePoints: 2,
        loserLeaguePoints: 0,
        score: { winner: 20, loser: 0 },
      },
    },
    groupPhases: [],
    knockoutPhases: [],
    series: [],
  };
}

export function hasCustomRules(d: RegulationDefinition) {
  const base = createFibaRules(),
    wo = createDefaultDefinition().occurrenceRules.wo;
  return (
    JSON.stringify(d.occurrenceRules.wo) !== JSON.stringify(wo) ||
    d.groupPhases.some(
      (p) =>
        p.rules.calculationPolicy !== "fiba-2026" ||
        p.rules.points.win !== 2 ||
        p.rules.points.loss !== 1 ||
        JSON.stringify(p.rules.tieBreakers) !==
          JSON.stringify(base.tieBreakers),
    )
  );
}
export function adoptFibaDefaults(
  d: RegulationDefinition,
): RegulationDefinition {
  const next = structuredClone(d);
  next.occurrenceRules = createDefaultDefinition().occurrenceRules;
  next.groupPhases = next.groupPhases.map((p) => ({
    ...p,
    rules: createFibaRules(p.rules.turns ?? 1),
  }));
  next.customized = false;
  delete next.customReason;
  return next;
}
