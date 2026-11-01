# Ocorrências e efeitos competitivos — plano

> Executar inline com superpowers:executing-plans/TDD. Escolhas reversíveis de implementação delegadas pelo responsável; este plano detalha R2d/R2e do regulamento existente, sem nova aprovação redundante. O ZIP continua sendo a especificação do produto.

**Objetivo:** representar as exceções de ESCOPO§7/VALIDACAO A24 sem fabricar fatos individuais, preservando jogos e publicações originais.

**Arquitetura/stack:** contratos fechados TypeScript/Zod e prévias puras no módulo regulation; persistência autorizada/versões/histórico/RLS/API/UI entram em R3. Nenhuma dependência/serviço/DDL/deploy novo neste núcleo. Regulamento atual: plano2026-10-24-regulamento-classificacao.md, decisão012.

**Decisão do implementador:** separar fato jogado de efeito administrativo. Converter W.O. em CompetitiveFact played misturaria estatística com decisão; alterar diretamente publicação perderia a origem. O núcleo emite award próprio com pontos de classificação e placar administrativo opcional, mantendo publicação original intacta. Não escolhe regra FIBA universal nem programa enviado pelo usuário.

## R2d — catálogo e prévia das ocorrências

Criar src/regulation/{occurrences,occurrences.test}.ts. Interfaces `occurrencesInputSchema` e `previewOccurrences(unknown)`.

- [x] Testes RED: W.O. exige regra explícita com winnerLeaguePoints/loserLeaguePoints e score nullable; vencedor é uma das duas inscrições; sem score não inventar0–0. Regra com score exige vencedor maior que perdedor.
- [x] Entrada estrita: disputeId/regulationVersion/registrationIds, games[{id,version,disputeId,homeRegistrationId,awayRegistrationId}], publishedGames CompetitiveFact[], occurrences atuais, withdrawals atuais. Um fato e uma ocorrência atual por jogo; IDs/contextos/versões dos comandos são conferidos, sem escolher maior versão silenciosamente. Limites1000inscrições/10000jogos ou fatos ou ocorrências/1000desistências.
- [x] Ocorrência exige id/version/gameId/gameVersion/publicationVersion/motivo. Tipos fechados postponed/interrupted/cancelled/wo/administrative. Os dois primeiros mantêm pendência sem perder agenda/rascunho; cancelamento exclui competitivamente. W.O. usa regra explícita. Decisão administrativa exige efeito exclude ou award com vencedor, pontos de classificação por lado e score nullable explícitos. Motivo obrigatório; não há código/fórmula nem atleta/minutos/participação no contrato.
- [x] Desistência exige inscrição, versão/motivo, previousGameIds e política keep_results/exclude_results. Anteriores são IDs explícitos, sem inferência por data; todos precisam ser da inscrição e possuir resultado publicado ou award. Exclude afeta somente classificação desses jogos, preservando fontes e fatos históricos/individuais. Futuro jogo sem decisão segue pendente, sem W.O. automático. Resultado publicado fora da relação revista fica conflito, não some silenciosamente. Award explícito de jogo futuro pode resolver a pendência. Duas desistências conflitantes não dependem da ordem da lista: exclusão prevalece para jogo explicitamente afetado por exclude.
- [x] Saída sempre preview: jogos ordenados, estado played/awarded/pending/excluded/conflict, outcome separado, publicação original preservada, motivos/referências de ocorrência/desistência e linhagem de versões. Sem mutação da entrada, sem criar estatística individual e sem confirmar/publicar coisa alguma.
- [x] GREEN focal, composição R1/R2 e tipos/lint/formato; commit identificado. Guardar CI/gates pelo escopo efetivo. Não repetir G4/harness inalterados.

## R2e — consumir efeitos nos derivados

- [x] Testes RED e resolvedor de classificação por outcomes: pontuação explícita e vitórias administrativas, saldo/pontos só com cobertura declarada. Se critério exige placar desconhecido, empate fica bloqueado nesse critério; não saltar para critério posterior e escolher classificado indevidamente. Confronto direto continua no conjunto ainda empatado.
- [x] Testes RED e séries com awards: melhor-de-N aceita vencedor administrativo declarado sem pontos individuais, ida-volta só soma quando ambos placares competitivos são conhecidos. Pendências/exclusões não se tornam vitória ou0–0; manter trilha da decisão. Não adulterar CompetitiveFact para reutilizar API played.
- [x] Conectar grupos/cruzamentos de prévia a esses derivados, preservando código/contratos antigos quando não há ocorrência e mostrando conflitos de avanço. Escopo do writerR3 continua obrigatório.
- [ ] Gate consolidado da composição estável/CI, histórico/documentação e próxima unidade exata. Não disponibilizar formato/ocorrência em UI antes de entregar cálculo correspondente.

## Revisão e limites

Revisar versões de jogo/publicação, duas ocorrências sobre o mesmo jogo, empate com dados ausentes, desistências de ambos adversários e correção que afeta chave. Nenhuma prova de concorrência multi-conexão, carga ou WCAG é presumida. Contrato puro não comprova autorização/verdade do catálogo; writer futuro consulta/locka dados autoritativos e mantém histórico/versionamento/motivos. Mudança de regulamento com resultados apresenta impacto antes de confirmar.

Cota real entre unidades/antes de longas; aos85%usados5h menoroperação/checkpoint/push/MESMAautomação reset+2, também limite semanal, sem compras/plano/resetmanual. PreviewG4continua protegido e avaliação/pilotoStorageHTTP humanos ainda pendentes.
