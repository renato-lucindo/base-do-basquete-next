import type { CompetitionSetup } from "./format";

type Opponents = {
  homeRegistrationId: string;
  awayRegistrationId: string;
  stageKind?: "round_robin" | "knockout";
};
export type RegularPairing = Opponents & { round: number; groupIndex: number };

/** Preview only: existing games are never changed by schedule generation. */
export function generateRegularSchedule({
  setup,
  registrationIds,
  teamCount,
  games,
}: {
  setup: CompetitionSetup;
  registrationIds: string[];
  teamCount: number;
  games: Opponents[];
}): RegularPairing[] {
  if (setup.mode !== "standard" || setup.groupCount < 1)
    throw Error(
      "Escolha uma organização com fase regular para gerar os confrontos.",
    );
  if (!Number.isInteger(teamCount) || teamCount < 2 || teamCount > 1000)
    throw Error("Informe uma quantidade de equipes entre 2 e 1000.");
  if (
    teamCount !== registrationIds.length ||
    new Set(registrationIds).size !== teamCount
  )
    throw Error(
      `A quantidade deve corresponder às ${registrationIds.length} equipes inscritas. Confira Equipes e elencos.`,
    );
  const groups = Array.from({ length: setup.groupCount }, () => [] as string[]);
  for (const id of registrationIds) {
    const index = setup.groupCount === 1 ? 0 : setup.memberships[id];
    if (index == null || !groups[index])
      throw Error(
        "Distribua todas as equipes nos grupos nas opções avançadas.",
      );
    groups[index].push(id);
  }
  if (groups.some((group) => group.length < 2))
    throw Error("Cada grupo precisa ter pelo menos duas equipes.");
  if (
    groups.reduce(
      (sum, group) =>
        sum + ((group.length * (group.length - 1)) / 2) * setup.turns,
      0,
    ) > 10000
  )
    throw Error(
      "O formato excede o limite de 10000 jogos. Reduza a quantidade ou organize mais grupos.",
    );
  const key = (a: string, b: string) => [a, b].sort().join(":"),
    existing = new Map<string, Opponents[]>();
  for (const game of games) {
    if (game.stageKind === "knockout") continue;
    const id = key(game.homeRegistrationId, game.awayRegistrationId);
    existing.set(id, [...(existing.get(id) ?? []), game]);
  }
  const result: RegularPairing[] = [];
  groups.forEach((group, groupIndex) => {
    const wheel: (string | null)[] = [...group];
    if (wheel.length % 2) wheel.push(null);
    const rounds = wheel.length - 1,
      first: RegularPairing[] = [];
    for (let round = 1; round <= rounds; round++) {
      for (let i = 0; i < wheel.length / 2; i++) {
        const a = wheel[i],
          b = wheel[wheel.length - 1 - i];
        if (a && b)
          first.push({
            homeRegistrationId: round % 2 ? a : b,
            awayRegistrationId: round % 2 ? b : a,
            round,
            groupIndex,
          });
      }
      wheel.splice(1, 0, wheel.pop()!);
    }
    for (let turn = 0; turn < setup.turns; turn++) {
      for (const game of first) {
        const prior =
          existing.get(key(game.homeRegistrationId, game.awayRegistrationId)) ??
          [];
        if (prior.length > turn) continue;
        const source = turn && prior[0] ? prior[0] : game;
        result.push({
          ...game,
          homeRegistrationId: turn
            ? source.awayRegistrationId
            : source.homeRegistrationId,
          awayRegistrationId: turn
            ? source.homeRegistrationId
            : source.awayRegistrationId,
          round: game.round + turn * rounds,
        });
      }
    }
  });
  return result;
}
