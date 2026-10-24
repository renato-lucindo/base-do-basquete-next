import type { RegulationDefinition } from "./persistence-contract";
import type { z } from "zod";
import type { regulationProjectionSchema } from "./view-contract";
import { criteriaLabels } from "./definition-editor";
type Projection = z.infer<typeof regulationProjectionSchema>;
export function RegulationProjection({
  value,
  definition,
  names,
  title,
}: {
  value: Projection;
  definition: RegulationDefinition;
  names: Map<string, string>;
  title: string;
}) {
  const label = (id: string | null) =>
    id ? (names.get(id) ?? "Inscrição selecionada") : "A definir";
  return (
    <section className="reg-projection">
      <h3>{title}</h3>
      <p>
        Classificação provisória. Empates e pendências não confirmam
        classificados ou colocações.
      </p>
      {value.groupPhases.map((p) => (
        <section key={p.phaseId}>
          <h4>
            {definition.groupPhases.find((n) => n.phaseId === p.phaseId)
              ?.name || "Fase de grupos"}
          </h4>
          {p.groups.map((g) => (
            <section key={g.groupId}>
              <h5>
                {definition.groupPhases
                  .find((n) => n.phaseId === p.phaseId)
                  ?.groups.find((n) => n.id === g.groupId)?.name || "Grupo"}
              </h5>
              {g.pendingGameIds.length > 0 && (
                <p>
                  {g.pendingGameIds.length} jogo(s) aguardando resultado ou
                  revisão.
                </p>
              )}
              {g.excludedGameIds.length > 0 && (
                <p>
                  {g.excludedGameIds.length} jogo(s) desconsiderado(s)
                  explicitamente na classificação.
                </p>
              )}
              {g.standings.status === "empty" && (
                <p>Sem resultados aplicados neste grupo.</p>
              )}
              <div
                className="reg-table"
                role="region"
                aria-label="Tabela de classificação"
                tabIndex={0}
              >
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Posição</th>
                      <th scope="col">Inscrição</th>
                      <th scope="col">Resultados</th>
                      <th scope="col">Vitórias</th>
                      <th scope="col">Pontos</th>
                      <th scope="col">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.standings.rows.map((r) => (
                      <tr key={r.registrationId}>
                        <td>
                          {r.position ?? "—"}
                          {r.tied && r.position !== null ? " (empate)" : ""}
                        </td>
                        <th scope="row">{label(r.registrationId)}</th>
                        <td>
                          {r.games}
                          <small>
                            {" "}
                            · {r.playedGames} jogado(s), {r.awardedGames}{" "}
                            decisão(ões)
                          </small>
                        </td>
                        <td>{r.wins}</td>
                        <td>{r.leaguePoints}</td>
                        <td>{r.difference ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {g.standings.tieSteps.length > 0 && (
                <details>
                  <summary>Critérios aplicados</summary>
                  <ol>
                    {g.standings.tieSteps.map((step, i) => (
                      <li key={i}>
                        {criteriaLabels[step.criterion]}:{" "}
                        {step.values
                          .map(
                            (v) =>
                              `${label(v.registrationId)}: ${v.value ?? "não informado"}`,
                          )
                          .join("; ")}
                        {step.blocked &&
                          ". Falta cobertura de placar para resolver este empate."}
                      </li>
                    ))}
                  </ol>
                </details>
              )}
            </section>
          ))}
        </section>
      ))}
      {value.series.map((n) => (
        <article key={n.id}>
          <h4>
            {definition.series.find((s) => s.id === n.id)?.name || "Confronto"}
          </h4>
          <p>
            {label(n.home.registrationId)} × {label(n.away.registrationId)}
          </p>
          {n.status === "conflict" ? (
            <p role="status">
              Há conflito neste confronto. Confira entradas e jogos atribuídos
              antes de avançar.
            </p>
          ) : n.result?.winnerRegistrationId ? (
            <p>Vencedor da série: {label(n.result.winnerRegistrationId)}</p>
          ) : (
            <p>
              {n.result?.needs === "score_or_decision"
                ? "Falta placar competitivo ou decisão para o agregado."
                : n.status === "tied"
                  ? "Empate agregado: decisão pendente."
                  : "Aguardando definição ou resultados."}
            </p>
          )}
          {n.result?.totals && (
            <p>
              Placar competitivo: {n.result.totals.homePoints} ×{" "}
              {n.result.totals.awayPoints}
            </p>
          )}
        </article>
      ))}
      {!value.groupPhases.length && !value.series.length && (
        <p>Nenhuma fase ou confronto configurado.</p>
      )}
    </section>
  );
}
