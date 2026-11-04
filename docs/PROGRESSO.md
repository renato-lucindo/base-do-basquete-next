# Progresso atual

Atualizado em04/11/2026. [Preparação final/pacote/rollback](design/PREPARACAO-LIBERACAO-UIUX.md) · [Plano UI/UX](design/REFORMA-UIUX.md) · [Histórico da PR54](../historico/progresso/2026-11-04-pr54-integrada.md).

## Autorização e unidade final

Piloto aceito; **“Realize todas essas etapas na sequência”**, reiterado **“realize então”**: perfil/piloto → público real → busca servidor → administração → validação/preparação de liberação. PRs51–54 integradas e suas CIs de HEAD/main SUCCESS. Uma unidade/PR por vez, sem pilha. Perfil contínuo/súmula vigente preservados; sem boxscore/comparação/recordes novos ou fixtures no banco real.

Worktree `C:/Users/12405304716/.codex/worktrees/reforma-uiux`, branch **codex/preparacao-uiux** criada diretamente de origin/main**3ed808b6060b1b15cac9f6c9092ec3da9327feb4** após CI integrada SUCCESS e consulta de PRs abertas vazia. Mudanças documentais/ checkpoint locais pós-PR54 preservadas e incorporadas. Recuperar HEAD por Git após commit desta unidade; PR final ainda a abrir. Nenhum código de produto, API, schema ou configuração alterado nesta unidade.

## Fonte validada e pacote concreto

**PR54 merge3ed808b**, CI HEAD41925745265/check126909582570 e **CI main41928948150/job126920616911 SUCCESS**, inclusive gate/design/e2e/finalização;605browsers PASS/109skips prévios. P2 automático PRRT_kwDOVT8vGc6zwQPY corrigido e resolvido após RED/ GREEN. Revisão do autor + automática externa, sem parecer humano independente. Provas detalhadas/capturas nos relatórios de público, busca e administração.

Pacote construído em worktree task-owned separado e limpo **C:/Users/12405304716/.codex/worktrees/uiux-release-3ed808b**, detached no SHA3ed808b; não usar seus arquivos gerados como mudanças de produto. npm ci --ignore-scripts, builds cliente/foundation/Worker dry-run, fronteira cliente, prepare e segredos PASS. Audit omit-dev:0 vulnerabilidades reportadas; install completo sinaliza9 moderadas nas ferramentas, sem upgrade.

ZIP pronto em **.preview-artifacts/uiux-release-3ed808b.zip** no worktree da reforma,1.303.680bytes, SHA256**153098ff111a14df45d44884d2f923fcf58a94744b6db28d07bb1224f259105b**. Payload/manifest/hashes/instruções/verificador local/proposta de rollback incluídos. Workerd do próprio pacote:32 assets/hash/source,3 aliases,3 leituras privadas negadas,health200,worker.js404 e zero requisições externas PASS. O relatório final registra comandos, hashes, versão publicada e limites. Não repetir gates/provas do produto inalterado apenas por documentação.

## Serviço e banco

Somente GETs de metadados Cloudflare nesta unidade. Serviço publicado ainda **versão35/35f5b882-70b1-48f7-8bb3-fda632bd458e**, deployment09e26c1c-4e0e-46ea-8026-5d5c8a721d59,100%, fonte **eff36fe0eda76962e6babbc4a9464a98c3dad478**. **A reforma nova não foi publicada**. Domínio canônico público; app Access do preview e policy30cc3ab4-9331-4df6-8d13-d840c2652210 restrita a um email preservados. APP_ORIGIN/backend/namespace de sessões e nomes dos bindings conferidos; valores secretos não lidos ou rotacionados. Sem smoke remoto com POST/Auth nem DML.

Migrations **20261104171445_public_global_search** e **20261104185633_admin_game_ordering JÁ APLICADAS** exclusivamente no **base-do-basquete-next-dev/nizmasjddyrhmevvfviz**, autorizações/histórico/hash/grants/RLS/negativas/advisors nos relatórios. **Não reaplicar.** Autorização permanente de funções de leitura/privilégios mínimos nesse desenvolvimento em CONTRIBUTING/AGENTS, por **“Autorizo. Deixe essa autorização como padrão nos docs”**; sem nova pergunta dentro do escopo. Não cobre outros bancos, tabelas/dados, Auth/Access, redução de segurança, deploy ou publicação.

## Próxima ação e continuidade

Revisar formato/segredos/diff/links e integridade do ZIP, commit/push e abrir PR documental final; acompanhar CI do HEAD, reviews/threads e integrar com expected_head_sha. Conferir CI do SHA integrado antes de concluir a sequência e pausar a mesma automação. O pacote usa o SHA de produto3ed808b; a documentação posterior não altera seu código. Deploy e publicação permanecem operações distintas, com proposta concreta e rollback preparados, sem executá-los automaticamente.

Checkout humano sync/trabalho-casa com alterações/skills pessoais, demais worktrees/previews4189/5177 preservados. Preview task-owned5180fixtures/session65608 herdado, sem banco humano. Novo worktree de empacotamento é desta unidade; mantê-lo até a entrega dos artefatos, sem limpeza de outros worktrees.

Última cota real **55% restante5h/80% semanal**, reset1793848933. Aos15% restante: mínimo seguro/checkpoint e mesma automação `retomar-piloto-uiux-pr-51` para reset observado+2min, sem créditos/resets manuais. Atualizar agendamento oficial ao entrar em espera de CI; manter ACTIVE até TODA sequência concluir ou pedido explícito de parar. Não notificar estado inalterado.
