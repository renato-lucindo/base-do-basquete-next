import type { ReactNode } from "react";
import "./profile-games.css";

/** Shared confrontation layout for athlete and team profiles. */
export function ProfileMatch({
  home,
  away,
  score,
}: {
  home: { name: string; abbreviation?: string | null };
  away: { name: string; abbreviation?: string | null };
  score: ReactNode;
}) {
  const team = (value: typeof home) => (
    <span className="player-match-team">
      <span className="public-visually-hidden">{value.name}</span>
      <span className="player-team-short" aria-hidden="true">
        {value.abbreviation || value.name}
      </span>
      <span className="player-team-full" aria-hidden="true">
        {value.name}
      </span>
    </span>
  );
  return (
    <span className="player-matchup team-profile-match">
      {team(home)}
      <strong className="player-match-score">{score}</strong>
      {team(away)}
    </span>
  );
}
