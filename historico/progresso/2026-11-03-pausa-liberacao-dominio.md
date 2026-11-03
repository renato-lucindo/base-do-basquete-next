# Progresso atual

Checkpoint de pausa por cota em 03/11/2026. Ler CONTRIBUTING.md antes de continuar. Contexto anterior preservado em [histórico](../historico/progresso/2026-11-03-dominio-antes-pausa-cota.md).

## Pausa e retomada automática

Ferramenta real: 96% consumidos / 4% restantes na janela de 5h; semanal 15% consumidos. Reset observado em 03/11/2026 às 19:07:37 America/Sao_Paulo (22:07:37 UTC). Retomada oficial confirmada pela ferramenta, heartbeat ACTIVE nesta conversa: `retomar-libera-o-do-dom-nio-ap-s-reset`, execução única em 03/11/2026 às **19:09:37**, reset + dois minutos. Nenhum merge ou deploy realizado nesta pausa.

O responsável reiterou que checkpoint e retomada automática após reset devem ser padrão deste projeto. CONTRIBUTING.md, seção Cota e retomada, já estabelece esse procedimento permanente, com gatilho preventivo de 15% restante, sem créditos ou reset manual e sem duplicar automações. Consultar a cota real ao retomar; se houver outro limite impeditivo, reagendar pelo próximo reset observado.

## Unidade autorizada e estado Git

Objetivo: campeonatos públicos em https://basedobasquete.com.br/ e administração em /admin. O responsável respondeu “sim” à autorização explícita de integração, migrations e deploy. Essa autorização permanece válida na retomada, limitada à unidade.

- PR #49: head `63917c9aabd1e780c433b3df4bb71b8c5877409e`, worktree detached `C:/Users/12405304716/.codex/worktrees/pr49-liberacao-20261103`, limpo no último exame. CI [41691195491](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/41691195491) em andamento na última consulta; gate passou, browsers ainda em execução. Não declarar sucesso sem consultar novamente. CI anterior de 895dd82 passou com 551 browsers/109 SKIP. Três novos apontamentos corrigidos e conversas resolvidas; conferir se surgiram outras antes do merge. Provas focais do código639: 12 unitários, 1 HTTP Workerd e 32 browsers PASS; builds, tipos e lint PASS. Detalhes em docs/evidencias/2026-11-03-liberacao-publica.md desse worktree.
- PR #50: branch `codex/dominio-proprio`, worktree `C:/Users/12405304716/.codex/worktrees/dominio-proprio`, código validado `04c1195d3397af985fef479c2b05becd34b02ab3`. CI [41685231916](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/41685231916) SUCCESS. Este checkpoint é apenas documental e ainda não compõe o código da PR49.
- main observada `d84c09eba7f79d6cd7c230788a5333754031925b`. PR49 e PR50 ainda abertas, sem merge. Não abrir outra branch/PR pela retomada.

## Banco e serviço publicados

Migrations **já aplicadas** no Supabase `nizmasjddyrhmevvfviz`: `20261103174254_sheet_team_statistics.sql` e `20261103174303_game_editor_metadata.sql`, arquivos preservados byte a byte na PR49. Não reaplicar, editar migrations ou ledger, nem executar seed/Auth/admin DML. Verificação real manteve 22 jogos, 17 publicados e 1 admin; nenhum novo apontamento de advisor.

Worker `base-do-basquete-next-preview`, deployment `08b39ef7-51bc-4f1f-b33b-69e0f741b2de`, versão `188ff4c2-b3ae-40ec-bb90-e3df7192429c` em 100%: somente configuração de origem/domínio alterada; bundle novo **não publicado**. APP_ORIGIN https://basedobasquete.com.br. Domínio público sem Cloudflare Access por pedido explícito; previews continuam protegidos. Rewrite de borda leva /admin e /admin/ a /foundation.html. Raiz ainda usa aplicação administrativa antiga até publicar a versão pública. Rede corporativa bloqueia o domínio; confirmação remota continua pendente. Preservar bindings, segredos, namespaces e dados humanos.

## Próximo passo na retomada

1. Conferir cota, estado real de Git/PR/CI e revisão da PR49; integrar por merge commit somente com CI atual e conversas resolvidas, sem bypass. Conferir CI do SHA integrado.
2. Atualizar a mesma PR50 por merge explícito de origin/main após49, resolvendo raiz para /publico.html e preservando aliases /admin e /admin/. Validar composição e CI atual, integrar e conferir CI do SHA integrado.
3. Publicar bundle validado com domínio/origem canônicos dentro da autorização já dada. Registrar versão/deployment e limites da validação remota. Pausar heartbeat ao concluir.

Mudanças alheias preservadas no checkout principal `sync/trabalho-casa`: CONTRIBUTING.md modificado, .agents/skills/web-design-guidelines/ e skills-lock.json não rastreados. Não sobrescrever. Outros worktrees e trabalho do outro agente da PR49 preservados. Espaço C: baixo; usar Y:/Codex-Temp/pr49-liberacao-20261103 para temporários, sem instalar dependências adicionais em C:.
