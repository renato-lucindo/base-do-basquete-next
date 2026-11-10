import type { PublicResult } from "./pdf-contract";
import { compareJerseys } from "../domain/jersey";
export type Side = "home" | "away";
export type Period = "all" | number;
export const scoringKeys = ["points", "two", "three", "free"] as const;
export type ScoringKey = (typeof scoringKeys)[number];
type Player = PublicResult["facts"]["players"][number];
export type GamePlayer = Omit<Player, ScoringKey | "played"> & {
  played: boolean | null;
  points: number | null;
  two: number | null;
  three: number | null;
  free: number | null;
  fouls: number | null;
  status: "eligible" | "excluded" | "GD" | "D" | null;
  technical: number | null;
  unsportsmanlike: number | null;
};
export function gameRows(
  result: PublicResult,
  side: Side,
  period: Period,
): GamePlayer[] {
  return result.facts.players
    .filter((p) => p.side === side)
    .sort((a, b) => compareJerseys(a.jersey, b.jersey))
    .map((p) => {
      const cut =
        period === "all"
          ? null
          : result.details?.periods[period - 1]?.players.find(
              (q) => q.side === p.side && q.jersey === p.jersey,
            );
      const played = period === "all" ? p.played : (cut?.played ?? null);
      const known = played === true;
      return {
        ...p,
        played,
        ...Object.fromEntries(
          scoringKeys.map((key) => [
            key,
            known ? (cut ? cut[key] : p[key]) : null,
          ]),
        ),
        fouls: !known
          ? null
          : cut
            ? cut.fouls
            : "fouls" in p
              ? p.fouls
              : (p.advanced?.foulsCommitted ?? null),
        status: cut
          ? cut.status
          : period === "all" && "status" in p
            ? p.status
            : null,
        technical: !known
          ? null
          : cut
            ? cut.technical
            : "technical" in p
              ? p.technical
              : null,
        unsportsmanlike: !known
          ? null
          : cut
            ? cut.unsportsmanlike
            : "unsportsmanlike" in p
              ? p.unsportsmanlike
              : null,
      } as GamePlayer;
    });
}
export function gameTotals(result: PublicResult, side: Side, period: Period) {
  const players = result.facts.players.filter((p) => p.side === side);
  const cut = period === "all" ? null : result.details?.periods[period - 1];
  const sum = (key: ScoringKey) =>
    cut
      ? cut.players
          .filter((p) => p.side === side)
          .reduce((n, p) => n + p[key], 0)
      : players.reduce((n, p) => n + (p.played ? p[key] : 0), 0);
  const team = result.facts.teams[side];
  const manualPdf =
    "origins" in result.facts &&
    result.facts.origins.scorePoints.kind === "sheet";
  const attempts = cut
    ? // Legacy sheets validate LL awards at game level. A period with more
      // made throws than recorded attempts cannot establish that denominator.
      cut.teams[side].freeMade > cut.teams[side].freeTaken
      ? null
      : cut.teams[side].freeTaken
    : manualPdf
      ? null
      : "freeTaken" in team
        ? team.freeTaken
        : players.every(
              (p) => !p.played || ("advanced" in p && p.advanced !== null),
            )
          ? players.reduce(
              (n, p) =>
                n +
                ("advanced" in p && p.played
                  ? (p.advanced?.freeThrows.attempted ?? 0)
                  : 0),
              0,
            )
          : null;
  const rows = gameRows(result, side, "all");
  const fouls = cut
    ? cut.teams[side].fouls
    : rows.some((p) => p.played && p.fouls === null)
      ? null
      : rows.reduce((n, p) => n + (p.fouls ?? 0), 0);
  return {
    points:
      period === "all" ? team.points : (team.periods?.[period - 1] ?? null),
    two: sum("two"),
    three: sum("three"),
    free: sum("free"),
    fouls,
    attempts,
  };
}
export function gameLeaders(rows: GamePlayer[]) {
  return Object.fromEntries(
    scoringKeys.map((key) => [
      key,
      Math.max(0, ...rows.map((p) => (p.played === true ? (p[key] ?? 0) : 0))),
    ]),
  ) as Record<ScoringKey, number>;
}
export const periodShort = (period: Period) =>
  period === "all"
    ? "Jogo todo"
    : period <= 4
      ? `${period}º Q`
      : `${period - 4}ª PR`;
export const periodName = (period: Period) =>
  period === "all"
    ? "Jogo todo"
    : period <= 4
      ? `${period}º quarto`
      : `${period - 4}ª prorrogação`;
export const disciplineName = (p: GamePlayer) =>
  p.status === "excluded"
    ? "Excluído por cinco faltas"
    : p.status === "GD" || p.status === "D"
      ? "Desqualificado"
      : null;
