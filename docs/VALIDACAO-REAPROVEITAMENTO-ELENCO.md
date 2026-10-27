# Reaproveitamento de elenco e pré-seleção de identidade

27/10/2026, branch `codex/reaproveitar-elenco`, base `cc02882`. Auditoria do projeto anterior concluída e commitada antes da implementação. Nenhum código antigo executado ou migration antiga copiada. `.agents/` e `skills-lock.json` humanos preservados.

## R1: prévia pura, ainda sem produto integrado

- RED real: `.preview-artifacts/roster-reuse-preview-red.log`, seis asserções falharam contra retorno vazio; não foi falha de import ausente.
- GREEN inicial: seis casos em416ms, `.preview-artifacts/roster-reuse-preview-green.log`.
- Composição final: `npx vitest run src/people/roster-reuse.test.ts src/text-import/name-matching.test.ts src/people/transfer.test.ts`,43PASS/3arquivos em586ms; `.preview-artifacts/roster-reuse-composition.log`. Sete casos próprios, incluindo limite201 sem truncamento e correção explícita até200.
- Prévia valida mesma equipe/campeonato/temporada e outra disputa; preserva destino existente, identidades e camisas0/00/null, bloqueia naipe/vínculo/transferência e conflitos de camisa. Não cria pessoa/equipe/inscrição, não grava banco e não altera origem.
- Não há reader/writer SQL, API ou diálogo de reaproveitamento disponíveis ainda. Esta prova pura não equivale a integração ou capacidade real de banco.

## Correspondências de alta confiança no importador atual

Pedido adicional do responsável: não exigir conferir individualmente nomes e registros já correspondentes. A descoberta já estava disponível no matching, mas `refreshMatches` descartava todas as escolhas existentes para os statusregistration/name/suggestion.

`automatic-match.ts` escolhe somente identidade segura, com `approveChanges:false`, mantém camisa/vínculo existente porID quando apropriado e deixa a confirmação do conjunto como única operação de gravação. Registro exato único tem prioridade; nome completo normalizado deve ser único; grafia muito próxima exige data completa igual. Homônimos/primeiro nome isolado e dados contraditórios permanecem pendentes. Não altera o matcher SQL nem suas guardas, não aprova campos globais e não desfaz decisões manuais ou linhas desmarcadas.

- RED: `.preview-artifacts/automatic-match-red.log`, três asserções de seleção falharam e três guardas já passaram contra retorno nulo. Nenhum código de produto antes do RED desse helper.
- GREEN: seis casos novos e composição com contrato/matching/prévia,31PASS/4arquivos em790ms; `.preview-artifacts/automatic-match-green.log`.
- Desktop: `npx playwright test tests/automatic-import-match.spec.ts tests/text-import.spec.ts --project=desktop`,11PASS em24,8s; `.preview-artifacts/automatic-match-browser-green.log`. Inclui seleção pelo registro entre homônimos, nome exato, nenhuma gravação antes de confirmar, retomada sem cliques individuais, ausência de pessoa duplicada, homônimos pendentes, escolha manual/linha desmarcada e regressões de ACK/reauth/conflito do importador.
- A primeira execução dos três browsers falhou apenas por locator exato de “Conferência salva”, que é parte de uma mensagem composta. Snapshot comprovou estado salvo. Corrigido para status com sufixo exato, sem correção de produto por essa falha. Não declarar a primeira execução aprovada.
- `npm run typecheck` PASS; ESLint focal dos arquivos novos/afetados PASS.
- Gate consolidado final **PASS/exit0:573unitários/117arquivos,6transportes,13PostgreSQL,23workerd,uma prova com4PDFs**, builds/tipos/lint/formato/fronteira/segredos738 aprovados. Log `.preview-artifacts/automatic-match-final-gate.log`, SHA256 `3b75324e7f38f434af8316e5a9d3f441f37e6a4f5f4ddd5e2b1df833542e5a99`. Browsers focais SHA256 `4dddeb69ed2fea50c1a2ebe40a61653237a148c2a4159c22c85bf5b3d7241ad8`. CI/deploy ainda pendentes; não atribuir esta evidência a código futuro de R2.
- Revisão do próprio autor; sem agente revisor independente disponível. Fixtures controladas não são aceite humano ou teste HTTP autenticado no ambiente real.

## Próximo

Gate consolidado quando a correção de pré-seleção estiver estável, CI e preview protegido conforme pipeline existente. Depois R2 de reaproveitamento porIDs com banco real descartável e versão/contexto, antes de oferecer cópia na interface. Nenhum dado humano removido/reescrito para testar;48migrations aplicadas permanecem imutáveis.
