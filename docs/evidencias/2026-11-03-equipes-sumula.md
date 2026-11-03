# Estatísticas coletivas de Equipes — súmula

Pedido de 03/11/2026, mesma unidade `codex/navegacao-publica`, [PR #49](https://github.com/renato-lucindo/base-do-basquete-next/pull/49) para main. Base do incremento `77c094853a3dcad1fd6113446866763d8be5d144`; código **`e58147b388d7807465d41503246a69717d5779bf`**, enviado à PR. A [CI 41658364734](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/41658364734) anterior foi SUCCESS e não valida este incremento.

## Comportamento e fonte

- Essenciais da disputa exclusivamente de súmula: **Pos | Equipe | J | PTS | 2P | 3P | FC | FR | LLT | LLC | LL% | T | U | GD**. Presets/colunas explícitas continuam respeitados; boxscore conserva seu comportamento. Uma linha por inscrição, não por nome/equipe global.
- `mode=total|per-game`: todas as contagens pedidas dividem por J, inclusive PTS e GD; J permanece quantidade de jogos. LL% usa soma de LLC/soma de LLT, sem média de percentuais; sem tentativas é —. Ordenação usa valor integral, e ranking compartilhado 1,1,3 é atribuído antes da paginação. Nome e métricas indisponíveis não recebem posição estatística.
- Componentes compartilhados de Jogadores: `MetricCell`, `ScrollableTable`, `ColumnPicker`, `StatisticsSortHeader`, `TooltipProvider` e `rankSortedRows`; sem outro sistema visual. Foco/teclado, setas, `aria-sort`, siglas acessíveis e rolagem interna. Colunas manuais persistem na sessão; URL explícita prevalece.
- T deriva das ocorrências T/C/B técnicas, incluindo treinador principal, assistente/banco por sua penalidade técnica e todos os treinadores em sucessão. Não soma `coachB` do último treinador como se fosse todo o jogo. B2 não conta outra técnica. FC mantém faltas dos atletas da fonte e já inclui suas T/U; U conserva as infrações originais.
- A fonte anterior não identifica todas as pessoas desqualificadas no banco nem FR. `source.teamReview` permite conferir **totais inteiros de GD e FR** por lado na mesma confirmação autenticada. GD é o total de toda a equipe, incluindo atletas, técnico, assistente e banco: não se soma novamente ao mínimo identificado. Menor que o mínimo do motor é rejeitado. Capitão que também atua como treinador conta uma pessoa. FR não é inferida de FC adversárias. Em branco conserva null; zero é entrada explícita.
- A projeção opcional/versionada `facts.teams[side].teamStatistics` contém somente T/GD/FR públicas. Não divulga autoria privada, mapa de comissão, motivos ou cadastros atuais. Publicações antigas sem contrato e jogos sem revisão suficiente conservam ausência/cobertura parcial; não há backfill. Correção pública substitui a versão na fonte existente; rascunho não altera a anterior.
- Migration nova `20261103153010_sheet_team_statistics.sql`: escritor existente preserva autorização, locks, versões, recibos e transação; novos helpers privados têm EXECUTE revogado dos papéis de API. Migrations anteriores imutáveis. Sem novas tabelas/RPCs anônimas, permissões ampliadas ou leitura privada na estatística.

## Verificações

- Focais puros/banco: cálculo integral de colunas, LL% ponderado/zero, médias, fases, inscrições distintas, correções e versões duplicadas; T de todos os treinadores, GD de atleta/treinador/assistente/banco com total explícito, deduplicação de capitão/treinador e B2. PGlite cruza motor/SQL, rejeita revisão inválida, confirma leitura anônima e que rascunho não publica.
- Browsers iniciais: **42 PASS / 22 SKIP** em equipes, publicação manual e Jogadores simples. Novo percurso com médias/ranking/persistência/URL, tooltip por teclado e axe: **2 PASS** desktop/mobile. Expectativas intermediárias corrigidas para incluir seta de ordenação, direção ascendente inicial de T e LL% zero conhecido do adversário com tentativas. Uma execução concorrente ao gate esgotado em memória excedeu o prazo no axe; repetição isolada passou, sem aumentar timeout.
- Gate inicial interrompido após falta de memória no Vitest. Fechamento com `VITEST_MAX_WORKERS=2`: **PASS**, 682 testes/139 arquivos, 6 transportes, 13 de banco descartável, 28 Workerd e 1 runtime PDF; tipos/lint/formato/builds/fronteiras/segredos aprovados. Ajuste textual final no seletor de boxscore conferido depois em tipos/lint. Sem desativar testes.
- Fechamento de browser: `npx playwright test tests/team-statistics-columns.spec.ts tests/team-statistics.spec.ts tests/sheet.spec.ts tests/statistics.spec.ts tests/statistics-simple.spec.ts --workers=2`: **74 PASS / 22 SKIP**. Substitui as execuções exploratórias sobrepostas acima. [CI 41668681851 SUCCESS](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/41668681851), SHA `e58147b388d7807465d41503246a69717d5779bf`: 682 testes/139 arquivos, 6 transportes, 13 de banco descartável, 28 Workerd, 1 runtime PDF, protótipos e **539 browsers PASS / 109 SKIP**. Logs do job `126030838749` conferidos. Checkpoint posterior somente documental; artefatos de código inalterados, sem repetir suítes locais por documentação. Checks do SHA posterior disponíveis na PR.
- Revisão local UI/UX: regras do projeto, busca focal da skill e diretrizes atuais de interface; fixtures em desktop 1366×768/1920×1080, mobile 390×844, nomes longos, reflow 320 px e ampliação CSS 200%. Provas automatizadas não representam aceite humano, revisão independente ou conformidade WCAG integral.

## Capturas e preview local

[Desktop com fixtures](navegacao-publica/equipes-sumula-desktop.png) · [Mobile com fixtures](navegacao-publica/equipes-sumula-mobile.png).

[Preview local de Equipes](http://127.0.0.1:5178/equipes.html#f9000000-0000-4000-8000-000000000801?mode=total&sort=points&direction=desc), sem banco humano. Servidor temporário da sessão, gerado do adaptador `scripts/preview-public.ts` com as fixtures disciplinar/coletiva em `.preview-artifacts/preview-team-sheet.mjs`; servidor anterior em 5177 preservado. HTTP e DOM confirmaram fonte de súmula, 14 colunas, T=10/GD=12 no total da fixture e ausência de alertas/transbordamento. Abertura no painel do Codex foi enfileirada; renderização verificada no navegador gerenciado. Não é um deployment Cloudflare.

## Arquivos

- Cálculo/contrato/consulta: `src/team-statistics/{aggregate,contract,detail,domain,metrics,navigation}.ts`; `aggregate.test.ts`, `scoresheet.test.ts`.
- Interface: `src/team-statistics/{public-page,public-tables}.tsx`, `screen.css`; compartilhados `src/statistics/ranking.ts`, `query.ts`, `reference/{sort-header,scoresheet-statistics-table}.tsx`.
- Publicação: `src/publication/{contract,manual,provider,sheet-team-statistics}.ts`, `sheet-panel.tsx`, `sheet-team-statistics.test.ts`, `sheet-team-database.test.ts`; migration citada acima.
- Browsers/fixtures: `tests/{sheet,team-statistics,team-statistics-columns}.spec.ts`, `tests/fixtures/{sheet-team-statistics,statistics-publications}.ts`.
- Contratos/evidências: ADR 018, `docs/design/PUBLICO.md`, matriz, índice, este relatório e checkpoint; checkpoint anterior preservado em `historico/progresso/2026-11-03-antes-equipes-sumula.md`.

## Implantação e limites

**Sem migration remota, publicação de dados humanos, deploy ou merge neste pedido.** PR voltou a draft pela evolução de fonte ainda não aplicada. O [preview protegido](https://base-do-basquete-next-pr49.renato-lucindo-jr.workers.dev/publico.html) continua no código `7720909`, versão `61d47226-5f8b-4693-930c-44e5e33529ce`; não demonstra o novo ajuste. Access e outros previews preservados. A nova fonte só estará disponível no serviço após autorização própria de migration e deploy; completar históricos exige revisão/republicação explícita, nunca automática.
