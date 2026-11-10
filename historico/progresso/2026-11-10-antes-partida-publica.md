# Progresso atual

## Colunas de jogadores por fonte — 07/11/2026

Unidade `codex/colunas-sumula-mobile`, base `7e29bbeaafcffdc6adc9d18903ea31eb0d828526`, material **f7bd7764a91df7c3b4530b8b493c0480a3c0d4ea**. Worktree isolado reutilizado: `C:/Users/12405304716/.codex/worktrees/classificacao-ultimos-cinco/Base do Basquete-v1`. A branch anterior `codex/regulamento-fiba`, incluindo o checkpoint local `abab585`, foi preservada; nenhuma mudança alheia descartada.

Relato: seletor mobile mostra32de33 em campeonato somente de súmula, quando deveria oferecer13. Causa confirmada: padrão mobile `all` em `location()` + união das preferências com as métricas de súmula no seletor. Isso incluía métricas exclusivas de boxscore (MIN, assistências etc.). API real da disputa `b5433b13-a8f9-4baa-b4d9-08066ebf3e96` consultada somente para leitura: HTTP200, `hasBoxscore:false`,102registros e32colunas na solicitação `preset=all`, coincidindo com a imagem.

Correção somente de apresentação: quando `hasBoxscore:false`, limitar opções, seleção e colunas renderizadas às12métricas de súmula + Equipe (13opções). URL/preferência antiga não reintroduz métricas incompatíveis; seleção válida, inclusive vazia, permanece. Preferência original não é apagada ao consultar súmula; boxscore mantém opções completas. Projeção memoizada preserva a estabilidade dos efeitos de foco. Sem alteração de cálculos, contratos, API ou banco.

## Verificação

RED:5falhas reproduzidas entre6casos de súmula, cobrindo390/1366px e padrão/sessão/URL; desktop sem preferência já passava. GREEN focal: **32PASS** na suíte de refinamento desktop/mobile, incluindo opções13, seleção Todas, seleção válida/vazia e boxscore33. Tipos PASS. **npm run gate:ui PASS** (lint, formato, tipos, builds, fronteira e segredos). Logs ignorados `.preview-artifacts/sumula-columns-{red,workflow,gate-ui}.log`.

Consumidores mapeados: **176PASS,10SKIP existentes/186casos**, log `.preview-artifacts/sumula-columns-consumers.log`. [CI 5f156a9](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/42385368095) **SUCCESS** em checks, Chromium, WebKit e validate; design dispensado pela política de UI. [PR #73](https://github.com/renato-lucindo/base-do-basquete-next/pull/73) aberta/ready, sem comentários de revisão na última consulta. Captura mobile conferida com13opções. Fonte de revisão de UI: Web Interface Guidelines atualizadas consultadas; nenhuma marcação/controle novo ou achado nas linhas alteradas. Axe e capturas nos cenários existentes; não constituem certificação WCAG ou aceite humano.

Em07/11/2026 o responsável respondeu **“autorizo”** à integração da PR #73 e publicação no preview UIUX. Próximo passo: enviar este checkpoint documental na mesma branch, conferir os checks reais, integrar por merge commit, esperar a CI do SHA integrado e publicar no Worker UIUX preservando bindings, sessões, segredos e Access. Nenhuma autorização adicional é necessária para essas operações desta unidade. O código permanece idêntico ao material já validado; provas locais são reutilizadas. Sem mudanças de banco ou publicação de dados reais. Estado operacional final e provas detalhadas serão registrados na descrição da PR, sem abrir outra PR da unidade.

## Entrega anterior e preservação

PR #72 concluída: merge `7e29bbe`, CI integrada [42347340905](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/42347340905) SUCCESS. Último preview UIUX comprovado nesta conversa: deployment `22e8f66b-5e26-4d54-b432-f5849283a181`, versão `06caa417-ced0-4ca5-99ec-fc737b2e47a7`, código de produto equivalente à main. Automação `retomar-regulamento-fiba` pausada após o fechamento. Não reativar para esta unidade por conveniência; respeitar procedimento de cota se necessário.

Migrations FIBA `20261107055635`/`20261107055642` já aplicadas: não repetir/alterar. Principal e dados humanos preservados. Checkout principal continua `sync/trabalho-casa`, com alteração humana em CONTRIBUTING.md, skills locais e skills-lock preservados. Contexto anterior no [histórico](../historico/progresso/2026-11-07-antes-colunas-sumula.md); fechamento operacional na descrição da [PR #72](https://github.com/renato-lucindo/base-do-basquete-next/pull/72).
