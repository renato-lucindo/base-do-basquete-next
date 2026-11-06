import { useNameTooltip } from "../statistics/reference/tooltip";
import type { RecentResult } from "./recent-results";

function ResultIcon({
  result: { game, won, opponentId },
  latest,
  label,
}: {
  result: RecentResult;
  latest: boolean;
  label: (id: string) => string;
}) {
  const date = game.date
    ? game.date.split("-").reverse().join("/")
    : "Data não informada";
  const description = [
    `${won ? "Vitória" : "Derrota"} contra ${label(opponentId)}`,
    `${date}${game.time ? ` às ${game.time} (Brasília)` : ""}`,
    game.score
      ? `${label(game.homeRegistrationId)} ${game.score.homePoints} × ${game.score.awayPoints} ${label(game.awayRegistrationId)}`
      : "Placar não informado",
    ...(game.state === "awarded" ? ["Resultado administrativo"] : []),
    ...(latest ? ["Resultado mais recente"] : []),
  ].join(" · ");
  const tip = useNameTooltip(description);
  return (
    <button
      type="button"
      className="standings-result"
      data-result={won ? "win" : "loss"}
      data-latest={latest || undefined}
      aria-label={description}
      {...tip}
    >
      <span className="standings-result-circle" aria-hidden="true">
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={won ? "m4 8 3 3 5-6" : "m5 5 6 6m0-6-6 6"} />
        </svg>
      </span>
    </button>
  );
}

export function RecentResultsCell({
  results,
  teamName,
  label,
}: {
  results: RecentResult[];
  teamName: string;
  label: (id: string) => string;
}) {
  if (!results.length) return <>—</>;
  return (
    <ol
      className="standings-results"
      aria-label={`Últimos resultados de ${teamName}, do mais antigo ao mais recente`}
    >
      {results.map((result, index) => (
        <li key={result.game.id}>
          <ResultIcon
            result={result}
            latest={index === results.length - 1}
            label={label}
          />
        </li>
      ))}
    </ol>
  );
}
