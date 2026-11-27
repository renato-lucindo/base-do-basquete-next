import { useSyncExternalStore, type ReactNode } from "react";
import "./profile-games.css";

/** Shared confrontation layout for athlete and team profiles. */
export function ProfileMatch({
  home,
  away,
  score,
  fullNames = false,
}: {
  home: { name: string; abbreviation?: string | null };
  away: { name: string; abbreviation?: string | null };
  score: ReactNode;
  fullNames?: boolean;
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
    <span
      className={`player-matchup team-profile-match${fullNames ? " profile-match-full" : ""}`}
    >
      {team(home)}
      <strong className="player-match-score">{score}</strong>
      {team(away)}
    </span>
  );
}

const compactQuery = "(max-width: 639px)";
const subscribeCompact = (notify: () => void) => {
  const media = window.matchMedia(compactQuery);
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
};
export function useCompactProfileGames() {
  return useSyncExternalStore(
    subscribeCompact,
    () => window.matchMedia(compactQuery).matches,
    () => false,
  );
}

/** Same compact hierarchy for recent games, game history and career records. */
export function ProfileMatchRow({
  metadata,
  children,
  context,
}: {
  metadata: ReactNode;
  children: ReactNode;
  context: ReactNode;
}) {
  return (
    <span className="profile-match-row">
      <span className="profile-match-metadata">{metadata}</span>
      {children}
      <span className="profile-match-context">{context}</span>
    </span>
  );
}
