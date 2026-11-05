# Progresso atual

Atualizado em04/11/2026 22:54America/Sao_Paulo. Unidade: corrigir abertura do Worker de preview, por pedido explícito **“corrija”**, após **“desative access”**. Reforma UI/UX anterior concluída nas PRs51–55 com CI HEAD/main SUCCESS; automação anterior pausada. [Encerramento anterior e Access](../historico/progresso/2026-11-04-uiux-concluida-access-preview.md), [PR55](../historico/progresso/2026-11-04-pr55-integrada.md).

## Unidade atual

Worktree C:/Users/12405304716/.codex/worktrees/reforma-uiux, branch **codex/preview-canonical** criada de origin/main84e641d3838b7ffdc44a2997a2d232920dfaad05 após consultar branches/PRs existentes. Alterações humanas/outros worktrees preservadas. HEAD local/remoto **2ce44f492a1a6a8e3103dccc47ef1181dd90bebd**, push confirmado; [PR56](https://github.com/renato-lucindo/base-do-basquete-next/pull/56) **integrada em05/11 02:16:44UTC (04/11 23:16:44America/Sao_Paulo)** por merge **5d028e5ec97b072ccb37da329da9183999cf2e5e**, confirmado Git remoto/GitHub. Origin/main nesse SHA; árvores idênticas ao HEAD. CI HEAD41951735998/check126997016765 **SUCCESS**; diff/base/HEAD/reviews/threads conferidos, expected_head_sha aplicado. Reviews/threads vazias; revisão do autor sem parecer independente.

CI **push41954149133/job127004881724 SUCCESS** no merge5d028e5, conferida em05/11 03:19:02UTC /00:19:02America/Sao_Paulo, incluindo gate/design/e2e/uploads/finalização. Correção integrada e validação consolidada concluídas. Checkpoint/histórico pós-merge permanecem locais, sem commit/push; reconciliar somente numa futura unidade autorizada, sem PR apenas para salvar a própria conclusão.

Causa: app publicada aceita apenas APP_ORIGIN=https://basedobasquete.com.br; workers.dev retornava421 invalid_host. Correção estrita no wrapper: somente GET/HEAD do hostname exato do preview, fora de /api, redirecionam302/no-store ao domínio canônico, preservando caminho/query. APIs, escritas, outros hosts e validações de sessão/CSRF ficam inalterados. Preparador de pacotes futuros usa a mesma função. Patch do bundle existente exige fonte/estrutura/hash esperados; recusa reaplicação ou bundle inesperado.

## Publicação operacional autorizada

Pedido “corrija” autoriza o reparo deste serviço. Aplicado via PUT /workers/scripts/base-do-basquete-next-preview/content, que substitui somente conteúdo; **nenhum pacote UI/UX novo publicado**. Mesmo bundle de aplicação eff36fe com acréscimo719 caracteres no wrapper; assets/mapa preservados. Deployment **00dffb6b-1d5c-4433-9214-768013ed6277**, versão **139410ce-a8d6-4710-9b94-e1b1222cd3dc**,100%, criado05/11 01:51:43UTC (04/11 22:51:43America/Sao_Paulo). Rollback de código: versão35f5b882-70b1-48f7-8bb3-fda632bd458e, revalidar antes de executar; não desfaz Access/dados.

Hash JS original928e986176a43a3b6323563f701b482c8189aa14d85e9464be098acd9b49e238 → corrigido458590f3878490f86616a0606fc8c6753a2c5a7fe68ae087760770b3c106cb63; releitura remota confirmou. Mapa099f05ac22d17b379389e54eb7b4f3a6e8cac882a670cf146a2b85c722a2df75 preservado. Bindings/namespace0411ac931ca54d289d270606c7e87ef7/compatibilidade/tags/observabilidade conferidos iguais. API regenerou anotações de upload; X-Bdb-Source continuaeff36fe para a aplicação original. Nenhum segredo lido/rotacionado, DML, banco ou Auth alterado.

Access permanece Bypass/Everyone só no preview, decisão explícita anterior. Outros quatro apps Allow. Backup local .preview-artifacts/access-preview-before-disable.json. O uploader completo ainda exige owner-only Access: futura liberação UI/UX deve reconciliar essa decisão antes de usar o pacote, sem ignorar o gate.

## Evidências e próximo passo

RED no teste de redirecionamento; GREEN4 cenários (GET/HEAD/path/query/destino fixo/negativas/patch e delegação). Transporte11PASS. Gate local **exit0**,699unitários/145arquivos,transporte11,banco13,Workerd30,PDF1, lint/formato/tipos/build/fronteira/segredos PASS, log .preview-artifacts/preview-canonical-gate.log. Lint focal cobre os scripts finais. Releitura do conteúdo/configuração real PASS. Navegador seguiu o redirecionamento atébasedobasquete.com.br, mas o destino recebeu ERR_CONNECTION_RESET neste ambiente; não contornar restrições de rede nem alegar navegação visual completa.

Unidade concluída: PR56 e CI HEAD/main SUCCESS. Automação retomar-piloto-uiux-pr-51 **PAUSED**, atualização e confirmação oficiais após conferência final. Sem nova unidade ou publicação UIUX automática. Limite de navegação ERR_CONNECTION_RESET no destino continua registrado; não afirmar acesso visual completo. Testes usam fixtures; trabalho humano/outros worktrees/previews preservados. Última cota real12% restante5h/73% semanal; apenas encerramento mínimo seguro, sem créditos/reset manual. Não há retomada pendente porque a unidade foi concluída.
