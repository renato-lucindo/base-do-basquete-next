import { useNameTooltip } from "../statistics/reference/tooltip";
import type { RecentResult } from "./recent-results";

const compactDate = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "UTC",
});

function ResultIcon({
  result: { game, won, opponentId },
  latest,
  label,
  compactLabel,
}: {
  result: RecentResult;
  latest: boolean;
  label: (id: string) => string;
  compactLabel: (id: string) => string;
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
  const dateSuffix = game.date
    ? ` - ${compactDate.format(new Date(`${game.date}T00:00:00Z`))}`
    : "";
  const tooltip = `${compactLabel(game.homeRegistrationId)} ${game.score?.homePoints ?? "—"} x ${game.score?.awayPoints ?? "—"} ${compactLabel(game.awayRegistrationId)}${dateSuffix}`;
  const tip = useNameTooltip(tooltip);
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
  compactLabel,
}: {
  results: RecentResult[];
  teamName: string;
  label: (id: string) => string;
  compactLabel: (id: string) => string;
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
            compactLabel={compactLabel}
          />
        </li>
      ))}
    </ol>
  );
}
