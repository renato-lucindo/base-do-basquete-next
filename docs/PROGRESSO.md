# Progresso atual

## Campeonato flexível — 07/11/2026

Unidade **codex/campeonato-flexivel**, base `903dc9cb2ab17db8fd892bf9eea3593e906ab34a` (PR74). Worktree: `C:/Users/12405304716/.codex/worktrees/classificacao-ultimos-cinco/Base do Basquete-v1`. Implementação local em verificação; primeiro commit e PR ainda pendentes neste checkpoint. Não há CI desta unidade nem serviço novo publicado comprovados.

Autorização vigente: implementar o [plano](PLAN-CAMPEONATO-FLEXIVEL.md), migrations e etapas necessárias ao **Worker isolado**. **Manter a mesma PR aberta, sem merge/fechamento antes do aceite humano do preview.** Não alterar o Worker principal ou UIUX existente; não testar publicação com dados reais nem executar seeds de Auth/admin remotos.

Implementado: configuração com padrão FIBA, grupos, vagas diretas/extras, séries por fase, seleção manual e estrutura livre; rascunho privado; comandos próprios de configuração/finalização e correção; classificação por resultados confirmados; associação opcional no cadastro de jogo. Feature `FLEXIBLE_COMPETITION` desativada na configuração principal, ativada somente no novo Worker. [Decisão e isolamento](decisoes/022-campeonato-flexivel.md).

Provas focais reais: domínio/regulação e contratos **176 PASS/29 arquivos**; configuração desktop/mobile + PDF + finalização/correção de súmula **14 PASS/2 SKIP** (súmula mobile permanece fora do escopo vigente). Axe nas capturas de configuração em1366/1920/mobile sem violações; tipos, formato e segredos PASS antes dos últimos refinamentos. **npm run gate PASS**:775testes/163arquivos,15contratos SQL,35casos Worker,11transportes, runtime PDF, builds, tipos, lint, formato, fronteira e segredos. Log ignorado `.preview-artifacts/flexible-gate.log`. Associação no cadastro:4PASS desktop/mobile, com falha e repetição sem duplicar jogo; código de produto do gate permanece idêntico. Uma execução sobreposta de Playwright causou encerramento do servidor; repetição isolada do conjunto acima passou. Provisionamento PGlite foi movido para hook compartilhado com rollback por caso; sem ampliar timeout de operações de produto.

Migration nova `20261107174500_flexible_competition_setup.sql` **ainda não aplicada remotamente**. Supabase observado: somente `base-do-basquete-next-dev` (`nizmasjddyrhmevvfviz`), sem branches. Tentativa de criação de branch recusada pelo plano Free, sem recurso/cobrança criado. Decisão: Worker/sessões/segredo/rate limit próprios, banco dev compartilhado com migration aditiva e comandos separados; testes fictícios de escrita ficam locais. Documentar essa limitação no preview. Migrações anteriores aplicadas são imutáveis.

Próximos passos: concluir revisão focal e gate/regressão; publicar a mesma branch em uma PRdraft; conferir CI real; revisar/aplicar migration autorizada, conferir privilégios e leitura; preparar build novo, Access restrito ao responsável e deploy no Worker próprio; smoke de assets/fonte e privacidade; entregar URL mantendo PR aberta. Não pedir novamente autorização já concedida. Cota real mais recente:64% usado5h/76% semanal, reset5h Unix1794101090; gatilho continua15% restante, sem créditos/resets manuais. Automação `retomar-regulamento-fiba` segue pausada; somente retomar se houver pausa por cota segundo CONTRIBUTING.

## Preservação

Checkout principal `sync/trabalho-casa`: CONTRIBUTING.md humano, skills locais e skills-lock preservados. Branch anterior `codex/colunas-sumula-mobile`/checkpoint local `12ca471` preservados. Último serviço UIUX observado por leitura mantém sessões/segredos/rate limit próprios e banco dev; nenhum deploy desta unidade. Resumo anterior preservado no [histórico](../historico/progresso/2026-11-07-antes-campeonato-flexivel.md); o estado de PR73 naquele texto é histórico, não evidência atual.
