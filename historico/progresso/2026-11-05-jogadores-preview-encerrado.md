# Progresso atual

Unidade concluída: **Estatísticas dos Jogadores**, plano explícito de05/11/2026. PR [#57](https://github.com/renato-lucindo/base-do-basquete-next/pull/57) **INTEGRADA** em05/11 13:11:33UTC por merge **41452f9a2e450df97e51aa272c5f5187c4c24162**, Git/GitHub conferidos. HEAD8936f60e9081fd49679e6620ae029d20b579ec3d teve CI **42029539741/check127252151815 SUCCESS**. Base/HEAD/diff/reviews/threads conferidos, merge commit com expected_head_sha; reviews/threads vazias, revisão do autor sem independente.

CI **PUSH do merge42033583222/job127265870041 SUCCESS**, conferida no conector após conclusão: gate, design:verify, test:e2e, uploads e finalização passaram.

Implementado: padding14/10px,30linhas/paginação antes da legenda, máximos positivos de faltas antes de paginar, camisa modal por atleta/inscrição contando relacionados sem jogar, legenda enxuta, remoção de cobertura e de opções avançadas nas disputas exclusivamente de súmula. API mantém20linhas por padrão e acrescenta `hasBoxscore` no opt-in30. Histórico/cálculos compartilhados preservados. [Decisões](design/PUBLICO.md#refinamento-de-jogadores--decisão-de05112026), [provas/capturas/limites](design/VALIDACAO-JOGADORES-REFINAMENTO.md).

## Verificação

Gate local exit0:704unitários/146arquivos, transporte11, banco isolado13, Worker/HTTP30, PDF1, lint/formato/tipos/build/fronteira cliente/segredos PASS. Browsers57PASS/7skips mobile preexistentes +4capturas finais +2retorno última página +2controles/colunas +10fidelidade PASS. Nenhuma migration, seed, DML ou publicação de dados. Revisão do autor com ui-ux-pro-max/web-design-guidelines; não houve parecer independente.

## Serviço publicado e verificação

Pacote FRESCO preparado do SHA integrado limpo em worktree nativo task-owned **C:/Users/12405304716/.codex/worktrees/jogadores-preview-41452f9/Base do Basquete-v1**, detached41452f9. npmci ignore-scripts, build/buildfoundation/buildworker dry-run, fronteira cliente, prepare e segredos PASS; árvore limpa. Log local `.preview-artifacts/players-package-build.log` nesse worktree.

Verificador `.preview-artifacts/players-preview-verify.mjs` passou:32assets/hash/source,3aliases,3APIs privadas401,health200,worker.js404,zero saídas externas. Resultado `.preview-artifacts/players-preview-runtime-result.json`. Payload SHA256 **77be74f456cf13f4e128c243428f8d6e057d1be6368570df93ad07725e87912d**, manifest **6adc9959554aa73bfca410fc9548f25250aeb0f29677cf7a1ea8bad646ed7510**, worker **ed81905c152e8dd7804e3d400636d98e8b414c2194363b855f5f6a9b01acfc63**. Quatro módulos JÁ extraídos para `.preview-artifacts/uiux-preview/`, configuração preservada e dry-run específico PASS. Não reconstruir/reextrair se hashes permanecerem iguais. O ZIP antigo3ed808b permanece imutável.

Deploy autorizado concluído **somente** no Worker [base-do-basquete-next-uiux](https://base-do-basquete-next-uiux.renato-lucindo-jr.workers.dev): deployment **d6218ce9-6c00-41dc-9954-e3934908b1cd**, versão **7fd61d4e-400f-4e45-a86f-16d291c29dc3**,100%, em05/11 **13:37:48UTC /10:37:48America/Sao_Paulo**. Fonte41452f9 conferida na mensagem da versão; hashes dos quatro módulos/configuração conferidos antes do upload. CLI exit0; metadata remota confirmou versão, origem própria, backenddev, namespace2ac0ffe60c2d490cb7f457c444f24859 e nomes dos segredos preservados, sem ler/rotacionar valores. Log `.preview-artifacts/players-preview-deploy.log`.

Browser real validado na Copa ES/Sub-15:93registros,30/30/30/3linhas, última página sem avanço, padding14px, paginação antes da legenda, PP% atualizado e ausência de cobertura/opções avançadas/cinco notas. Faltas com maior positivo destacadas e zeros sem destaque; camisas0 e empates visíveis. Capturas locais `.preview-artifacts/players-preview-first.jpg` e `players-preview-last.jpg`; aba do preview mantida aberta. Prova de32assets/hash é do runtime local; não afirmar verificação remota integral dos assets ou certificação WCAG.

Worker principal permanece no deployment00dffb6b-1d5c-4433-9214-768013ed6277; não atualizar domínio principal nem Access. Migrations20261104171445/20261104185633 já aplicadas somente no desenvolvimento; não reaplicar.

## Continuidade

PRs51–56 concluídas, CI HEAD/main SUCCESS. [Checkpoint anterior do preview](../historico/progresso/2026-11-05-preview-independente-aberto.md), [encerramento56](../historico/progresso/2026-11-04-pr56-integrada.md) e [histórico preservado](../historico/progresso/2026-11-05-preview-canonico-encerrado.md) incorporados nesta unidade sem perder contexto.

Preservados checkout humano sync/trabalho-casa/CONTRIBUTING modificado/skills pessoais, demais worktrees e previews4189/5177/5180. [Registro de integração57](../historico/progresso/2026-11-05-pr57-integrada.md). **Equipes foi somente planejada** nesta conversa: abrir Por jogo/PTSdesc, manter regra coletiva, preparar revisão dos13jogos; não iniciar implementação nem republicar dados por inferência. [Planejamento e diagnóstico](../historico/progresso/2026-11-05-equipes-planejamento.md).

Sem implementação ativa restante nesta unidade. Automação **retomar-piloto-uiux-pr-51 PAUSED**, atualização oficial confirmou pausa por conclusão. Branch local codex/estatisticas-jogadores/HEAD8936f60 e origin/main41452f9 possuem árvores de produto idênticas. Checkpoint/históricos pós-merge ficam locais, sem nova PR/push documental; incorporar numa próxima unidade autorizada. Última medição real36% restante5h/60% semanal, reset1793897436. Equipes permanece somente planejada, sem republicar os13jogos.
